-- =====================================================================================
-- PEMANTIK — TAHAP 1: Rombak Role Komunitas — Schema Baru
-- Tanggal: 20260709000001
--
-- ISI MIGRASI:
--   1. Fix constraint schools.npsn: global UNIQUE → UNIQUE per komunitas
--   2. Buat tabel: assessment_phase_requests
--   3. Buat tabel: school_assessment_stages
--   4. Buat tabel: interventions
--   5. Buat tabel: intervention_tags
--   6. Buat tabel: intervention_tag_links
--   7. Index performa untuk semua tabel baru
--   8. RLS untuk semua tabel baru
--   9. Trigger auto-update untuk assessment_phase_requests
--
-- TIDAK MENGUBAH:
--   - Tabel existing apapun selain constraint NPSN di schools
--   - RLS existing (community_view_sessions, community_manage_schools, dst.)
--   - Server actions existing (createSchoolAction, createTeacherAction, dst.)
--
-- BACKWARD COMPATIBLE:
--   - Semua tabel baru bersifat additive (tidak ada tabel lama yang dihapus)
--   - Constraint NPSN: data existing tidak terpengaruh karena baris lama
--     masing-masing sudah punya community_id berbeda
-- =====================================================================================

BEGIN;

-- ============================================================
-- BAGIAN 0: VALIDASI PRE-FLIGHT
-- Pastikan dependency ada sebelum melanjutkan
-- ============================================================
DO $$
BEGIN
  -- Cek apakah question_categories ada (diperlukan FK di assessment_phase_requests)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'question_categories'
      AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Tabel question_categories tidak ditemukan! Jalankan migrasi ADD_QUESTION_LEVELS.sql terlebih dahulu.';
  END IF;

  -- Cek apakah communities ada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'communities'
      AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Tabel communities tidak ditemukan!';
  END IF;

  -- Cek apakah fungsi jwt_user_role() ada
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'jwt_user_role'
  ) THEN
    RAISE EXCEPTION 'Fungsi jwt_user_role() tidak ditemukan! Jalankan 20250613000002_rls_policies.sql terlebih dahulu.';
  END IF;

  RAISE NOTICE 'Pre-flight check selesai. Melanjutkan migrasi...';
END $$;

-- ============================================================
-- BAGIAN 1: FIX CONSTRAINT NPSN
-- Ubah dari UNIQUE global → UNIQUE per (community_id, npsn)
-- Setelah ini, 2 komunitas berbeda boleh upload sekolah dengan NPSN yang sama
-- Masing-masing akan tersimpan sebagai row terpisah dengan community_id berbeda
-- ============================================================

-- Drop constraint global lama & constraint baru (jika sudah pernah dijalankan sebagian)
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_npsn_key;
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS unique_npsn_per_community;

-- Tambah constraint baru: unik per (community_id, npsn)
-- Catatan: NULL NPSN tidak dianggap duplikat (default behavior PostgreSQL)
ALTER TABLE public.schools
  ADD CONSTRAINT unique_npsn_per_community
  UNIQUE (community_id, npsn);

-- Index untuk pencarian NPSN lintas komunitas (dipakai Super Admin)
CREATE INDEX IF NOT EXISTS idx_schools_npsn ON public.schools(npsn);

-- ============================================================
-- BAGIAN 2: TABEL assessment_phase_requests
-- Workflow pengajuan fase asesmen dari komunitas ke Super Admin
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessment_phase_requests (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  community_id        uuid        NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  category_id         uuid        NOT NULL REFERENCES public.question_categories(id) ON DELETE RESTRICT,
  -- Nama fase bebas, misal "Fase 1 - Semester Ganjil 2026"
  phase               text        NOT NULL,
  -- Array UUID sekolah yang dituju (divalidasi di server action: semua harus milik community_id)
  target_school_ids   uuid[]      NOT NULL,
  valid_from          timestamptz NOT NULL,
  valid_until         timestamptz NOT NULL,
  status              text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by        uuid        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewed_by         uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  rejection_reason    text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT assessment_phase_requests_pkey PRIMARY KEY (id),
  CONSTRAINT valid_date_range CHECK (valid_until > valid_from)
);

COMMENT ON TABLE public.assessment_phase_requests IS
  'Pengajuan fase asesmen oleh admin komunitas ke Super Admin untuk persetujuan. '
  'Setelah disetujui, sistem otomatis membuat assessment_access + school_assessment_stages.';

