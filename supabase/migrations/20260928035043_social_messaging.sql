-- TuTCG social MVP: friendships, blocking, direct conversations and messages.
-- All public tables are explicitly granted and protected with RLS because new
-- Supabase projects may not expose newly-created tables automatically.

CREATE TABLE public.social_friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_friendships_distinct_users CHECK (user_a <> user_b),
  CONSTRAINT social_friendships_canonical_pair CHECK (user_a::text < user_b::text),
  CONSTRAINT social_friendships_requester_in_pair CHECK (requested_by IN (user_a, user_b)),
  CONSTRAINT social_friendships_status CHECK (status IN ('pending', 'accepted')),
  CONSTRAINT social_friendships_unique_pair UNIQUE (user_a, user_b)
);

CREATE TABLE public.social_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT social_blocks_distinct_users CHECK (blocker_id <> blocked_id)
);

CREATE TABLE public.social_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_conversations_distinct_users CHECK (user_a <> user_b),
  CONSTRAINT social_conversations_canonical_pair CHECK (user_a::text < user_b::text),
  CONSTRAINT social_conversations_unique_pair UNIQUE (user_a, user_b),
  CONSTRAINT social_conversations_preview_length CHECK (
    last_message_preview IS NULL OR char_length(last_message_preview) <= 160
  )
);

CREATE TABLE public.social_conversation_reads (
  conversation_id uuid NOT NULL REFERENCES public.social_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.social_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.social_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_messages_body_length CHECK (
    char_length(btrim(body)) BETWEEN 1 AND 1000
  )
);

CREATE INDEX social_friendships_user_a_idx
  ON public.social_friendships (user_a, status, updated_at DESC);
CREATE INDEX social_friendships_user_b_idx
  ON public.social_friendships (user_b, status, updated_at DESC);
CREATE INDEX social_blocks_blocked_idx
  ON public.social_blocks (blocked_id, blocker_id);
CREATE INDEX social_conversations_user_a_idx
  ON public.social_conversations (user_a, last_message_at DESC NULLS LAST);
CREATE INDEX social_conversations_user_b_idx
  ON public.social_conversations (user_b, last_message_at DESC NULLS LAST);
CREATE INDEX social_messages_conversation_idx
  ON public.social_messages (conversation_id, created_at DESC, id DESC);

ALTER TABLE public.social_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_conversation_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.social_friendships TO authenticated;
GRANT UPDATE (status, updated_at) ON public.social_friendships TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.social_blocks TO authenticated;
GRANT SELECT, INSERT ON public.social_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE (last_read_at) ON public.social_conversation_reads TO authenticated;
GRANT SELECT, INSERT ON public.social_messages TO authenticated;

CREATE POLICY "friendship participants can read"
ON public.social_friendships
FOR SELECT TO authenticated
USING ((select auth.uid()) IN (user_a, user_b));

CREATE POLICY "users can request friendship"
ON public.social_friendships
FOR INSERT TO authenticated
WITH CHECK (
  status = 'pending'
  AND requested_by = (select auth.uid())
  AND (select auth.uid()) IN (user_a, user_b)
  AND user_a::text < user_b::text
  AND NOT EXISTS (
    SELECT 1
    FROM public.social_blocks AS b
    WHERE (b.blocker_id = user_a AND b.blocked_id = user_b)
       OR (b.blocker_id = user_b AND b.blocked_id = user_a)
  )
);

CREATE POLICY "recipients can accept friendship"
ON public.social_friendships
FOR UPDATE TO authenticated
USING (
  status = 'pending'
  AND requested_by <> (select auth.uid())
  AND (select auth.uid()) IN (user_a, user_b)
)
WITH CHECK (
  status = 'accepted'
  AND requested_by <> (select auth.uid())
  AND (select auth.uid()) IN (user_a, user_b)
);

CREATE POLICY "participants can remove friendship"
ON public.social_friendships
FOR DELETE TO authenticated
USING ((select auth.uid()) IN (user_a, user_b));

CREATE POLICY "block participants can read"
ON public.social_blocks
FOR SELECT TO authenticated
USING ((select auth.uid()) IN (blocker_id, blocked_id));

CREATE POLICY "users can block"
ON public.social_blocks
FOR INSERT TO authenticated
WITH CHECK (blocker_id = (select auth.uid()));

CREATE POLICY "users can unblock"
ON public.social_blocks
FOR DELETE TO authenticated
USING (blocker_id = (select auth.uid()));

