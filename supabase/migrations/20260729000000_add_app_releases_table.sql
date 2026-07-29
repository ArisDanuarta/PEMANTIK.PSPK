-- Migration: Add App Releases Table & Storage Bucket
-- Description: Tabel untuk mencatat rilis APK dan mengelola bucket penyimpanan APK.

-- 1. Create table app_releases
CREATE TABLE IF NOT EXISTS public.app_releases (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  version_name text NOT NULL, -- e.g., '1.0.0'
  version_code integer NOT NULL, -- e.g., 1
  release_notes text,
  download_url text NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_releases_pkey PRIMARY KEY (id)
);

-- Trigger untuk updated_at
DROP TRIGGER IF EXISTS set_app_releases_updated_at ON public.app_releases;
CREATE TRIGGER set_app_releases_updated_at
  BEFORE UPDATE ON public.app_releases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 2. Create Storage Bucket for 'releases' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('releases', 'releases', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS for storage.objects (releases bucket)
-- Allow public to download APKs
DROP POLICY IF EXISTS "Public can view releases" ON storage.objects;
CREATE POLICY "Public can view releases"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'releases' );

-- Allow super_admin to upload/delete APKs
DROP POLICY IF EXISTS "Superadmin can insert releases" ON storage.objects;
CREATE POLICY "Superadmin can insert releases"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'releases' 
    AND public.jwt_user_role() = 'super_admin'::user_role
  );

DROP POLICY IF EXISTS "Superadmin can update releases" ON storage.objects;
CREATE POLICY "Superadmin can update releases"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'releases'
    AND public.jwt_user_role() = 'super_admin'::user_role
  );

DROP POLICY IF EXISTS "Superadmin can delete releases" ON storage.objects;
CREATE POLICY "Superadmin can delete releases"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'releases'
    AND public.jwt_user_role() = 'super_admin'::user_role
  );

-- 4. RLS for public.app_releases
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Allow public to read active releases (for the mobile app and login page)
DROP POLICY IF EXISTS "Public can view active releases" ON public.app_releases;
CREATE POLICY "Public can view active releases"
  ON public.app_releases FOR SELECT
  USING ( true ); -- We allow viewing all, or just is_active=true. Allowing all is fine for read-only.

-- Allow super_admin full access
DROP POLICY IF EXISTS "Superadmin full access to app_releases" ON public.app_releases;
CREATE POLICY "Superadmin full access to app_releases"
  ON public.app_releases
  FOR ALL
  TO authenticated
  USING ( public.jwt_user_role() = 'super_admin'::user_role );
