-- ============================================================
-- 009_incidents.sql
-- Rota Solidária — Incidents (Incidentes)
-- Run in Supabase SQL Editor BEFORE testing
-- ============================================================

-- 1. ENUMs
CREATE TYPE public.incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.incident_status AS ENUM ('open', 'investigating', 'resolved', 'dismissed');

-- 2. Table
CREATE TABLE public.incidents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reported_by           UUID NOT NULL REFERENCES public.user_profiles(id),
  type                  TEXT NOT NULL,
  title                 TEXT NOT NULL CHECK (char_length(title) >= 3),
  description           TEXT,
  severity              public.incident_severity NOT NULL DEFAULT 'medium',
  status                public.incident_status NOT NULL DEFAULT 'open',
  gps_lat               DOUBLE PRECISION,
  gps_lng               DOUBLE PRECISION,
  related_donation_id   UUID REFERENCES public.donations(id) ON DELETE SET NULL,
  related_delivery_id   UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  resolved_at           TIMESTAMPTZ,
  resolved_by           UUID REFERENCES public.user_profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.incidents IS
  'Incidentes reportados por membros do projeto. Sem hard delete.';

CREATE TRIGGER set_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Indexes
CREATE INDEX idx_incidents_project ON public.incidents(project_id);
CREATE INDEX idx_incidents_status ON public.incidents(project_id, status);
CREATE INDEX idx_incidents_severity ON public.incidents(project_id, severity);

-- 4. RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- 4.1 SELECT: project members + master
CREATE POLICY incidents_select ON public.incidents
  FOR SELECT TO authenticated
  USING (
    public.is_master()
    OR public.is_project_member(project_id)
  );

-- 4.2 INSERT: any project member (reported_by = self)
CREATE POLICY incidents_insert ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_master() OR public.is_project_member(project_id))
    AND reported_by = auth.uid()
  );

-- 4.3 UPDATE: manager/master only (status changes, resolution)
CREATE POLICY incidents_update ON public.incidents
  FOR UPDATE TO authenticated
  USING (
    public.is_master()
    OR public.is_project_manager(project_id)
  )
  WITH CHECK (
    public.is_master()
    OR public.is_project_manager(project_id)
  );

-- 4.4 NO DELETE policy — incidents are never hard-deleted

-- 5. Grants (no DELETE)
GRANT SELECT, INSERT, UPDATE ON public.incidents TO authenticated;
REVOKE ALL ON public.incidents FROM anon;

-- 6. Audit
CREATE TRIGGER audit_incidents
  AFTER INSERT OR UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- END OF 009_incidents.sql
-- ============================================================
