-- ============================================================
-- 002_helpers_rls.sql
-- Rota Solidária — RLS, helper functions, grants, bootstrap
-- Run SECOND in Supabase SQL Editor (after 001)
-- ============================================================

-- ===================
-- 1. ENABLE RLS
-- ===================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_global_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ===================
-- 2. HELPER FUNCTIONS (SECURITY DEFINER)
-- These bypass RLS to avoid circular dependencies.
-- Called FROM RLS policies to determine access.
-- ===================

-- Check if the current user is a master_admin
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_global_roles
    WHERE user_id = auth.uid()
      AND role = 'master_admin'
  );
END;
$$;

-- Check if the current user has a specific role in a project
CREATE OR REPLACE FUNCTION public.has_project_role(
  _project_id UUID,
  _role public.project_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id
      AND user_id = auth.uid()
      AND role = _role
  );
END;
$$;

-- Check if the current user is a manager of a project
CREATE OR REPLACE FUNCTION public.is_project_manager(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.has_project_role(_project_id, 'manager');
END;
$$;

-- Check if the current user is a member of a project (any role)
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id
      AND user_id = auth.uid()
  );
END;
$$;

-- ===================
-- 3. GRANTS
-- ===================

-- Block all anonymous access
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.user_global_roles FROM anon;
REVOKE ALL ON public.projects FROM anon;
REVOKE ALL ON public.project_members FROM anon;

-- Grant to authenticated (RLS mediates actual row-level access)
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_global_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.project_members TO authenticated;

-- ===================
-- 4. RLS POLICIES — user_profiles
-- ===================

-- Users can read their own profile
CREATE POLICY "users_select_own_profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());

-- Master admin reads all profiles
CREATE POLICY "master_select_all_profiles"
  ON public.user_profiles FOR SELECT
  USING (public.is_master());

-- Project members read profiles of peers in shared projects
CREATE POLICY "members_select_peer_profiles"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm1
      JOIN public.project_members pm2
        ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid()
        AND pm2.user_id = user_profiles.id
    )
  );

-- Users insert their own profile (on registration)
CREATE POLICY "users_insert_own_profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users update their own profile
CREATE POLICY "users_update_own_profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No DELETE policy (LGPD deletion handled separately in future)

-- ===================
-- 5. RLS POLICIES — user_global_roles
-- ===================

-- Users see their own global roles; master sees all
CREATE POLICY "select_global_roles"
  ON public.user_global_roles FOR SELECT
  USING (user_id = auth.uid() OR public.is_master());

-- Only master can grant global roles
CREATE POLICY "master_insert_global_roles"
  ON public.user_global_roles FOR INSERT
  WITH CHECK (public.is_master() AND granted_by = auth.uid());

-- Only master can revoke global roles
CREATE POLICY "master_delete_global_roles"
  ON public.user_global_roles FOR DELETE
  USING (public.is_master());

-- No UPDATE policy (revoke and re-grant instead)

-- ===================
-- 6. RLS POLICIES — projects
-- ===================

-- Master admin sees all projects
CREATE POLICY "master_select_all_projects"
  ON public.projects FOR SELECT
  USING (public.is_master());

-- Project members see their own projects
CREATE POLICY "members_select_own_projects"
  ON public.projects FOR SELECT
  USING (public.is_project_member(id));

-- Only master can create projects (enforces created_by = caller)
CREATE POLICY "master_insert_projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.is_master() AND created_by = auth.uid());

-- Only master can update projects
CREATE POLICY "master_update_projects"
  ON public.projects FOR UPDATE
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- No DELETE policy (use status 'inactive' to close projects)

-- ===================
-- 7. RLS POLICIES — project_members
-- ===================

-- Master admin sees all memberships
CREATE POLICY "master_select_all_members"
  ON public.project_members FOR SELECT
  USING (public.is_master());

-- Members see peers in their project
CREATE POLICY "members_select_project_peers"
  ON public.project_members FOR SELECT
  USING (public.is_project_member(project_id));

-- Master can add anyone with any role (enforces assigned_by = caller)
CREATE POLICY "master_insert_members"
  ON public.project_members FOR INSERT
  WITH CHECK (public.is_master() AND assigned_by = auth.uid());

-- Managers can add NON-MANAGER members to their project only
CREATE POLICY "managers_insert_non_manager_members"
  ON public.project_members FOR INSERT
  WITH CHECK (
    public.is_project_manager(project_id)
    AND role != 'manager'
    AND assigned_by = auth.uid()
  );

-- Master can remove any membership
CREATE POLICY "master_delete_members"
  ON public.project_members FOR DELETE
  USING (public.is_master());

-- Managers can remove non-manager members from their project
CREATE POLICY "managers_delete_non_manager_members"
  ON public.project_members FOR DELETE
  USING (
    public.is_project_manager(project_id)
    AND role != 'manager'
  );

-- No UPDATE policy (remove and re-add instead)

-- ===================
-- 8. BOOTSTRAP: First Master Admin
-- ===================

-- One-time function: only works when ZERO master admins exist.
-- After first use, permanently inactive.
CREATE OR REPLACE FUNCTION public.bootstrap_first_master()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Abort if any master admin already exists
  IF EXISTS (
    SELECT 1 FROM public.user_global_roles WHERE role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Bootstrap rejected: a master admin already exists.';
  END IF;

  -- Caller must have a profile
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bootstrap rejected: create your user profile first.';
  END IF;

  -- Grant master_admin role
  INSERT INTO public.user_global_roles (user_id, role, granted_by)
  VALUES (auth.uid(), 'master_admin', auth.uid());
END;
$$;

-- Block anonymous from calling bootstrap
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_master FROM anon;

COMMENT ON FUNCTION public.bootstrap_first_master IS
  'One-time bootstrap for the first master admin. Permanently inactive after first use.';

-- ============================================================
-- END OF 002_helpers_rls.sql
-- ============================================================
