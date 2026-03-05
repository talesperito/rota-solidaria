-- ============================================================
-- 011_donations_require_active_need.sql
-- Rota Solidária — Enforce donation -> active need relationship
-- Run in Supabase SQL Editor AFTER 010_volunteers_shifts.sql
-- ============================================================

-- Recreate insert policy so every new donation is linked to an
-- active need from the same project.
DROP POLICY IF EXISTS donations_insert ON public.donations;

CREATE POLICY donations_insert ON public.donations
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_master() OR public.is_project_member(project_id))
    AND donor_id = auth.uid()
    AND need_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.needs n
      WHERE n.id = donations.need_id
        AND n.project_id = donations.project_id
        AND n.status IN ('open'::public.need_status, 'in_progress'::public.need_status)
    )
  );

-- ============================================================
-- END OF 011_donations_require_active_need.sql
-- ============================================================
