-- ============================================================
-- 016_needs_gps.sql
-- Rota Solidária — GPS de destino nas demandas (PRD 6.2)
-- Run in Supabase SQL Editor AFTER 006_needs.sql
-- ============================================================

ALTER TABLE public.needs
  ADD COLUMN IF NOT EXISTS dest_lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS dest_lng NUMERIC(9,6);

COMMENT ON COLUMN public.needs.dest_lat IS
  'Latitude do local de destino da demanda. Opcional quando hub já define o destino.';
COMMENT ON COLUMN public.needs.dest_lng IS
  'Longitude do local de destino da demanda. Opcional quando hub já define o destino.';

-- ============================================================
-- END OF 016_needs_gps.sql
-- ============================================================
