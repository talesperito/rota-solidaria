-- ============================================================
-- 003_audit.sql
-- Rota Solidária — Append-only audit logging system
-- Run THIRD in Supabase SQL Editor (after 001 and 002)
-- ============================================================

-- ===================
-- 1. AUDIT LOG TABLE
-- ===================

CREATE TABLE public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID REFERENCES public.user_profiles(id),
  actor_role      TEXT,
  action_type     TEXT NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
  entity_type     TEXT NOT NULL,
  entity_id       TEXT,
  project_id      UUID,  -- Denormalized for efficient project-scoped queries
  before_state    JSONB,
  after_state     JSONB,
  ip_address      INET,
  geo             JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS
  'Append-only audit log. UPDATE and DELETE operations are blocked by triggers.';
COMMENT ON COLUMN public.audit_logs.project_id IS
  'Denormalized project reference for manager-scoped audit queries. No FK to preserve logs if project changes.';

-- Indexes for common query patterns
CREATE INDEX idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor
  ON public.audit_logs (actor_user_id);
CREATE INDEX idx_audit_logs_project
  ON public.audit_logs (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at
  ON public.audit_logs (created_at);

-- ===================
-- 2. ENABLE RLS + GRANTS
-- ===================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- No public access
REVOKE ALL ON public.audit_logs FROM anon;

-- Only SELECT for authenticated (inserts happen via SECURITY DEFINER triggers)
GRANT SELECT ON public.audit_logs TO authenticated;

-- ===================
-- 3. RLS POLICIES
-- ===================

-- Master admin reads all audit logs
CREATE POLICY "master_select_all_audit_logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_master());

-- Managers read audit logs scoped to their projects
CREATE POLICY "managers_select_project_audit_logs"
  ON public.audit_logs FOR SELECT
  USING (
    audit_logs.project_id IS NOT NULL
    AND public.is_project_manager(audit_logs.project_id)
  );

-- No INSERT/UPDATE/DELETE policies = users cannot write via API

-- ===================
-- 4. IMMUTABILITY: Defense-in-Depth
-- ===================

-- Trigger function that blocks any modification attempt
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SECURITY VIOLATION: Audit logs are immutable. % operations are permanently blocked.', TG_OP;
END;
$$;

-- Block UPDATE attempts
CREATE TRIGGER block_audit_log_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

-- Block DELETE attempts
CREATE TRIGGER block_audit_log_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

-- ===================
-- 5. GENERIC AUDIT TRIGGER FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id   UUID;
  _actor_role TEXT;
  _entity_id  TEXT;
  _project_id UUID;
  _before     JSONB;
  _after      JSONB;
BEGIN
  -- Get current authenticated user
  _actor_id := auth.uid();

  -- Determine actor's highest role
  IF EXISTS (
    SELECT 1 FROM public.user_global_roles
    WHERE user_id = _actor_id AND role = 'master_admin'
  ) THEN
    _actor_role := 'master_admin';
  ELSE
    _actor_role := 'authenticated';
  END IF;

  -- Build audit record based on operation type
  IF TG_OP = 'DELETE' THEN
    _entity_id := (to_jsonb(OLD) ->> 'id');
    _before    := to_jsonb(OLD);
    _after     := NULL;
  ELSE
    _entity_id := (to_jsonb(NEW) ->> 'id');
    _after     := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN
      _before := to_jsonb(OLD);
    ELSE
      _before := NULL;
    END IF;
  END IF;

  -- Extract project_id for project-scoped audit queries
  IF TG_TABLE_NAME = 'projects' THEN
    _project_id := _entity_id::UUID;
  ELSE
    -- Safely extract project_id if the column exists (returns NULL otherwise)
    _project_id := (COALESCE(_after, _before) ->> 'project_id')::UUID;
  END IF;

  -- Insert audit log entry (SECURITY DEFINER bypasses RLS)
  INSERT INTO public.audit_logs (
    actor_user_id, actor_role, action_type,
    entity_type, entity_id, project_id,
    before_state, after_state
  ) VALUES (
    _actor_id, _actor_role, TG_OP,
    TG_TABLE_NAME, _entity_id, _project_id,
    _before, _after
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.log_audit_event IS
  'Generic audit trigger. Logs INSERT/UPDATE/DELETE with before/after state and project context.';

-- ===================
-- 6. ATTACH AUDIT TRIGGERS TO PHASE 1 TABLES
-- ===================

CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_user_global_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_global_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_project_members
  AFTER INSERT OR UPDATE OR DELETE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- END OF 003_audit.sql
-- ============================================================
