-- ============================================================
-- Migration: Fix Independent Schools Linked to Fake Community
-- Created: 2026-07-14
--
-- Masalah: Bug lama menyebabkan sekolah independen (yang dibuat
-- Superadmin via upload Dapodik) dihubungkan ke komunitas fiktif
-- bernama "SEKOLAH INDEPENDEN" alih-alih community_id = NULL.
--
-- Fix ini:
-- 1. Set community_id = NULL untuk semua sekolah yang terhubung
--    ke komunitas "SEKOLAH INDEPENDEN"
-- 2. Set community_id = NULL di school_assessment_stages untuk
--    stages yang terkait sekolah-sekolah tersebut
-- 3. Hapus entri komunitas fiktif "SEKOLAH INDEPENDEN"
-- ============================================================

DO $$
DECLARE
  indep_comm_id uuid;
  affected_schools int := 0;
  affected_stages  int := 0;
BEGIN
  SELECT id INTO indep_comm_id
  FROM public.communities
  WHERE name = 'SEKOLAH INDEPENDEN'
  LIMIT 1;

  IF indep_comm_id IS NULL THEN
    RAISE NOTICE 'Komunitas SEKOLAH INDEPENDEN tidak ditemukan — tidak ada yang perlu diperbaiki.';
    RETURN;
  END IF;

  RAISE NOTICE 'Ditemukan komunitas SEKOLAH INDEPENDEN dengan ID: %', indep_comm_id;

  -- Step 1: Hapus referensi dari school_assessment_stages
  UPDATE public.school_assessment_stages
  SET community_id = NULL
  WHERE community_id = indep_comm_id;
  GET DIAGNOSTICS affected_stages = ROW_COUNT;
  RAISE NOTICE 'school_assessment_stages diperbarui: % baris', affected_stages;

  -- Step 2: Hapus referensi dari assessment_access (jika ada)
  DELETE FROM public.assessment_access
  WHERE target_type = 'community' AND target_id = indep_comm_id;

  -- Step 3: Sekolah-sekolah independen: set community_id = NULL
  UPDATE public.schools
  SET community_id = NULL
  WHERE community_id = indep_comm_id;
  GET DIAGNOSTICS affected_schools = ROW_COUNT;
  RAISE NOTICE 'schools diperbarui: % baris', affected_schools;

  -- Step 4: Hapus komunitas fiktif (sudah tidak ada referensinya)
  DELETE FROM public.communities
  WHERE id = indep_comm_id;

  RAISE NOTICE 'Komunitas SEKOLAH INDEPENDEN berhasil dihapus. Total sekolah yang diperbaiki: %', affected_schools;
END $$;
