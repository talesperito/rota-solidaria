-- ============================================================
-- 004_admin_helpers.sql
-- Rota Solidária — Admin helper functions (RPC)
-- Run in Supabase SQL Editor BEFORE testing /admin
-- ============================================================

-- 1. Lookup user UUID by email (master_admin only)
-- Reads auth.users (requires SECURITY DEFINER)
-- Validates user also has a profile in user_profiles
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  IF NOT public.is_master() THEN
    RAISE EXCEPTION 'Acesso negado: apenas master_admin pode buscar usuários por email.';
  END IF;

  SELECT au.id INTO _user_id
  FROM auth.users au
  JOIN public.user_profiles up ON au.id = up.id
  WHERE au.email = _email;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email "%" não encontrado ou sem perfil.', _email;
  END IF;

  RETURN _user_id;
END;
$$;

-- 2. Get managers of a project with their emails
-- Accessible by master_admin or project managers
CREATE OR REPLACE FUNCTION public.get_project_managers(_project_id UUID)
RETURNS TABLE (user_id UUID, full_name TEXT, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_master() OR public.is_project_manager(_project_id)) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  RETURN QUERY
  SELECT pm.user_id, up.full_name, au.email::TEXT
  FROM public.project_members pm
  JOIN public.user_profiles up ON pm.user_id = up.id
  JOIN auth.users au ON pm.user_id = au.id
  WHERE pm.project_id = _project_id
    AND pm.role = 'manager';
END;
$$;

-- 3. Grants
REVOKE EXECUTE ON FUNCTION public.lookup_user_by_email FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_managers FROM anon;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_managers TO authenticated;

-- ============================================================
-- END OF 004_admin_helpers.sql
-- ============================================================
