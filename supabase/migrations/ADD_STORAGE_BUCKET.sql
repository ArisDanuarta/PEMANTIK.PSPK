-- Migration: Create Storage Bucket for Question Media

-- Aktifkan ekstensi yang diperlukan jika belum
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pastikan tabel storage.buckets dan storage.objects ada
-- Catatan: Secara default Supabase sudah memilikinya, ini hanya memastikan insert ke buckets.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('question_media', 'question_media', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for question_admin to manage media
CREATE POLICY "Admin can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'question_media' AND 
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'question_admin')
);

CREATE POLICY "Admin can update media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'question_media' AND 
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'question_admin')
);

CREATE POLICY "Admin can delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'question_media' AND 
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'question_admin')
);

-- Public can read media
CREATE POLICY "Public can view media"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'question_media' );
