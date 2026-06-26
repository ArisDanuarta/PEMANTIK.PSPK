-- Migration: Add maintenance_message to system_settings
-- Created at: 2026-06-15

BEGIN;

-- Add maintenance_message column
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS maintenance_message text DEFAULT 'Sistem sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi.';

COMMIT;