-- ============================================================
-- BAGIAN 3: TABEL school_assessment_stages
-- Tracker posisi 5-tahap timeline asesmen per (sekolah, fase, komunitas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.school_assessment_stages (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  school_id           uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  community_id        uuid        NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  -- Nama fase cocok 1:1 dengan assessment_phase_requests.phase
  phase               text        NOT NULL,
  current_stage       text        NOT NULL DEFAULT 'persiapan_akun'
    CHECK (current_stage IN (
      'persiapan_akun',   -- Tahap 1: Setup akun sekolah/guru/siswa
      'pengajuan_fase',   -- Tahap 2: Persiapan selesai, siap diajukan ke Super Admin
      'proses_asesmen',   -- Tahap 3: Akses aktif, siswa sedang mengerjakan ujian
      'intervensi',       -- Tahap 4: Asesmen selesai, menunggu laporan intervensi
      'selesai'           -- Tahap 5: Intervensi disubmit, siklus ini selesai
    )),
  -- FK ke pengajuan yang menciptakan stage ini
  phase_request_id    uuid        REFERENCES public.assessment_phase_requests(id) ON DELETE SET NULL,
  stage_updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT school_assessment_stages_pkey PRIMARY KEY (id),
  -- 1 sekolah + 1 fase + 1 komunitas = 1 baris — tidak boleh duplikat
  CONSTRAINT unique_school_phase_community UNIQUE (school_id, phase, community_id)
);

COMMENT ON TABLE public.school_assessment_stages IS
  'Tracker posisi 5-tahap timeline asesmen per kombinasi (sekolah, fase, komunitas). '
  'Karena school_id sudah terikat ke 1 community_id lewat schools.community_id, '
  'constraint UNIQUE (school_id, phase, community_id) secara implisit juga aman.';

-- ============================================================
-- BAGIAN 4: TABEL interventions
-- Laporan narasi intervensi pasca-asesmen, 1 baris per fase per sekolah
-- ============================================================
CREATE TABLE IF NOT EXISTS public.interventions (
  id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
  school_id               uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  community_id            uuid        NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  -- Harus cocok dengan school_assessment_stages.phase
  phase                   text        NOT NULL,
  -- FK ke stage yang memicu pengisian intervensi ini
  stage_id                uuid        REFERENCES public.school_assessment_stages(id) ON DELETE SET NULL,
  -- 4 field narasi wajib
  kondisi_awal            text        NOT NULL,
  upaya_dilakukan         text        NOT NULL,
  perubahan_signifikan    text        NOT NULL,
  alasan_bermakna         text        NOT NULL,
  submitted_by            uuid        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT interventions_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.interventions IS
  'Laporan narasi intervensi per siklus asesmen. '
  'Tiap fase menghasilkan row baru — histori tidak saling menimpa.';

-- ============================================================
-- BAGIAN 5: TABEL intervention_tags
-- Taksonomi tag bebas untuk knowledge graph intervensi
-- ============================================================
CREATE TABLE IF NOT EXISTS public.intervention_tags (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  created_by  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT intervention_tags_pkey PRIMARY KEY (id),
  -- Nama tag harus unik secara global (case-sensitive)
  CONSTRAINT unique_tag_name UNIQUE (name)
);

COMMENT ON TABLE public.intervention_tags IS
  'Daftar tag/tema untuk knowledge graph intervensi. '
  'Komunitas bebas buat tag baru dari UI. Nama unik secara global.';

-- ============================================================
-- BAGIAN 6: TABEL intervention_tag_links
-- Junction table: interventions ↔ intervention_tags (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.intervention_tag_links (
  intervention_id uuid NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  tag_id          uuid NOT NULL REFERENCES public.intervention_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (intervention_id, tag_id)
);

COMMENT ON TABLE public.intervention_tag_links IS
  'Relasi many-to-many: 1 intervensi boleh punya banyak tag, 1 tag boleh dipasang ke banyak intervensi. '
  'CASCADE delete ke keduanya.';

-- ============================================================
-- BAGIAN 7: INDEX PERFORMA
-- Semua menggunakan IF NOT EXISTS — aman dijalankan ulang
-- ============================================================

-- assessment_phase_requests
CREATE INDEX IF NOT EXISTS idx_phase_requests_community
  ON public.assessment_phase_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_phase_requests_status
  ON public.assessment_phase_requests(status);
CREATE INDEX IF NOT EXISTS idx_phase_requests_category
  ON public.assessment_phase_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_phase_requests_status_community
  ON public.assessment_phase_requests(status, community_id);

-- school_assessment_stages
CREATE INDEX IF NOT EXISTS idx_stages_school
  ON public.school_assessment_stages(school_id);
CREATE INDEX IF NOT EXISTS idx_stages_community
  ON public.school_assessment_stages(community_id);
CREATE INDEX IF NOT EXISTS idx_stages_current_stage
  ON public.school_assessment_stages(current_stage);
CREATE INDEX IF NOT EXISTS idx_stages_phase_request
  ON public.school_assessment_stages(phase_request_id);
CREATE INDEX IF NOT EXISTS idx_stages_community_stage
  ON public.school_assessment_stages(community_id, current_stage);

-- interventions
CREATE INDEX IF NOT EXISTS idx_interventions_school
  ON public.interventions(school_id);
CREATE INDEX IF NOT EXISTS idx_interventions_community
  ON public.interventions(community_id);
CREATE INDEX IF NOT EXISTS idx_interventions_stage
  ON public.interventions(stage_id);

-- intervention_tag_links
CREATE INDEX IF NOT EXISTS idx_tag_links_intervention
  ON public.intervention_tag_links(intervention_id);
CREATE INDEX IF NOT EXISTS idx_tag_links_tag
  ON public.intervention_tag_links(tag_id);

-- ============================================================
-- BAGIAN 8: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ─── assessment_phase_requests ───────────────────────────────────────────────
ALTER TABLE public.assessment_phase_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_all_phase_requests" ON public.assessment_phase_requests;
CREATE POLICY "super_admin_all_phase_requests"
  ON public.assessment_phase_requests FOR ALL
  USING (public.jwt_user_role() = 'super_admin');

-- Komunitas hanya bisa CRUD milik mereka sendiri
DROP POLICY IF EXISTS "community_manage_own_phase_requests" ON public.assessment_phase_requests;
CREATE POLICY "community_manage_own_phase_requests"
  ON public.assessment_phase_requests FOR ALL
  USING (
    public.jwt_user_role() = 'community'
    AND community_id = public.jwt_community_id()
  )
  WITH CHECK (
    public.jwt_user_role() = 'community'
    AND community_id = public.jwt_community_id()
  );

-- ─── school_assessment_stages ────────────────────────────────────────────────
ALTER TABLE public.school_assessment_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_all_stages" ON public.school_assessment_stages;
CREATE POLICY "super_admin_all_stages"
  ON public.school_assessment_stages FOR ALL
  USING (public.jwt_user_role() = 'super_admin');

-- Komunitas bisa CRUD stages milik mereka
DROP POLICY IF EXISTS "community_manage_own_stages" ON public.school_assessment_stages;
CREATE POLICY "community_manage_own_stages"
  ON public.school_assessment_stages FOR ALL
  USING (
    public.jwt_user_role() = 'community'
    AND community_id = public.jwt_community_id()
  )
  WITH CHECK (
    public.jwt_user_role() = 'community'
    AND community_id = public.jwt_community_id()
  );

-- Sekolah/guru bisa lihat stages sekolah mereka (read-only)
DROP POLICY IF EXISTS "school_view_own_stages" ON public.school_assessment_stages;
CREATE POLICY "school_view_own_stages"
  ON public.school_assessment_stages FOR SELECT
  USING (
    public.jwt_user_role() IN ('school', 'teacher')
    AND school_id = public.jwt_school_id()
  );

-- ─── interventions ───────────────────────────────────────────────────────────
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_all_interventions" ON public.interventions;
CREATE POLICY "super_admin_all_interventions"
  ON public.interventions FOR ALL
  USING (public.jwt_user_role() = 'super_admin');

-- Komunitas bisa CRUD interventions milik mereka
DROP POLICY IF EXISTS "community_manage_own_interventions" ON public.interventions;
CREATE POLICY "community_manage_own_interventions"
  ON public.interventions FOR ALL
  USING (
    public.jwt_user_role() = 'community'
    AND community_id = public.jwt_community_id()
  )
  WITH CHECK (
    public.jwt_user_role() = 'community'
    AND community_id = public.jwt_community_id()
  );

-- Sekolah/guru bisa lihat intervensi untuk sekolah mereka (read-only)
DROP POLICY IF EXISTS "school_view_own_interventions" ON public.interventions;
CREATE POLICY "school_view_own_interventions"
  ON public.interventions FOR SELECT
  USING (
    public.jwt_user_role() IN ('school', 'teacher')
    AND school_id = public.jwt_school_id()
  );

-- ─── intervention_tags ───────────────────────────────────────────────────────
ALTER TABLE public.intervention_tags ENABLE ROW LEVEL SECURITY;

-- Semua role authenticated bisa baca (untuk combobox tag selector di form intervensi)
DROP POLICY IF EXISTS "authenticated_read_intervention_tags" ON public.intervention_tags;
CREATE POLICY "authenticated_read_intervention_tags"
  ON public.intervention_tags FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Komunitas bisa membuat tag baru bebas
DROP POLICY IF EXISTS "community_insert_tags" ON public.intervention_tags;
CREATE POLICY "community_insert_tags"
  ON public.intervention_tags FOR INSERT
  WITH CHECK (
    public.jwt_user_role() IN ('super_admin', 'community')
    AND auth.uid() IS NOT NULL
  );

-- Hanya Super Admin yang bisa UPDATE/DELETE tag (menjaga integritas knowledge graph)
DROP POLICY IF EXISTS "super_admin_manage_tags" ON public.intervention_tags;
CREATE POLICY "super_admin_manage_tags"
  ON public.intervention_tags FOR UPDATE
  USING (public.jwt_user_role() = 'super_admin');

DROP POLICY IF EXISTS "super_admin_delete_tags" ON public.intervention_tags;
CREATE POLICY "super_admin_delete_tags"
  ON public.intervention_tags FOR DELETE
  USING (public.jwt_user_role() = 'super_admin');

-- ─── intervention_tag_links ──────────────────────────────────────────────────
ALTER TABLE public.intervention_tag_links ENABLE ROW LEVEL SECURITY;

-- Komunitas bisa kelola tag_links untuk intervensi milik mereka
DROP POLICY IF EXISTS "community_manage_own_tag_links" ON public.intervention_tag_links;
CREATE POLICY "community_manage_own_tag_links"
  ON public.intervention_tag_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.interventions i
      WHERE i.id = intervention_id
        AND (
          public.jwt_user_role() = 'super_admin'
          OR (
            public.jwt_user_role() = 'community'
            AND i.community_id = public.jwt_community_id()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interventions i
      WHERE i.id = intervention_id
        AND (
          public.jwt_user_role() = 'super_admin'
          OR (
            public.jwt_user_role() = 'community'
            AND i.community_id = public.jwt_community_id()
          )
        )
    )
  );

-- Sekolah/guru bisa lihat tag_links untuk intervensi sekolah mereka
DROP POLICY IF EXISTS "school_view_tag_links" ON public.intervention_tag_links;
CREATE POLICY "school_view_tag_links"
  ON public.intervention_tag_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interventions i
      WHERE i.id = intervention_id
        AND public.jwt_user_role() IN ('school', 'teacher')
        AND i.school_id = public.jwt_school_id()
    )
  );

-- ============================================================
-- BAGIAN 9: TRIGGER auto-update updated_at
-- Reuse fungsi update_updated_at() dari initial_schema.sql
-- ============================================================
DROP TRIGGER IF EXISTS trg_assessment_phase_requests_updated_at ON public.assessment_phase_requests;
CREATE TRIGGER trg_assessment_phase_requests_updated_at
  BEFORE UPDATE ON public.assessment_phase_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;

-- ============================================================
-- QUERY VERIFIKASI (jalankan SETELAH COMMIT di SQL Editor)
-- ============================================================
/*
-- 1. Cek constraint NPSN
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'schools' AND constraint_type = 'UNIQUE'
ORDER BY constraint_name;
-- Expected: ada 'unique_npsn_per_community', TIDAK ada 'schools_npsn_key'

-- 2. Cek semua tabel baru ada
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'assessment_phase_requests', 'school_assessment_stages',
    'interventions', 'intervention_tags', 'intervention_tag_links'
  )
ORDER BY table_name;
-- Expected: 5 baris

-- 3. Cek RLS enabled di semua tabel baru
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'assessment_phase_requests', 'school_assessment_stages',
    'interventions', 'intervention_tags', 'intervention_tag_links'
  )
ORDER BY tablename;
-- Expected: rowsecurity = true untuk semua

-- 4. Cek jumlah policy per tabel baru
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'assessment_phase_requests', 'school_assessment_stages',
    'interventions', 'intervention_tags', 'intervention_tag_links'
  )
ORDER BY tablename, policyname;

-- 5. Cek trigger baru
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trg_assessment_phase_requests_updated_at';
-- Expected: 1 baris
*/
