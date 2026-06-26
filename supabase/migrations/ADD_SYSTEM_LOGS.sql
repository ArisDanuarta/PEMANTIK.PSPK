-- =====================================================================================
-- PEMANTIK SYSTEM LOGS MIGRATION
-- Menambahkan tabel system_logs untuk pencatatan error/informasi real-time.
-- Eksekusi query ini di SQL Editor Supabase Anda.
-- =====================================================================================

-- 1. Buat tipe Enum untuk Log Level dan Source
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_level') THEN
    CREATE TYPE log_level AS ENUM ('info', 'warning', 'error', 'critical');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_source') THEN
    CREATE TYPE log_source AS ENUM ('frontend', 'backend', 'database', 'system');
  END IF;
END $$;

-- 2. Buat tabel system_logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level log_level NOT NULL DEFAULT 'info',
  source log_source NOT NULL DEFAULT 'backend',
  role_context user_role, -- context saat error terjadi (super_admin, community, dll)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- siapa pelakunya (bisa null jika blm login)
  message TEXT NOT NULL,
  details JSONB, -- menyimpan stack_trace atau data context tambahan
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Aktifkan RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 4. Kebijakan RLS (Hanya Super Admin yang bisa melihat dan mengubah log, tapi backend Service Role bisa insert bypass RLS)
CREATE POLICY "Super admin can do all on system_logs" 
ON public.system_logs 
FOR ALL 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- 5. Broadcast setup untuk Supabase Realtime
-- Gunakan ALTER PUBLICATION agar tidak merusak realtime di tabel lain.
-- Catatan: jika error 'publication does not exist', jalankan: CREATE PUBLICATION supabase_realtime FOR TABLE public.system_logs;
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;
COMMIT;
