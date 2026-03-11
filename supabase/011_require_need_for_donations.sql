-- ============================================================
-- 011_require_need_for_donations.sql
-- Rota Solidaria - Donations must reference an existing need
-- Run after 010_volunteers_shifts.sql
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.donations
    WHERE need_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Existem doacoes sem demanda vinculada. Corrija os registros antes de aplicar a migration 011.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_donation_need_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _need_project_id UUID;
BEGIN
  SELECT project_id
  INTO _need_project_id
  FROM public.needs
  WHERE id = NEW.need_id;

  IF _need_project_id IS NULL THEN
    RAISE EXCEPTION 'A demanda informada nao existe.';
  END IF;

  IF _need_project_id <> NEW.project_id THEN
    RAISE EXCEPTION 'A demanda informada nao pertence ao projeto da doacao.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_donation_need_project ON public.donations;

CREATE TRIGGER trg_validate_donation_need_project
  BEFORE INSERT OR UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.validate_donation_need_project();

ALTER TABLE public.donations
  ALTER COLUMN need_id SET NOT NULL;

-- ============================================================
-- END OF 011_require_need_for_donations.sql
-- ============================================================
