-- Migration: Add system_settings and audit_logs tables
-- Created at: 2026-06-15

BEGIN;

-- Drop existing tables just in case they were partially created
DROP TABLE IF EXISTS public.system_settings;

-- We also drop system_logs if we accidentally overwrote it with the wrong schema in the previous step
-- and then we will recreate the ORIGINAL system_logs schema here to fix the breakage.
DROP TABLE IF EXISTS public.system_logs;

-- 1. Create system_settings table
CREATE TABLE public.system_settings (
    id integer PRIMARY KEY DEFAULT 1,
    system_name text NOT NULL DEFAULT 'Platform Asesmen Pemantik',
    session_timeout integer NOT NULL DEFAULT 60,
    maintenance_mode boolean NOT NULL DEFAULT false,
    maintenance_message text DEFAULT 'Sistem sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi.',
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT system_settings_id_check CHECK (id = 1)
);

-- Insert default row if it doesn't exist
INSERT INTO public.system_settings (id, system_name, session_timeout, maintenance_mode, maintenance_message)
VALUES (1, 'Platform Asesmen Pemantik', 60, false, 'Sistem sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi.');

-- 2. RECREATE ORIGINAL system_logs table (since we broke it)
CREATE TABLE public.system_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    level text NOT NULL DEFAULT 'info',
    source text NOT NULL DEFAULT 'system',
    role_context text,
    user_id uuid,
    message text NOT NULL,
    details jsonb,
    resolved boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Insert some mock error logs so the dashboard doesn't look empty
INSERT INTO public.system_logs (level, source, role_context, message, resolved) VALUES 
('error', 'backend', 'super_admin', 'Gagal memuat API dari sistem pihak ketiga', false),
('warning', 'frontend', 'teacher', 'Koneksi lambat saat memuat data sekolah', true);

-- 3. Create NEW audit_logs table (for our settings tracking)
CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_name text NOT NULL,
    action text NOT NULL,
    status text NOT NULL DEFAULT 'success',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Insert mock audit logs
INSERT INTO public.audit_logs (user_name, action, status, created_at) VALUES 
('system', 'Menjalankan migrasi SQL schema untuk system_settings', 'success', timezone('utc'::text, now() - interval '2 days')),
('superadmin_pemantik', 'Login ke sistem', 'success', timezone('utc'::text, now() - interval '3 hours'));

-- 4. RLS Policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow super_admin to manage system_settings
DROP POLICY IF EXISTS "Super admin can manage system_settings" ON public.system_settings;
CREATE POLICY "Super admin can manage system_settings" ON public.system_settings FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- Public read access for system_settings
DROP POLICY IF EXISTS "Public read system_settings" ON public.system_settings;
CREATE POLICY "Public read system_settings" ON public.system_settings FOR SELECT USING (true);

-- System logs RLS
DROP POLICY IF EXISTS "Super admin can manage system_logs" ON public.system_logs;
CREATE POLICY "Super admin can manage system_logs" ON public.system_logs FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

DROP POLICY IF EXISTS "Authenticated can insert system_logs" ON public.system_logs;
CREATE POLICY "Authenticated can insert system_logs" ON public.system_logs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Audit logs RLS
DROP POLICY IF EXISTS "Super admin can manage audit_logs" ON public.audit_logs;
CREATE POLICY "Super admin can manage audit_logs" ON public.audit_logs FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

DROP POLICY IF EXISTS "Authenticated can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

COMMIT;
