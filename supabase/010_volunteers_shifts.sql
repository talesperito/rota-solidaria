-- ============================================================
-- 010_volunteers_shifts.sql
-- Rota Solidária — Membership helpers + Service Shifts
-- Run in Supabase SQL Editor BEFORE testing
-- ============================================================

-- ═══════════════════════════════════════════
-- PART A: RPC functions for member management
-- ═══════════════════════════════════════════

-- 1. Get project members with full info (email, phone)
CREATE OR REPLACE FUNCTION public.get_project_members_full(_project_id UUID)
RETURNS TABLE (
  member_id UUID, user_id UUID, full_name TEXT,
  email TEXT, phone TEXT, phone_consent BOOLEAN,
  role TEXT, assigned_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_master() OR public.is_project_member(_project_id)) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  RETURN QUERY
  SELECT pm.id, pm.user_id, up.full_name, au.email::TEXT,
         up.phone, up.phone_consent, pm.role::TEXT, pm.assigned_at
  FROM public.project_members pm
  JOIN public.user_profiles up ON pm.user_id = up.id
  JOIN auth.users au ON pm.user_id = au.id
  WHERE pm.project_id = _project_id
  ORDER BY pm.assigned_at DESC;
END;
$$;

-- 2. Lookup user by email for project assignment (manager OR master)
CREATE OR REPLACE FUNCTION public.lookup_user_for_assignment(_email TEXT, _project_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE _uid UUID;
BEGIN
  IF NOT (public.is_master() OR public.is_project_manager(_project_id)) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  SELECT au.id INTO _uid FROM auth.users au
  JOIN public.user_profiles up ON au.id = up.id
  WHERE au.email = _email;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário com email "%" não encontrado ou sem perfil.', _email;
  END IF;
  RETURN _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_members_full TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_user_for_assignment TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_project_members_full FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_user_for_assignment FROM anon;

-- ═══════════════════════════════════════════
-- PART B: Service Shifts + Registrations
-- ═══════════════════════════════════════════

-- 1. Shift status enum
CREATE TYPE public.shift_status AS ENUM ('open', 'full', 'closed', 'cancelled');

-- 2. Shifts table
CREATE TABLE public.service_shifts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL CHECK (char_length(title) >= 3),
  description      TEXT,
  shift_date       DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  required_people  INTEGER NOT NULL CHECK (required_people > 0),
  hub_id           UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  created_by       UUID NOT NULL REFERENCES public.user_profiles(id),
  status           public.shift_status NOT NULL DEFAULT 'open',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_shifts_updated_at
  BEFORE UPDATE ON public.service_shifts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Registrations table
CREATE TABLE public.shift_registrations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id             UUID NOT NULL REFERENCES public.service_shifts(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.user_profiles(id),
  wants_to_offer_ride  BOOLEAN NOT NULL DEFAULT false,
  needs_ride           BOOLEAN NOT NULL DEFAULT false,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shift_id, user_id)
);

-- 4. Indexes
CREATE INDEX idx_shifts_project ON public.service_shifts(project_id);
CREATE INDEX idx_shifts_date ON public.service_shifts(shift_date);
CREATE INDEX idx_shifts_status ON public.service_shifts(project_id, status);
CREATE INDEX idx_regs_shift ON public.shift_registrations(shift_id);
CREATE INDEX idx_regs_user ON public.shift_registrations(user_id);

-- 5. Auto-update shift status when full
CREATE OR REPLACE FUNCTION public.auto_update_shift_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _count INT; _required INT; _status public.shift_status;
BEGIN
  SELECT count(*) INTO _count FROM public.shift_registrations WHERE shift_id = NEW.shift_id;
  SELECT required_people, status INTO _required, _status FROM public.service_shifts WHERE id = NEW.shift_id;
  IF _count >= _required AND _status = 'open' THEN
    UPDATE public.service_shifts SET status = 'full' WHERE id = NEW.shift_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shift_auto_full
  AFTER INSERT ON public.shift_registrations
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_shift_status();

-- 6. RLS: service_shifts
ALTER TABLE public.service_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY shifts_select ON public.service_shifts
  FOR SELECT TO authenticated
  USING (public.is_master() OR public.is_project_member(project_id));

CREATE POLICY shifts_insert ON public.service_shifts
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_master() OR public.is_project_manager(project_id))
    AND created_by = auth.uid()
  );

CREATE POLICY shifts_update ON public.service_shifts
  FOR UPDATE TO authenticated
  USING (public.is_master() OR public.is_project_manager(project_id))
  WITH CHECK (public.is_master() OR public.is_project_manager(project_id));

-- 7. RLS: shift_registrations
ALTER TABLE public.shift_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY regs_select ON public.shift_registrations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_shifts s
      WHERE s.id = shift_registrations.shift_id
        AND (public.is_master() OR public.is_project_member(s.project_id))
    )
  );

CREATE POLICY regs_insert ON public.shift_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.service_shifts s
      WHERE s.id = shift_registrations.shift_id
        AND (public.is_master() OR public.is_project_member(s.project_id))
        AND s.status = 'open'
    )
  );

CREATE POLICY regs_update ON public.shift_registrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. Grants (no DELETE — no hard deletes)
GRANT SELECT, INSERT, UPDATE ON public.service_shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shift_registrations TO authenticated;
REVOKE ALL ON public.service_shifts FROM anon;
REVOKE ALL ON public.shift_registrations FROM anon;

-- 9. Audit
CREATE TRIGGER audit_shifts
  AFTER INSERT OR UPDATE ON public.service_shifts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_regs
  AFTER INSERT OR UPDATE ON public.shift_registrations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- END OF 010_volunteers_shifts.sql
-- ============================================================
