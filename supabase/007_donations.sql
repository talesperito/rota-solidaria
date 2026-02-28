-- ============================================================
-- 007_donations.sql
-- Rota Solidária — Donations (Doações)
-- Run in Supabase SQL Editor BEFORE testing
-- ============================================================

-- 1. ENUM
CREATE TYPE public.donation_status AS ENUM (
  'offered',      -- doador ofereceu
  'accepted',     -- gestor aceitou
  'in_transit',   -- em transporte
  'delivered',    -- entregue no hub
  'cancelled'     -- cancelada
);

-- 2. Table
CREATE TABLE public.donations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  need_id          UUID REFERENCES public.needs(id) ON DELETE SET NULL,
  hub_id           UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  donor_id         UUID NOT NULL REFERENCES public.user_profiles(id),
  category         TEXT NOT NULL,
  item_description TEXT NOT NULL CHECK (char_length(item_description) >= 2),
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  unit             TEXT NOT NULL DEFAULT 'unidades',
  approx_weight    NUMERIC,
  donor_lat        DOUBLE PRECISION,
  donor_lng        DOUBLE PRECISION,
  status           public.donation_status NOT NULL DEFAULT 'offered',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.donations IS
  'Doações oferecidas por membros do projeto. Cadeia de custódia rastreável.';

CREATE TRIGGER set_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Indexes
CREATE INDEX idx_donations_project ON public.donations(project_id);
CREATE INDEX idx_donations_donor ON public.donations(donor_id);
CREATE INDEX idx_donations_status ON public.donations(project_id, status);

-- 4. RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- 4.1 SELECT:
--   master: all
--   manager: all in project
--   donor: own in project
--   logistics_volunteer: offered/accepted/in_transit in project
CREATE POLICY donations_select ON public.donations
  FOR SELECT TO authenticated
  USING (
    public.is_master()
    OR public.is_project_manager(project_id)
    OR (public.is_project_member(project_id) AND donor_id = auth.uid())
    OR (
      status IN ('offered', 'accepted', 'in_transit')
      AND EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = donations.project_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'logistics_volunteer'
      )
    )
  );

-- 4.2 INSERT: any project member can donate (donor_id must be self)
CREATE POLICY donations_insert ON public.donations
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_master() OR public.is_project_member(project_id))
    AND donor_id = auth.uid()
  );

-- 4.3 UPDATE: manager/master can update (status changes etc.)
CREATE POLICY donations_update_manager ON public.donations
  FOR UPDATE TO authenticated
  USING (
    public.is_master()
    OR public.is_project_manager(project_id)
  )
  WITH CHECK (
    public.is_master()
    OR public.is_project_manager(project_id)
  );

-- 4.4 DELETE: manager/master only
CREATE POLICY donations_delete_manager ON public.donations
  FOR DELETE TO authenticated
  USING (
    public.is_master()
    OR public.is_project_manager(project_id)
  );

-- 5. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
REVOKE ALL ON public.donations FROM anon;

-- 6. Audit
CREATE TRIGGER audit_donations
  AFTER INSERT OR UPDATE OR DELETE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- END OF 007_donations.sql
-- ============================================================
