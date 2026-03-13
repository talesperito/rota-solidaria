-- ============================================================
-- 012_donations_need_status_and_quantity.sql
-- Rota Solidária — Enforce need quantity limits + auto-sync need status
-- Run in Supabase SQL Editor AFTER 011_donations_require_active_need.sql
-- ============================================================

-- Recreate trigger/functions safely for existing environments.
DROP TRIGGER IF EXISTS trg_validate_donation_need_limits ON public.donations;
DROP TRIGGER IF EXISTS trg_sync_need_status_on_donation_change ON public.donations;
DROP TRIGGER IF EXISTS trg_sync_need_status_on_donation_change_write ON public.donations;
DROP TRIGGER IF EXISTS trg_sync_need_status_on_donation_change_delete ON public.donations;

DROP FUNCTION IF EXISTS public.sync_need_status_on_donation_change();
DROP FUNCTION IF EXISTS public.validate_donation_need_limits();
DROP FUNCTION IF EXISTS public.recalculate_need_status_from_donations(UUID);

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
  _already_allocated INTEGER;
  _remaining INTEGER;
BEGIN
  IF NEW.need_id IS NULL THEN
    RAISE EXCEPTION 'Toda doação precisa estar vinculada a uma demanda ativa.';
  END IF;

  SELECT n.project_id, n.status, n.category, n.quantity_needed
    INTO _need_project, _need_status, _need_category, _need_total
  FROM public.needs n
  WHERE n.id = NEW.need_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada.';
  END IF;

  IF _need_project <> NEW.project_id THEN
    RAISE EXCEPTION 'A demanda deve pertencer ao mesmo projeto da doação.';
  END IF;

  IF _need_status NOT IN ('open'::public.need_status, 'in_progress'::public.need_status) THEN
    RAISE EXCEPTION 'A demanda selecionada não está ativa.';
  END IF;

  IF COALESCE(lower(trim(NEW.category)), '') <> COALESCE(lower(trim(_need_category)), '') THEN
    RAISE EXCEPTION 'Categoria da doação deve corresponder à categoria da demanda.';
  END IF;

  SELECT COALESCE(SUM(d.quantity), 0)
    INTO _already_allocated
  FROM public.donations d
  WHERE d.need_id = NEW.need_id
    AND d.status <> 'cancelled'
    AND (TG_OP = 'INSERT' OR d.id <> NEW.id);

  _remaining := _need_total - _already_allocated;

  IF _remaining <= 0 THEN
    RAISE EXCEPTION 'A demanda selecionada já está totalmente coberta.';
  END IF;

  IF NEW.quantity > _remaining THEN
    RAISE EXCEPTION 'Quantidade excede o restante da demanda. Restam % unidades.', _remaining;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_donation_need_limits
  BEFORE INSERT OR UPDATE OF need_id, quantity, project_id ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.validate_donation_need_limits();

CREATE OR REPLACE FUNCTION public.recalculate_need_status_from_donations(_need_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next_status public.need_status;
BEGIN
  IF _need_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    CASE
      WHEN n.status = 'cancelled' THEN 'cancelled'::public.need_status
      WHEN COALESCE((
        SELECT SUM(d.quantity)
        FROM public.donations d
        WHERE d.need_id = n.id
          AND d.status = 'delivered'
      ), 0) >= n.quantity_needed THEN 'fulfilled'::public.need_status
      WHEN COALESCE((
        SELECT SUM(d.quantity)
        FROM public.donations d
        WHERE d.need_id = n.id
          AND d.status <> 'cancelled'
      ), 0) > 0 THEN 'in_progress'::public.need_status
      ELSE 'open'::public.need_status
    END
    INTO _next_status
  FROM public.needs n
  WHERE n.id = _need_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.needs
  SET status = _next_status
  WHERE id = _need_id
    AND status <> _next_status
    AND status <> 'cancelled'::public.need_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_need_status_on_donation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_need_status_from_donations(OLD.need_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.need_id IS DISTINCT FROM NEW.need_id THEN
    PERFORM public.recalculate_need_status_from_donations(OLD.need_id);
  END IF;

  PERFORM public.recalculate_need_status_from_donations(NEW.need_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_need_status_on_donation_change_write
  AFTER INSERT OR UPDATE OF status, quantity, need_id ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.sync_need_status_on_donation_change();

CREATE TRIGGER trg_sync_need_status_on_donation_change_delete
  AFTER DELETE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.sync_need_status_on_donation_change();

-- ============================================================
-- END OF 012_donations_need_status_and_quantity.sql
-- ============================================================
