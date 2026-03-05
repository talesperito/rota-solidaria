-- ============================================================
-- 013_donations_require_matching_category.sql
-- Rota Solidária — Donation category must match need category
-- Run in Supabase SQL Editor AFTER 012_donations_need_status_and_quantity.sql
-- ============================================================

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

-- ============================================================
-- END OF 013_donations_require_matching_category.sql
-- ============================================================
