-- ============================================================
-- 013_enforce_need_capacity_and_sync.sql
-- Rota Solidaria - Prevent overbooking and keep need aggregates consistent
-- Run after 012_need_progress_tracking.sql
-- ============================================================

-- Track how much is already committed (offered/accepted/in_transit/delivered/validated)
-- and how much is still available for new donations (prevents overbooking).
ALTER TABLE public.needs
  ADD COLUMN IF NOT EXISTS quantity_committed INTEGER NOT NULL DEFAULT 0 CHECK (quantity_committed >= 0),
  ADD COLUMN IF NOT EXISTS quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0);

CREATE OR REPLACE FUNCTION public.refresh_need_commitment(_need_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _quantity_needed INTEGER;
  _quantity_committed INTEGER;
  _quantity_available INTEGER;
BEGIN
  SELECT quantity_needed
  INTO _quantity_needed
  FROM public.needs
  WHERE id = _need_id;

  IF _quantity_needed IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(d.quantity), 0)
  INTO _quantity_committed
  FROM public.donations d
  WHERE d.need_id = _need_id
    AND d.status <> 'cancelled';

  _quantity_available := GREATEST(_quantity_needed - _quantity_committed, 0);

  UPDATE public.needs
  SET
    quantity_committed = _quantity_committed,
    quantity_available = _quantity_available
  WHERE id = _need_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_need_commitment_from_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_need_id UUID;
  _old_need_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _old_need_id := OLD.need_id;
  ELSE
    _new_need_id := NEW.need_id;
    IF TG_OP = 'UPDATE' THEN
      _old_need_id := OLD.need_id;
    END IF;
  END IF;

  IF _new_need_id IS NOT NULL THEN
    PERFORM public.refresh_need_commitment(_new_need_id);
  END IF;

  IF _old_need_id IS NOT NULL AND _old_need_id <> _new_need_id THEN
    PERFORM public.refresh_need_commitment(_old_need_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_need_commitment_from_donation ON public.donations;

CREATE TRIGGER trg_sync_need_commitment_from_donation
  AFTER INSERT OR UPDATE OR DELETE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.sync_need_commitment_from_donation();

-- Robust capacity enforcement (handles concurrency).
CREATE OR REPLACE FUNCTION public.enforce_need_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _quantity_needed INTEGER;
  _committed_without_this INTEGER;
  _new_committed_total INTEGER;
BEGIN
  IF NEW.need_id IS NULL THEN
    RAISE EXCEPTION 'Doacao precisa estar vinculada a uma demanda.';
  END IF;

  -- Serialize concurrent inserts/updates for the same demand.
  SELECT quantity_needed
  INTO _quantity_needed
  FROM public.needs
  WHERE id = NEW.need_id
  FOR UPDATE;

  IF _quantity_needed IS NULL THEN
    RAISE EXCEPTION 'A demanda informada nao existe.';
  END IF;

  SELECT COALESCE(SUM(d.quantity), 0)
  INTO _committed_without_this
  FROM public.donations d
  WHERE d.need_id = NEW.need_id
    AND d.status <> 'cancelled'
    AND (
      TG_OP = 'INSERT'
      OR d.id <> OLD.id
    );

  _new_committed_total :=
    _committed_without_this
    + CASE WHEN NEW.status <> 'cancelled' THEN NEW.quantity ELSE 0 END;

  IF _new_committed_total > _quantity_needed THEN
    RAISE EXCEPTION 'Quantidade excede o saldo disponivel da demanda.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_need_capacity ON public.donations;

CREATE TRIGGER trg_enforce_need_capacity
  BEFORE INSERT OR UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_need_capacity();

-- Keep need progress consistent even when deliveries are deleted.
CREATE OR REPLACE FUNCTION public.sync_need_progress_from_delivery_any()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _need_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT need_id INTO _need_id FROM public.donations WHERE id = OLD.donation_id;
  ELSE
    SELECT need_id INTO _need_id FROM public.donations WHERE id = NEW.donation_id;
  END IF;

  IF _need_id IS NOT NULL THEN
    PERFORM public.refresh_need_progress(_need_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_need_progress_from_delivery ON public.deliveries;

CREATE TRIGGER trg_sync_need_progress_from_delivery
  AFTER INSERT OR UPDATE OR DELETE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.sync_need_progress_from_delivery_any();

-- Backfill aggregates for existing rows.
DO $$
DECLARE
  _need RECORD;
BEGIN
  FOR _need IN SELECT id FROM public.needs LOOP
    PERFORM public.refresh_need_commitment(_need.id);
  END LOOP;
END;
$$;

-- ============================================================
-- END OF 013_enforce_need_capacity_and_sync.sql
-- ============================================================
