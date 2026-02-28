-- ============================================================
-- 008_deliveries.sql
-- Rota Solidária — Deliveries (Logística / Entregas)
-- Run in Supabase SQL Editor BEFORE testing
-- ============================================================

-- 1. ENUM
CREATE TYPE public.delivery_status AS ENUM (
  'available',    -- aguardando voluntário
  'assigned',     -- voluntário assumiu
  'in_transit',   -- em transporte
  'delivered',    -- entregue (aguarda validação)
  'validated',    -- validada pelo gestor
  'cancelled'     -- cancelada
);

-- 2. Table
CREATE TABLE public.deliveries (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  donation_id              UUID NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  logistics_volunteer_id   UUID REFERENCES public.user_profiles(id),
  status                   public.delivery_status NOT NULL DEFAULT 'available',
  assigned_at              TIMESTAMPTZ,
  delivered_at             TIMESTAMPTZ,
  validated_at             TIMESTAMPTZ,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.deliveries IS
  'Entregas vinculadas a doações. Auto-criadas quando doação é aceita.';

CREATE TRIGGER set_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Indexes
CREATE INDEX idx_deliveries_project ON public.deliveries(project_id);
CREATE INDEX idx_deliveries_donation ON public.deliveries(donation_id);
CREATE INDEX idx_deliveries_volunteer ON public.deliveries(logistics_volunteer_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(project_id, status);

-- 4. Auto-create delivery when donation is accepted
CREATE OR REPLACE FUNCTION public.create_delivery_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    INSERT INTO public.deliveries (project_id, donation_id, status)
    VALUES (NEW.project_id, NEW.id, 'available')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_donation_accepted
  AFTER UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.create_delivery_on_accept();

-- 5. RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 5.1 SELECT: any project member + master
CREATE POLICY deliveries_select ON public.deliveries
  FOR SELECT TO authenticated
  USING (
    public.is_master()
    OR public.is_project_member(project_id)
  );

-- 5.2 INSERT: only via trigger (SECURITY DEFINER). Block direct inserts.
-- Manager/master can also insert manually if needed.
CREATE POLICY deliveries_insert ON public.deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_master()
    OR public.is_project_manager(project_id)
  );

-- 5.3 UPDATE (volunteer): can assign self to available, or update own
CREATE POLICY deliveries_update_volunteer ON public.deliveries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = deliveries.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'logistics_volunteer'
    )
    AND (
      status = 'available'
      OR logistics_volunteer_id = auth.uid()
    )
  )
  WITH CHECK (
    logistics_volunteer_id = auth.uid()
  );

-- 5.4 UPDATE (manager/master): full update
CREATE POLICY deliveries_update_manager ON public.deliveries
  FOR UPDATE TO authenticated
  USING (
    public.is_master()
    OR public.is_project_manager(project_id)
  )
  WITH CHECK (
    public.is_master()
    OR public.is_project_manager(project_id)
  );

-- 5.5 DELETE: manager/master only
CREATE POLICY deliveries_delete ON public.deliveries
  FOR DELETE TO authenticated
  USING (
    public.is_master()
    OR public.is_project_manager(project_id)
  );

-- 6. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
REVOKE ALL ON public.deliveries FROM anon;

-- 7. Audit
CREATE TRIGGER audit_deliveries
  AFTER INSERT OR UPDATE OR DELETE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- END OF 008_deliveries.sql
-- ============================================================
