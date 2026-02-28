-- ============================================================
-- 001_foundation.sql
-- Rota Solidária — Core types, tables, constraints, triggers
-- Run FIRST in Supabase SQL Editor
-- ============================================================

-- ===================
-- 1. CUSTOM TYPES
-- ===================

-- Global roles (system-wide). Currently only master_admin.
CREATE TYPE public.global_role AS ENUM ('master_admin');

-- Project-scoped roles
CREATE TYPE public.project_role AS ENUM (
  'manager',
  'donor',
  'logistics_volunteer',
  'service_volunteer'
);

-- Project lifecycle status
CREATE TYPE public.project_status AS ENUM ('active', 'inactive');

-- ===================
-- 2. UTILITY FUNCTIONS
-- ===================

-- Auto-update updated_at column on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- 3. TABLES
-- ===================

-- 3.1 User Profiles
-- Public-facing profile linked to auth.users
-- Phone stored in E.164 format (e.g., +5535999999999)
CREATE TABLE public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL CHECK (char_length(full_name) >= 2),
  phone       TEXT CHECK (phone ~ '^\+[1-9]\d{1,14}$'),
  phone_consent BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_profiles IS
  'Public user profile linked to auth.users. Phone in E.164 format.';
COMMENT ON COLUMN public.user_profiles.phone_consent IS
  'LGPD: explicit consent to share phone with project members.';

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.2 User Global Roles
-- Junction table for system-wide roles (currently only master_admin)
CREATE TABLE public.user_global_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role        public.global_role NOT NULL,
  granted_by  UUID REFERENCES public.user_profiles(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

COMMENT ON TABLE public.user_global_roles IS
  'Global role assignments. Only master_admin exists in MVP.';

-- 3.3 Projects
CREATE TABLE public.projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL CHECK (char_length(name) >= 3),
  description     TEXT,
  geographic_area TEXT,
  status          public.project_status NOT NULL DEFAULT 'active',
  created_by      UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.projects IS
  'Humanitarian projects. Created only by master_admin.';

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.4 Project Members
-- Unified junction table for all project-scoped roles
CREATE TABLE public.project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role        public.project_role NOT NULL,
  assigned_by UUID NOT NULL REFERENCES public.user_profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, role)
);

COMMENT ON TABLE public.project_members IS
  'Project-scoped role assignments. Manager role assigned only by master_admin.';

-- ============================================================
-- END OF 001_foundation.sql
-- ============================================================
