-- ============================================================
-- 005_hubs.sql
-- Rota Solidária — Hubs (Pontos de Entrega)
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Hub status enum
CREATE TYPE public.hub_status AS ENUM ('active', 'inactive');

-- 2. Hubs table
CREATE TABLE public.hubs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (char_length(name) >= 2),
  address         TEXT NOT NULL,
  gps_lat         DOUBLE PRECISION,
  gps_lng         DOUBLE PRECISION,
  capacity        TEXT,
  opening_hours   TEXT,
  responsible_id  UUID REFERENCES public.user_profiles(id),
  status          public.hub_status NOT NULL DEFAULT 'active',
  created_by      UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hubs IS
  'Pontos de entrega. Cadastrados por gestores do projeto.';

CREATE TRIGGER set_hubs_updated_at
  BEFORE UPDATE ON public.hubs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Indexes
CREATE INDEX idx_hubs_project ON public.hubs(project_id);
CREATE INDEX idx_hubs_status ON public.hubs(project_id, status);

-- 4. RLS
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;

-- 4.1 SELECT: project members can read hubs of their project; master reads all
CREATE POLICY hubs_select_member ON public.hubs
  FOR SELECT TO authenticated
  USING (
    public.is_master()
    OR public.is_project_member(project_id)
  );

-- 4.2 INSERT: only master or project manager can create hubs
CREATE POLICY hubs_insert_manager ON public.hubs
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_master() OR public.is_project_manager(project_id))
    AND created_by = auth.uid()
  );

-- 4.3 UPDATE: only master or project manager can update hubs
CREATE POLICY hubs_update_manager ON public.hubs
  FOR UPDATE TO authenticated
  USING (
    public.is_master()
    OR public.is_project_manager(project_id)
  )
  WITH CHECK (
    public.is_master()
    OR public.is_project_manager(project_id)
  );

-- 4.4 DELETE: only master or project manager can delete hubs
CREATE POLICY hubs_delete_manager ON public.hubs
  FOR DELETE TO authenticated
  USING (
    public.is_master()
    OR public.is_project_manager(project_id)
  );

-- 5. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hubs TO authenticated;
REVOKE ALL ON public.hubs FROM anon;

-- 6. Audit trigger (re-use existing log_audit_event)
CREATE TRIGGER audit_hubs
  AFTER INSERT OR UPDATE OR DELETE ON public.hubs
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- END OF 005_hubs.sql
-- ============================================================
