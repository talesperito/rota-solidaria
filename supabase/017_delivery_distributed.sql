-- ============================================================
-- 017_delivery_distributed.sql
-- Rota Solidária — Estado "distribuída" na cadeia de custódia (PRD 6.7)
-- Representa a saída do item do hub para o beneficiário final.
-- Run in Supabase SQL Editor AFTER 008_deliveries.sql
-- ============================================================

ALTER TYPE public.delivery_status ADD VALUE IF NOT EXISTS 'distributed' AFTER 'validated';

COMMENT ON TYPE public.delivery_status IS
  'Estados da cadeia de custódia: available → assigned → in_transit → delivered → validated → distributed';

-- Adicionar timestamp de distribuição
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS distributed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.deliveries.distributed_at IS
  'Momento em que o item foi distribuído ao beneficiário final (saída do hub).';

-- ============================================================
-- END OF 017_delivery_distributed.sql
-- ============================================================
