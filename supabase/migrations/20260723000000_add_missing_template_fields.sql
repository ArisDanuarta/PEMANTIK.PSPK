-- Add missing fields for templates

ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS status_sekolah TEXT,
ADD COLUMN IF NOT EXISTS jenjang_sekolah TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS status_kepemilikan TEXT,
ADD COLUMN IF NOT EXISTS village TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS regency TEXT,
ADD COLUMN IF NOT EXISTS province TEXT;

