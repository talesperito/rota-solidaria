-- ============================================================
-- 014_need_progress_and_capacity_tracking.sql
-- Rota Solidaria - Track need commitment/progress with validated deliveries
-- Run after 013_donations_require_matching_category.sql
-- ============================================================

ALTER TABLE public.needs
  ADD COLUMN IF NOT EXISTS quantity_received INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  ADD COLUMN IF NOT EXISTS quantity_remaining INTEGER NOT NULL DEFAULT 0 CHECK (quantity_remaining >= 0),
  ADD COLUMN IF NOT EXISTS quantity_committed INTEGER NOT NULL DEFAULT 0 CHECK (quantity_committed >= 0),
  ADD COLUMN IF NOT EXISTS quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0);

DROP TRIGGER IF EXISTS trg_validate_donation_need_limits ON public.donations;
DROP TRIGGER IF EXISTS trg_sync_need_status_on_donation_change_write ON public.donations;
DROP TRIGGER IF EXISTS trg_sync_need_status_on_donation_change_delete ON public.donations;
DROP TRIGGER IF EXISTS trg_sync_need_metrics_from_donation ON public.donations;
DROP TRIGGER IF EXISTS trg_sync_need_metrics_from_delivery ON public.deliveries;
DROP TRIGGER IF EXISTS trg_refresh_need_metrics_on_need_update ON public.needs;

CREATE OR REPLACE FUNCTION public.validate_donation_need_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _need_project UUID;
  _need_status public.need_status;
  _need_category TEXT;
  _need_total INTEGER;
  _committed_without_current INTEGER;
  _new_committed_total INTEGER;
BEGIN
  IF NEW.need_id IS NULL THEN
    RAISE EXCEPTION 'Toda doacao precisa estar vinculada a uma demanda ativa.';
  END IF;

  SELECT n.project_id, n.status, n.category, n.quantity_needed
    INTO _need_project, _need_status, _need_category, _need_total
  FROM public.needs n
  WHERE n.id = NEW.need_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda nao encontrada.';
  END IF;

  IF _need_project <> NEW.project_id THEN
    RAISE EXCEPTION 'A demanda deve pertencer ao mesmo projeto da doacao.';
  END IF;

  IF NEW.status <> 'cancelled'::public.donation_status
     AND _need_status NOT IN ('open'::public.need_status, 'in_progress'::public.need_status) THEN
    RAISE EXCEPTION 'A demanda selecionada nao esta ativa.';
  END IF;

  IF COALESCE(lower(trim(NEW.category)), '') <> COALESCE(lower(trim(_need_category)), '') THEN
    RAISE EXCEPTION 'Categoria da doacao deve corresponder a categoria da demanda.';
  END IF;

  SELECT COALESCE(SUM(d.quantity), 0)
    INTO _committed_without_current
  FROM public.donations d
  WHERE d.need_id = NEW.need_id
    AND d.status <> 'cancelled'::public.donation_status
    AND (TG_OP = 'INSERT' OR d.id <> OLD.id);

  _new_committed_total :=
    _committed_without_current
    + CASE WHEN NEW.status <> 'cancelled'::public.donation_status THEN NEW.quantity ELSE 0 END;

  IF _new_committed_total > _need_total THEN
    RAISE EXCEPTION 'Quantidade excede o saldo disponivel da demanda.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_donation_need_limits
  BEFORE INSERT OR UPDATE OF need_id, quantity, project_id, status, category ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.validate_donation_need_limits();

CREATE OR REPLACE FUNCTION public.refresh_need_metrics(_need_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _quantity_needed INTEGER;
  _current_status public.need_status;
  _quantity_committed INTEGER;
  _quantity_received INTEGER;
  _quantity_available INTEGER;
  _quantity_remaining INTEGER;
  _derived_status public.need_status;
BEGIN
  SELECT quantity_needed, status
    INTO _quantity_needed, _current_status
  FROM public.needs
  WHERE id = _need_id;

  IF _quantity_needed IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(d.quantity), 0)
    INTO _quantity_committed
  FROM public.donations d
  WHERE d.need_id = _need_id
    AND d.status <> 'cancelled'::public.donation_status;

  SELECT COALESCE(SUM(d.quantity), 0)
    INTO _quantity_received
  FROM public.deliveries dl
  JOIN public.donations d ON d.id = dl.donation_id
  WHERE d.need_id = _need_id
    AND dl.status = 'validated'::public.delivery_status;

  _quantity_available := GREATEST(_quantity_needed - _quantity_committed, 0);
  _quantity_remaining := GREATEST(_quantity_needed - _quantity_received, 0);

  _derived_status := CASE
    WHEN _current_status = 'cancelled'::public.need_status THEN 'cancelled'::public.need_status
    WHEN _quantity_remaining = 0 THEN 'fulfilled'::public.need_status
    WHEN _quantity_committed > 0 OR _quantity_received > 0 THEN 'in_progress'::public.need_status
    ELSE 'open'::public.need_status
  END;

  UPDATE public.needs
  SET
    quantity_committed = _quantity_committed,
    quantity_available = _quantity_available,
    quantity_received = _quantity_received,
    quantity_remaining = _quantity_remaining,
    status = _derived_status
  WHERE id = _need_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_need_metrics_from_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_need_metrics(OLD.need_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.need_id IS DISTINCT FROM NEW.need_id THEN
    PERFORM public.refresh_need_metrics(OLD.need_id);
  END IF;

  PERFORM public.refresh_need_metrics(NEW.need_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_need_metrics_from_donation
  AFTER INSERT OR UPDATE OR DELETE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.sync_need_metrics_from_donation();

CREATE OR REPLACE FUNCTION public.sync_need_metrics_from_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_need_id UUID;
  _old_need_id UUID;
BEGIN
  IF TG_OP <> 'DELETE' THEN
    SELECT d.need_id
      INTO _new_need_id
    FROM public.donations d
    WHERE d.id = NEW.donation_id;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    SELECT d.need_id
      INTO _old_need_id
    FROM public.donations d
    WHERE d.id = OLD.donation_id;
  END IF;

  IF _new_need_id IS NOT NULL THEN
    PERFORM public.refresh_need_metrics(_new_need_id);
  END IF;

  IF _old_need_id IS NOT NULL AND _old_need_id <> _new_need_id THEN
    PERFORM public.refresh_need_metrics(_old_need_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_need_metrics_from_delivery
  AFTER INSERT OR UPDATE OR DELETE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.sync_need_metrics_from_delivery();

CREATE OR REPLACE FUNCTION public.refresh_need_metrics_on_need_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_need_metrics(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refresh_need_metrics_on_need_update
  AFTER UPDATE OF quantity_needed ON public.needs
  FOR EACH ROW EXECUTE FUNCTION public.refresh_need_metrics_on_need_update();

DO $$
DECLARE
  _need RECORD;
BEGIN
  FOR _need IN SELECT id FROM public.needs LOOP
    PERFORM public.refresh_need_metrics(_need.id);
  END LOOP;
END;
$$;

-- ============================================================
-- END OF 014_need_progress_and_capacity_tracking.sql
-- ============================================================
