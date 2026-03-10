-- ============================================================
-- 015_public_read.sql
-- Rota Solidária — Leitura pública de projetos e demandas
-- Permite que usuários NÃO autenticados vejam projetos ativos
-- e suas demandas abertas (sem dados pessoais).
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Liberar grant de SELECT para anon nas tabelas necessárias
GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.needs TO anon;
GRANT SELECT ON public.hubs TO anon;

-- 2. Política pública: qualquer pessoa vê projetos ativos
CREATE POLICY "public_select_active_projects"
  ON public.projects FOR SELECT
  TO anon
  USING (status = 'active');

-- 3. Política pública: qualquer pessoa vê demandas abertas/em progresso de projetos ativos
CREATE POLICY "public_select_open_needs"
  ON public.needs FOR SELECT
  TO anon
  USING (
    status IN ('open', 'in_progress')
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = needs.project_id
        AND p.status = 'active'
    )
  );

-- 4. Política pública: hubs ativos de projetos ativos
CREATE POLICY "public_select_active_hubs"
  ON public.hubs FOR SELECT
  TO anon
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = hubs.project_id
        AND p.status = 'active'
    )
  );

-- ============================================================
-- END OF 015_public_read.sql
-- ============================================================
