-- Scope binder synchronization to the authenticated owner.
-- The legacy three-argument function trusted a caller-supplied user ID.
DROP FUNCTION IF EXISTS public.sync_binder_cards_atomic(uuid, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.sync_binder_cards_atomic(
  p_binder_id uuid,
  p_cards jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_cards IS NULL OR pg_catalog.jsonb_typeof(p_cards) <> 'array' THEN
    RAISE EXCEPTION 'Invalid cards payload';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.binders AS b
    WHERE b.id = p_binder_id
      AND b.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.binder_cards AS bc
  WHERE bc.binder_id = p_binder_id;

  INSERT INTO public.binder_cards (
    binder_id,
    card_id,
    quantity,
    price,
    price_currency,
    card_tag,
    sort_order
  )
  SELECT
    p_binder_id,
    card->>'card_id',
    COALESCE((card->>'quantity')::integer, 1),
    NULLIF(card->>'price', '')::numeric,
    COALESCE(NULLIF(card->>'price_currency', ''), 'ARS'),
    NULLIF(card->>'card_tag', '')::text,
    COALESCE((card->>'sort_order')::integer, 0)
  FROM pg_catalog.jsonb_array_elements(p_cards) AS cards(card);
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_binder_cards_atomic(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_binder_cards_atomic(uuid, jsonb) TO authenticated;
