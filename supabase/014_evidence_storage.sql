-- ============================================================
-- 014_evidence_storage.sql
-- Rota Solidária — Storage bucket para fotos de evidência de entrega
-- Run in Supabase SQL Editor AFTER 008_deliveries.sql
-- ============================================================

-- 1. Coluna de evidência na tabela deliveries
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS evidence_photo_url TEXT;

COMMENT ON COLUMN public.deliveries.evidence_photo_url IS
  'URL da foto de evidência de entrega armazenada no Supabase Storage (bucket: delivery-evidence).';

-- 2. Bucket de evidências (execute via Supabase Dashboard ou Storage API)
-- O bucket é criado via Dashboard: Storage → New Bucket
-- Nome: delivery-evidence
-- Public: false (privado, acesso via RLS)
-- File size limit: 2MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- 3. Políticas de Storage para o bucket delivery-evidence
-- As políticas de storage são RLS aplicadas em storage.objects.
-- Execute APÓS criar o bucket "delivery-evidence" no Dashboard.

-- 3.1 Qualquer usuário autenticado pode fazer upload de evidências
CREATE POLICY "evidence_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'delivery-evidence');

-- 3.2 Qualquer usuário autenticado pode visualizar as fotos
CREATE POLICY "evidence_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'delivery-evidence');

-- 3.3 O próprio uploader pode atualizar sua foto (upsert)
CREATE POLICY "evidence_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'delivery-evidence' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'delivery-evidence');

-- 3.4 O próprio uploader pode deletar sua foto
CREATE POLICY "evidence_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'delivery-evidence' AND owner = auth.uid());

-- ============================================================
-- END OF 014_evidence_storage.sql
-- ============================================================
