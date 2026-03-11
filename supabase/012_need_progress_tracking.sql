-- ============================================================
-- 012_need_progress_tracking.sql
-- Rota Solidaria - Track received and remaining quantities for needs
-- Run after 011_require_need_for_donations.sql
-- ============================================================

ALTER TABLE public.needs
  ADD COLUMN IF NOT EXISTS quantity_received INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  ADD COLUMN IF NOT EXISTS quantity_remaining INTEGER NOT NULL DEFAULT 0 CHECK (quantity_remaining >= 0);

UPDATE public.needs
SET
  quantity_received = COALESCE(quantity_received, 0),
  quantity_remaining = quantity_needed
WHERE quantity_remaining = 0;

CREATE OR REPLACE FUNCTION public.refresh_need_progress(_need_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _quantity_needed INTEGER;
  _quantity_received INTEGER;
  _quantity_remaining INTEGER;
BEGIN
  SELECT quantity_needed
  INTO _quantity_needed
  FROM public.needs
  WHERE id = _need_id;

  IF _quantity_needed IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(d.quantity), 0)
  INTO _quantity_received
  FROM public.deliveries dl
  JOIN public.donations d ON d.id = dl.donation_id
  WHERE d.need_id = _need_id
    AND dl.status = 'validated';

  _quantity_remaining := GREATEST(_quantity_needed - _quantity_received, 0);

  UPDATE public.needs
  SET
    quantity_received = _quantity_received,
    quantity_remaining = _quantity_remaining,
    status = CASE
      WHEN status = 'cancelled' THEN status
      WHEN _quantity_remaining = 0 THEN 'fulfilled'::public.need_status
      WHEN _quantity_received > 0 THEN 'in_progress'::public.need_status
      ELSE 'open'::public.need_status
    END
  WHERE id = _need_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_need_progress_from_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_need_id UUID;
  _old_need_id UUID;
BEGIN
  SELECT need_id INTO _new_need_id
  FROM public.donations
  WHERE id = NEW.donation_id;

  IF TG_OP = 'UPDATE' THEN
    SELECT need_id INTO _old_need_id
    FROM public.donations
    WHERE id = OLD.donation_id;
  END IF;

  IF _new_need_id IS NOT NULL THEN
    PERFORM public.refresh_need_progress(_new_need_id);
  END IF;

  IF _old_need_id IS NOT NULL AND _old_need_id <> _new_need_id THEN
    PERFORM public.refresh_need_progress(_old_need_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_need_progress_from_delivery ON public.deliveries;

CREATE TRIGGER trg_sync_need_progress_from_delivery
  AFTER INSERT OR UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.sync_need_progress_from_delivery();

DO $$
DECLARE
  _need RECORD;
BEGIN
  FOR _need IN SELECT id FROM public.needs LOOP
    PERFORM public.refresh_need_progress(_need.id);
  END LOOP;
END;
$$;

-- ============================================================
-- END OF 012_need_progress_tracking.sql
-- ============================================================
