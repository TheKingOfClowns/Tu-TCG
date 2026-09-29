-- Keep sale listings private when their synchronized inventory is empty.
-- This remains inside the existing atomic function so card replacement and
-- visibility changes either commit together or roll back together.
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

  UPDATE public.binders AS b
  SET
    is_public = false,
    updated_at = pg_catalog.now()
  WHERE b.id = p_binder_id
    AND b.type = 'sale'
    AND b.is_public = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.binder_cards AS bc
      WHERE bc.binder_id = p_binder_id
        AND bc.quantity > 0
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_binder_cards_atomic(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_binder_cards_atomic(uuid, jsonb) TO authenticated;

-- Purchases update binder_cards directly, so cover every stock-changing path.
-- Deferring the check until the end of the transaction avoids briefly treating
-- the delete-then-insert card replacement above as an empty inventory.
CREATE OR REPLACE FUNCTION tutcg_private.unpublish_empty_sale_binder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_binder_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_binder_id := OLD.binder_id;
  ELSE
    v_binder_id := NEW.binder_id;
  END IF;

  UPDATE public.binders AS b
  SET
    is_public = false,
    updated_at = pg_catalog.now()
  WHERE b.id = v_binder_id
    AND b.type = 'sale'
    AND b.is_public = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.binder_cards AS bc
      WHERE bc.binder_id = v_binder_id
        AND bc.quantity > 0
    );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

REVOKE ALL ON FUNCTION tutcg_private.unpublish_empty_sale_binder() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS unpublish_empty_sale_binder_after_stock_change
ON public.binder_cards;

CREATE CONSTRAINT TRIGGER unpublish_empty_sale_binder_after_stock_change
AFTER INSERT OR UPDATE OR DELETE
ON public.binder_cards
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION tutcg_private.unpublish_empty_sale_binder();
