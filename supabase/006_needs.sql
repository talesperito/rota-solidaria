-- ============================================================
-- 006_needs.sql
-- Rota Solidária — Needs (Demandas)
-- Run in Supabase SQL Editor BEFORE testing
-- ============================================================

-- 1. ENUMs
CREATE TYPE public.need_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.need_status AS ENUM ('open', 'in_progress', 'fulfilled', 'cancelled');

-- 2. Needs table
CREATE TABLE public.needs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  hub_id          UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  title           TEXT NOT NULL CHECK (char_length(title) >= 3),
  description     TEXT,
  category        TEXT NOT NULL,
  quantity_needed INTEGER NOT NULL CHECK (quantity_needed > 0),
  unit            TEXT NOT NULL DEFAULT 'unidades',
  priority        public.need_priority NOT NULL DEFAULT 'medium',
  due_date        DATE,
  status          public.need_status NOT NULL DEFAULT 'open',
  created_by      UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.needs IS
  'Demandas do projeto. Criadas por gestores. Vinculadas a um hub de destino.';

CREATE TRIGGER set_needs_updated_at
  BEFORE UPDATE ON public.needs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Indexes
CREATE INDEX idx_needs_project ON public.needs(project_id);
CREATE INDEX idx_needs_hub ON public.needs(hub_id);
CREATE INDEX idx_needs_status ON public.needs(project_id, status);

-- 4. RLS
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

-- 4.1 SELECT: project members + master
CREATE POLICY needs_select_member ON public.needs
  FOR SELECT TO authenticated
  USING (
    public.is_master()
    OR public.is_project_member(project_id)
  );

-- 4.2 INSERT: manager + master
CREATE POLICY needs_insert_manager ON public.needs
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_master() OR public.is_project_manager(project_id))
    AND created_by = auth.uid()
  );

-- 4.3 UPDATE: manager + master
CREATE POLICY needs_update_manager ON public.needs
  FOR UPDATE TO authenticated
  USING (
    public.is_master()
    OR public.is_project_manager(project_id)
  )
  WITH CHECK (
    public.is_master()
    OR public.is_project_manager(project_id)
  );

-- 4.4 DELETE: manager + master
CREATE POLICY needs_delete_manager ON public.needs
  FOR DELETE TO authenticated
  USING (
    public.is_master()
    OR public.is_project_manager(project_id)
  );

-- 5. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.needs TO authenticated;
REVOKE ALL ON public.needs FROM anon;

-- 6. Audit trigger
CREATE TRIGGER audit_needs
  AFTER INSERT OR UPDATE OR DELETE ON public.needs
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- END OF 006_needs.sql
-- ============================================================