CREATE POLICY "conversation participants can read"
ON public.social_conversations
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IN (user_a, user_b)
  AND NOT EXISTS (
    SELECT 1
    FROM public.social_blocks AS b
    WHERE (b.blocker_id = user_a AND b.blocked_id = user_b)
       OR (b.blocker_id = user_b AND b.blocked_id = user_a)
  )
);

CREATE POLICY "friends can create direct conversations"
ON public.social_conversations
FOR INSERT TO authenticated
WITH CHECK (
  (select auth.uid()) IN (user_a, user_b)
  AND user_a::text < user_b::text
  AND EXISTS (
    SELECT 1
    FROM public.social_friendships AS f
    WHERE f.user_a = social_conversations.user_a
      AND f.user_b = social_conversations.user_b
      AND f.status = 'accepted'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.social_blocks AS b
    WHERE (b.blocker_id = user_a AND b.blocked_id = user_b)
       OR (b.blocker_id = user_b AND b.blocked_id = user_a)
  )
);

CREATE POLICY "users can read own conversation state"
ON public.social_conversation_reads
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

CREATE POLICY "participants can create own conversation state"
ON public.social_conversation_reads
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.social_conversations AS c
    WHERE c.id = conversation_id
      AND (select auth.uid()) IN (c.user_a, c.user_b)
  )
);

CREATE POLICY "participants can update own conversation state"
ON public.social_conversation_reads
FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.social_conversations AS c
    WHERE c.id = conversation_id
      AND (select auth.uid()) IN (c.user_a, c.user_b)
  )
);

CREATE POLICY "conversation participants can read messages"
ON public.social_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.social_conversations AS c
    WHERE c.id = conversation_id
      AND (select auth.uid()) IN (c.user_a, c.user_b)
      AND NOT EXISTS (
        SELECT 1
        FROM public.social_blocks AS b
        WHERE (b.blocker_id = c.user_a AND b.blocked_id = c.user_b)
           OR (b.blocker_id = c.user_b AND b.blocked_id = c.user_a)
      )
  )
);

CREATE POLICY "friends can send messages"
ON public.social_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.social_conversations AS c
    JOIN public.social_friendships AS f
      ON f.user_a = c.user_a
     AND f.user_b = c.user_b
     AND f.status = 'accepted'
    WHERE c.id = conversation_id
      AND (select auth.uid()) IN (c.user_a, c.user_b)
      AND NOT EXISTS (
        SELECT 1
        FROM public.social_blocks AS b
        WHERE (b.blocker_id = c.user_a AND b.blocked_id = c.user_b)
           OR (b.blocker_id = c.user_b AND b.blocked_id = c.user_a)
      )
  )
);

-- Trigger-only routines live outside exposed schemas. They run as the owner so
-- an authenticated message insert can update its conversation summary and emit
-- a private Realtime broadcast without granting clients UPDATE privileges.
CREATE SCHEMA IF NOT EXISTS tutcg_private;
REVOKE ALL ON SCHEMA tutcg_private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION tutcg_private.social_message_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.social_conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = left(btrim(NEW.body), 160),
      last_message_sender_id = NEW.sender_id,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  PERFORM realtime.broadcast_changes(
    'conversation:' || NEW.conversation_id::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION tutcg_private.social_message_after_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER social_message_after_insert
AFTER INSERT ON public.social_messages
FOR EACH ROW
EXECUTE FUNCTION tutcg_private.social_message_after_insert();

CREATE OR REPLACE FUNCTION tutcg_private.social_block_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.social_friendships
  WHERE user_a = CASE WHEN NEW.blocker_id::text < NEW.blocked_id::text THEN NEW.blocker_id ELSE NEW.blocked_id END
    AND user_b = CASE WHEN NEW.blocker_id::text < NEW.blocked_id::text THEN NEW.blocked_id ELSE NEW.blocker_id END;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION tutcg_private.social_block_after_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER social_block_after_insert
AFTER INSERT ON public.social_blocks
FOR EACH ROW
EXECUTE FUNCTION tutcg_private.social_block_after_insert();

-- Realtime owns this table and already has RLS enabled. Current Supabase
-- versions allow policies here but reject ALTER TABLE on the realtime schema.
CREATE POLICY "conversation participants receive social broadcasts"
ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND EXISTS (
    SELECT 1
    FROM public.social_conversations AS c
    WHERE (select realtime.topic()) = 'conversation:' || c.id::text
      AND (select auth.uid()) IN (c.user_a, c.user_b)
      AND NOT EXISTS (
        SELECT 1
        FROM public.social_blocks AS b
        WHERE (b.blocker_id = c.user_a AND b.blocked_id = c.user_b)
           OR (b.blocker_id = c.user_b AND b.blocked_id = c.user_a)
      )
  )
);
