# Implementation Plan - Sistem Pemantik v2.1
> Dokumen ini adalah rencana implementasi end-to-end berdasarkan analisis menyeluruh sistem yang berjalan saat ini. Urutan prioritas dari yang paling kritis (keamanan) hingga fitur.

---

## Ringkasan Temuan Masalah

| # | Masalah | Tingkat Risiko | Prioritas |
|---|---------|---------------|-----------|
| 1 | Token JWT siswa adalah string palsu, bukan JWT valid | 🔴 KRITIS | P1 |
| 2 | RLS siswa berbasis `anon` - tidak ada isolasi antar siswa | 🔴 KRITIS | P1 |
| 3 | Komunitas punya `ALL` permission di `assessment_access` | 🟠 TINGGI | P2 |
| 4 | `assessment_sessions` tidak punya `access_id` → laporan tidak bisa dibangun | 🟠 TINGGI | P2 |
| 5 | `assessment_sessions` tidak punya `current_level_id` → adaptive level tidak bisa ditrack | 🟡 SEDANG | P3 |
| 6 | Alur distribusi akses komunitas → sekolah belum terdefinisi jelas di backend | 🟡 SEDANG | P3 |
| 7 | Laporan & export Excel belum ada query foundation-nya | 🟢 RENDAH | P4 |

---

## PRIORITAS 1 - Perbaikan Autentikasi & RLS Siswa (KRITIS)

### Masalah Saat Ini

Di Edge Function `authenticate-student/index.ts`, token yang di-generate adalah:

```typescript
const token = `jwt_${student.id}_${Date.now()}`; // ← INI BUKAN JWT
```

Ini adalah string biasa, bukan JWT yang bisa divalidasi Supabase. Akibatnya:
- Supabase tidak bisa membaca claims dari token ini
- Semua request dari Flutter tetap dianggap `anon` oleh Supabase
- RLS policy `auth.role() = 'anon'` berlaku untuk **semua orang yang belum login**, bukan hanya siswa
- Tidak ada isolasi data antar siswa - siswa A bisa baca jawaban siswa B

### Solusi: Generate JWT Valid dengan Custom Claims

Edge Function harus generate JWT yang ditandatangani dengan `SUPABASE_JWT_SECRET`, sehingga Supabase bisa membaca custom claims-nya untuk RLS.

#### 1A. Update Edge Function `authenticate-student/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, pin } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Cari data siswa
    const { data: student, error } = await supabase
      .from("students")
      .select(`
        id, pin_hash, full_name, is_active, school_id, class_id,
        username, nisn, gender, ses_class,
        schools(name, community_id),
        classes(name)
      `)
      .eq("username", username)
      .eq("is_active", true)
      .single();

    if (error || !student) {
      return new Response(
        JSON.stringify({ error: "Nama pengguna tidak ditemukan atau tidak aktif" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifikasi PIN
    const isValid = await bcrypt.compare(pin, student.pin_hash);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "PIN yang dimasukkan salah" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ambil community_id dari relasi sekolah
    const communityId = (student.schools as any)?.community_id ?? null;

    // Generate JWT valid dengan custom claims yang bisa dibaca RLS
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? "";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const payload = {
      // Claims standar JWT
      sub: student.id,           // subject = student ID
      iat: getNumericDate(0),    // issued at
      exp: getNumericDate(60 * 60 * 24 * 7), // expired 7 hari
      
      // Custom claims untuk RLS
      role: "anon",              // tetap anon agar Supabase tidak bingung
      user_role: "student",      // custom claim untuk RLS siswa
      student_id: student.id,
      school_id: student.school_id,
      class_id: student.class_id,
      community_id: communityId,
    };

    const token = await create({ alg: "HS256", typ: "JWT" }, payload, key);

    // Hapus pin_hash dari response
    const { pin_hash, ...studentData } = student;

    return new Response(
      JSON.stringify({ token, student: studentData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Terjadi kesalahan internal server",
        details: err instanceof Error ? err.message : String(err)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

#### 1B. Buat Helper Functions JWT untuk RLS Siswa

Jalankan di Supabase SQL Editor:

```sql
-- Fungsi untuk membaca student_id dari JWT custom claims
CREATE OR REPLACE FUNCTION jwt_student_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'student_id',
    ''
  )::uuid
$$;

-- Fungsi untuk membaca user_role dari JWT (handle siswa dan admin)
CREATE OR REPLACE FUNCTION jwt_user_role_extended()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'user_role',
    current_setting('request.jwt.claims', true)::jsonb ->> 'role'
  )
$$;
```

#### 1C. Update RLS Policy untuk Siswa

```sql
-- ============================================================
-- HAPUS policy lama yang berbasis anon (berbahaya)
-- ============================================================
DROP POLICY IF EXISTS student_view_access ON assessment_access;
DROP POLICY IF EXISTS student_manage_sessions ON assessment_sessions;
DROP POLICY IF EXISTS student_manage_answers ON student_answers;
DROP POLICY IF EXISTS student_view_categories ON question_categories;
DROP POLICY IF EXISTS student_view_levels ON question_levels;
DROP POLICY IF EXISTS student_view_questions ON questions;

-- ============================================================
-- BUAT policy baru berbasis student_id dari JWT claims
-- ============================================================

-- assessment_access: siswa lihat akses yang valid untuk sekolahnya
CREATE POLICY student_view_access ON assessment_access
  FOR SELECT
  USING (
    jwt_user_role_extended() = 'student'
    AND is_active = true
    AND (
      (target_type = 'school' AND target_id = jwt_school_id())
      OR (target_type = 'community' AND target_id = (
        SELECT community_id FROM schools WHERE id = jwt_school_id()
      ))
    )
    AND valid_from <= now()
    AND valid_until >= now()
  );

-- assessment_sessions: siswa hanya bisa akses sesi miliknya sendiri
CREATE POLICY student_manage_own_sessions ON assessment_sessions
  FOR ALL
  USING (
    jwt_user_role_extended() = 'student'
    AND student_id = jwt_student_id()
  )
  WITH CHECK (
    jwt_user_role_extended() = 'student'
    AND student_id = jwt_student_id()
  );

-- student_answers: siswa hanya bisa akses jawaban miliknya sendiri
CREATE POLICY student_manage_own_answers ON student_answers
  FOR ALL
  USING (
    jwt_user_role_extended() = 'student'
    AND session_id IN (
      SELECT id FROM assessment_sessions
      WHERE student_id = jwt_student_id()
    )
  )
  WITH CHECK (
    jwt_user_role_extended() = 'student'
    AND session_id IN (
      SELECT id FROM assessment_sessions
      WHERE student_id = jwt_student_id()
    )
  );

-- question_categories, levels, questions: siswa bisa lihat semua yang published
CREATE POLICY student_view_categories ON question_categories
  FOR SELECT
  USING (jwt_user_role_extended() = 'student');

CREATE POLICY student_view_levels ON question_levels
  FOR SELECT
  USING (jwt_user_role_extended() = 'student');

CREATE POLICY student_view_questions ON questions
  FOR SELECT
  USING (
    jwt_user_role_extended() = 'student'
    AND is_published = true
  );
```

#### 1D. Update Flutter - Cara Pakai Token Baru

Di Flutter, setelah dapat token dari Edge Function, gunakan token tersebut sebagai Authorization header untuk semua request Supabase:

```dart
// Di auth_provider.dart atau supabase_config.dart
// Setelah login berhasil, set token ke Supabase client

final response = await SupabaseConfig.client.functions.invoke(
  'authenticate-student',
  body: {'username': username, 'pin': pin},
);

final token = response.data['token'];
final student = response.data['student'];

// Set custom JWT ke Supabase client agar RLS bisa membaca claims
await SupabaseConfig.client.auth.setSession(token);
// ATAU jika tidak bisa setSession, gunakan custom header di setiap request:
// headers: {'Authorization': 'Bearer $token'}

// Simpan ke local storage untuk persistensi
await secureStorage.write(key: 'student_token', value: token);
await secureStorage.write(key: 'student_data', value: jsonEncode(student));
```

---

## PRIORITAS 2 - Perbaikan Struktur Data & Permission

### 2A. Perbaiki Permission Komunitas di `assessment_access`

Sekarang komunitas punya `ALL` (bisa UPDATE/DELETE akses yang dibuat Super Admin). Harus dipisah:

```sql
-- Hapus policy lama
DROP POLICY IF EXISTS admin_community_manage_access ON assessment_access;

-- Super Admin: full control
CREATE POLICY super_admin_manage_access ON assessment_access
  FOR ALL
  USING (jwt_user_role() = 'super_admin');

-- Komunitas: hanya SELECT untuk akses yang masuk ke mereka atau sekolah binaannya
CREATE POLICY community_view_own_access ON assessment_access
  FOR SELECT
  USING (
    jwt_user_role() = 'community'
    AND (
      (target_type = 'community' AND target_id = jwt_community_id())
      OR (target_type = 'school' AND target_id IN (
        SELECT id FROM schools WHERE community_id = jwt_community_id()
      ))
    )
  );

-- Komunitas: boleh INSERT untuk mendistribusikan akses ke sekolah binaannya
-- TAPI hanya dalam rentang waktu yang sudah ditetapkan Super Admin
-- Validasi rentang waktu dilakukan di Server Action, bukan di RLS
CREATE POLICY community_distribute_access ON assessment_access
  FOR INSERT
  WITH CHECK (
    jwt_user_role() = 'community'
    AND target_type = 'school'
    AND target_id IN (
      SELECT id FROM schools WHERE community_id = jwt_community_id()
    )
  );
```

### 2B. Tambah Kolom di `assessment_sessions`

```sql
-- Tambah kolom access_id untuk mengikat sesi ke akses ujian spesifik
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS access_id uuid REFERENCES assessment_access(id) ON DELETE SET NULL;

-- Tambah kolom current_level_id untuk tracking posisi level adaptive
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS current_level_id uuid REFERENCES question_levels(id) ON DELETE SET NULL;

-- Index untuk performa query laporan
CREATE INDEX IF NOT EXISTS idx_sessions_access_id ON assessment_sessions(access_id);
CREATE INDEX IF NOT EXISTS idx_sessions_current_level ON assessment_sessions(current_level_id);

-- Backfill: update data lama yang sudah ada
-- (data lama tidak punya access_id, biarkan NULL - tidak merusak data existing)
-- Tidak perlu backfill karena laporan hanya akan filter sesi yang punya access_id
```

### 2C. Tambah Index untuk Performa Query Laporan

```sql
-- Index untuk query laporan yang sering JOIN berantai
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON assessment_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_school_id ON assessment_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_sessions_category_id ON assessment_sessions(category_id);
CREATE INDEX IF NOT EXISTS idx_answers_session_id ON student_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
```

---

## PRIORITAS 3 - Alur Distribusi Akses & Adaptive Level

### 3A. Alur Distribusi Akses (Super Admin → Komunitas → Sekolah)

Ini diimplementasikan di **Server Actions** di Next.js, bukan di level database.

#### Flow lengkap:

```
[Super Admin]
  → Buat assessment_access:
    {target_type: 'community', target_id: komunitas_A, phase: 'Tahap 1',
     valid_from: '2025-01-01', valid_until: '2025-01-31', category_id: xxx}

[Komunitas A - halaman distribusi]
  → Lihat daftar akses masuk (SELECT assessment_access WHERE target_type='community')
  → Pilih: distribusi ke SEMUA sekolah / pilih beberapa sekolah
  → Klik "Distribusikan"
  → Server Action dipanggil:
    - Validasi: komunitas hanya bisa distribusi dalam rentang waktu Super Admin
    - Validasi: sekolah yang dipilih harus bagian dari komunitas ini
    - INSERT rows baru untuk tiap sekolah yang dipilih:
      {target_type: 'school', target_id: sekolah_X, phase: 'Tahap 1',
       valid_from: SAMA dengan parent, valid_until: SAMA dengan parent,
       category_id: SAMA dengan parent, granted_by: community_user_id}

[Sekolah X]
  → SELECT assessment_access WHERE target_type='school' AND target_id=sekolah_X
  → Tampilkan paket aktif + valid waktunya

[Siswa di Sekolah X - saat login]
  → Validasi akses: cek assessment_access untuk school_id siswa
  → Download soal dari category_id yang aktif
  → INSERT assessment_sessions:
    {student_id, school_id, category_id, access_id, current_level_id: level_1_id,
     status: 'in_progress', attempt_number: 1}
```

#### Server Action untuk distribusi (Next.js):

```typescript
// apps/web/src/app/actions/assessment-access.ts

export async function distributeAccessToSchools(
  parentAccessId: string,
  schoolIds: string[], // 'all' atau array ID sekolah tertentu
  communityId: string
) {
  const supabase = createServerClient();

  // 1. Ambil data parent access
  const { data: parentAccess } = await supabase
    .from('assessment_access')
    .select('*')
    .eq('id', parentAccessId)
    .eq('target_type', 'community')
    .eq('target_id', communityId)
    .single();

  if (!parentAccess) throw new Error('Akses tidak ditemukan atau tidak valid');

  // 2. Tentukan sekolah yang akan dapat akses
  let targetSchools = schoolIds;
  if (schoolIds[0] === 'all') {
    const { data: schools } = await supabase
      .from('schools')
      .select('id')
      .eq('community_id', communityId)
      .eq('is_active', true);
    targetSchools = schools?.map(s => s.id) ?? [];
  }

  // 3. Validasi semua sekolah adalah binaan komunitas ini
  const { data: validSchools } = await supabase
    .from('schools')
    .select('id')
    .eq('community_id', communityId)
    .in('id', targetSchools);

  if (validSchools?.length !== targetSchools.length) {
    throw new Error('Beberapa sekolah tidak termasuk dalam komunitas ini');
  }

  // 4. Insert rows akses untuk tiap sekolah
  const accessRows = targetSchools.map(schoolId => ({
    target_type: 'school',
    target_id: schoolId,
    phase: parentAccess.phase,
    category_id: parentAccess.category_id,
    valid_from: parentAccess.valid_from,    // TIDAK BISA DIUBAH
    valid_until: parentAccess.valid_until,  // TIDAK BISA DIUBAH
    max_attempts: parentAccess.max_attempts,
    is_active: true,
    granted_by: (await supabase.auth.getUser()).data.user?.id,
  }));

  const { error } = await supabase
    .from('assessment_access')
    .upsert(accessRows, {
      onConflict: 'target_type,target_id,category_id,phase', // hindari duplikat
      ignoreDuplicates: false
    });

  if (error) throw error;

  return { success: true, distributed_to: targetSchools.length };
}
```

### 3B. Alur Adaptive Level dalam Satu Sesi

Logika ini diimplementasikan di Flutter (mobile) dengan sync ke Supabase.

```
[Siswa mulai sesi]
  INSERT assessment_sessions:
  { student_id, school_id, category_id, access_id,
    current_level_id: level_pertama,
    status: 'in_progress', started_at: now() }

[Siswa jawab soal per level]
  INSERT/UPDATE local_answers (SQLite lokal dulu)
  Sync ke student_answers saat online

[Siswa selesai satu level]
  1. Hitung skor level ini dari student_answers
  2. Ambil passing_threshold dari question_levels
  3. Bandingkan:
     - Skor >= passing_threshold?
         YA  → cek apakah ada level berikutnya (level_number + 1)
               ADA  → UPDATE assessment_sessions SET current_level_id = level_berikutnya
               TIDAK → ini level terakhir, sesi selesai
         TIDAK → sesi selesai di level ini (tidak naik)
  4. Jika sesi selesai:
     UPDATE assessment_sessions SET:
       status = 'completed',
       completed_at = now(),
       score = total_skor_semua_level,
       time_spent_sec = total_waktu
```

#### Fungsi Supabase (dipanggil dari Flutter):

```sql
-- Fungsi untuk cek dan advance level
CREATE OR REPLACE FUNCTION advance_student_level(
  p_session_id uuid,
  p_current_level_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_session assessment_sessions%ROWTYPE;
  v_current_level question_levels%ROWTYPE;
  v_next_level question_levels%ROWTYPE;
  v_level_score numeric;
  v_result jsonb;
BEGIN
  -- Ambil data sesi
  SELECT * INTO v_session FROM assessment_sessions WHERE id = p_session_id;
  
  -- Ambil data level saat ini
  SELECT * INTO v_current_level FROM question_levels WHERE id = p_current_level_id;
  
  -- Hitung skor level ini
  SELECT COALESCE(AVG(CASE WHEN is_correct THEN 100 ELSE 0 END), 0)
  INTO v_level_score
  FROM student_answers sa
  JOIN questions q ON q.id = sa.question_id
  WHERE sa.session_id = p_session_id
    AND q.level_id = p_current_level_id;

  -- Cek apakah ada level berikutnya
  SELECT * INTO v_next_level
  FROM question_levels
  WHERE category_id = v_current_level.category_id
    AND level_number = v_current_level.level_number + 1;

  -- Logika advance atau selesai
  IF v_level_score >= v_current_level.passing_threshold AND v_next_level.id IS NOT NULL THEN
    -- Naik ke level berikutnya
    UPDATE assessment_sessions
    SET current_level_id = v_next_level.id
    WHERE id = p_session_id;
    
    v_result := jsonb_build_object(
      'action', 'advance',
      'next_level_id', v_next_level.id,
      'next_level_number', v_next_level.level_number,
      'level_score', v_level_score
    );
  ELSE
    -- Sesi selesai
    UPDATE assessment_sessions
    SET status = 'completed',
        completed_at = now()
    WHERE id = p_session_id;
    
    v_result := jsonb_build_object(
      'action', 'complete',
      'final_level', v_current_level.level_number,
      'level_score', v_level_score,
      'reason', CASE 
        WHEN v_level_score < v_current_level.passing_threshold THEN 'below_threshold'
        ELSE 'last_level_completed'
      END
    );
  END IF;

  RETURN v_result;
END;
$$;
```

---

## PRIORITAS 4 - Laporan & Export Excel

### 4A. Query Foundation untuk Laporan

Query utama yang menjadi dasar semua laporan. RLS otomatis memfilter sesuai role peminta.

```sql
-- View untuk laporan lengkap (dibuat sebagai VIEW untuk kemudahan)
CREATE OR REPLACE VIEW v_assessment_report AS
SELECT
  -- Data akses ujian
  aa.id           AS access_id,
  aa.phase,
  aa.valid_from,
  aa.valid_until,
  aa.category_id,
  qc.name         AS category_name,
  qc.subject_area,

  -- Data hierarki
  c.id            AS community_id,
  c.name          AS community_name,
  sc.id           AS school_id,
  sc.name         AS school_name,
  sc.npsn,
  sc.province,
  sc.city,

  -- Data kelas & guru
  cl.id           AS class_id,
  cl.name         AS class_name,
  cl.grade,
  u.id            AS teacher_id,
  u.full_name     AS teacher_name,

  -- Data siswa
  st.id           AS student_id,
  st.full_name    AS student_name,
  st.username     AS student_username,
  st.nisn,
  st.gender,
  st.birth_date,
  st.ses_class,
  st.ses_score,

  -- Data sesi
  ses.id          AS session_id,
  ses.status      AS session_status,
  ses.started_at,
  ses.completed_at,
  ses.score       AS final_score,
  ses.time_spent_sec,
  ses.attempt_number,
  ses.is_void,
  ses.current_level_id,
  ql.level_number AS final_level_number,

  -- Data level yang dicapai
  ql.passing_threshold

FROM assessment_access aa
JOIN question_categories qc  ON qc.id = aa.category_id
JOIN schools sc               ON sc.id = aa.target_id AND aa.target_type = 'school'
JOIN communities c            ON c.id = sc.community_id
LEFT JOIN assessment_sessions ses ON ses.access_id = aa.id
LEFT JOIN students st         ON st.id = ses.student_id
LEFT JOIN classes cl          ON cl.id = st.class_id
LEFT JOIN users u             ON u.id = cl.teacher_id
LEFT JOIN question_levels ql  ON ql.id = ses.current_level_id;

-- RLS untuk view ini mengikuti RLS tabel dasarnya (assessment_access & assessment_sessions)
```

### 4B. Struktur Export Excel (4 Sheet)

Export Excel dihandle di **Next.js API Route** menggunakan library `xlsx` (SheetJS).

```typescript
// apps/web/src/app/api/export/assessment/route.ts

import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get('phase') ?? 'Tahap 1';
  const categoryId = searchParams.get('category_id');

  const supabase = createServerClient(); // pakai cookie auth user yang request

  // Query data laporan (RLS otomatis filter sesuai role)
  const { data: reportData } = await supabase
    .from('v_assessment_report')
    .select('*')
    .eq('phase', phase)
    .eq(categoryId ? 'category_id' : 'phase', categoryId ?? phase);

  // Query detail jawaban
  const sessionIds = [...new Set(reportData?.map(r => r.session_id).filter(Boolean))];
  const { data: answers } = await supabase
    .from('student_answers')
    .select('*, questions(question_text, level_id, question_levels(level_number))')
    .in('session_id', sessionIds);

  const wb = XLSX.utils.book_new();

  // ── SHEET 1: Ringkasan per Sekolah ──────────────────────────────
  const sheet1Data = groupBySchool(reportData).map(school => ({
    'Komunitas'         : school.community_name,
    'Sekolah'           : school.school_name,
    'NPSN'              : school.npsn,
    'Provinsi'          : school.province,
    'Kota'              : school.city,
    'Jumlah Siswa'      : school.total_students,
    'Siswa Selesai'     : school.completed_students,
    'Rata-rata Skor'    : school.avg_score?.toFixed(2),
    'Level Tertinggi'   : school.max_level,
    '% Lulus'           : school.pass_rate?.toFixed(1) + '%',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1Data), 'Ringkasan Sekolah');

  // ── SHEET 2: Data Siswa Lengkap ──────────────────────────────────
  const sheet2Data = reportData?.map(row => ({
    'Komunitas'         : row.community_name,
    'Sekolah'           : row.school_name,
    'Kelas'             : row.class_name,
    'Guru'              : row.teacher_name,
    'Nama Siswa'        : row.student_name,
    'Username'          : row.student_username,
    'NISN'              : row.nisn,
    'Gender'            : row.gender,
    'Tanggal Lahir'     : row.birth_date,
    'SES Class'         : row.ses_class,
    'SES Score'         : row.ses_score,
    'Status Ujian'      : row.session_status,
    'Skor Akhir'        : row.final_score,
    'Level Dicapai'     : row.final_level_number,
    'Waktu (detik)'     : row.time_spent_sec,
    'Percobaan ke'      : row.attempt_number,
    'Mulai'             : row.started_at,
    'Selesai'           : row.completed_at,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2Data ?? []), 'Data Siswa');

  // ── SHEET 3: Hasil per Level ─────────────────────────────────────
  // Satu baris = satu siswa × satu level
  const sheet3Data = buildPerLevelData(reportData, answers);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet3Data), 'Hasil per Level');

  // ── SHEET 4: Detail Jawaban ──────────────────────────────────────
  // Satu baris = satu siswa × satu soal
  const sheet4Data = answers?.map(ans => ({
    'Session ID'        : ans.session_id,
    'Nama Siswa'        : reportData?.find(r => r.session_id === ans.session_id)?.student_name,
    'Level'             : (ans.questions as any)?.question_levels?.level_number,
    'Soal'              : (ans.questions as any)?.question_text,
    'Jawaban'           : JSON.stringify(ans.answer_data),
    'Benar'             : ans.is_correct ? 'Ya' : 'Tidak',
    'Skor'              : ans.score,
    'Waktu (detik)'     : ans.time_spent_sec,
    'Ada Rekaman'       : ans.recording_url ? 'Ya' : 'Tidak',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet4Data ?? []), 'Detail Jawaban');

  // Generate buffer dan kirim sebagai file download
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="laporan_${phase}_${Date.now()}.xlsx"`,
    },
  });
}
```

---

## Urutan Implementasi yang Disarankan

```
Minggu 1 - Keamanan (P1)
  ✅ Update Edge Function authenticate-student → JWT valid
  ✅ Buat jwt_student_id() dan jwt_user_role_extended() helper functions
  ✅ Drop & recreate semua RLS policy siswa
  ✅ Update Flutter untuk pakai token baru
  ✅ Test: siswa A tidak bisa baca data siswa B

Minggu 2 - Fondasi Data (P2)
  ✅ Tambah kolom access_id dan current_level_id di assessment_sessions
  ✅ Tambah semua index untuk performa
  ✅ Perbaiki permission komunitas di assessment_access (split ALL → SELECT + INSERT)
  ✅ Test: komunitas tidak bisa edit/delete akses Super Admin

Minggu 3 - Logika Bisnis (P3)
  ✅ Buat Server Action distributeAccessToSchools
  ✅ Buat Supabase Function advance_student_level
  ✅ Update Flutter untuk pakai access_id saat INSERT sesi
  ✅ Update Flutter untuk panggil advance_student_level setelah selesai tiap level
  ✅ Test: alur distribusi end-to-end dari Super Admin → Komunitas → Sekolah → Siswa

Minggu 4 - Laporan (P4)
  ✅ Buat VIEW v_assessment_report
  ✅ Buat API Route export Excel
  ✅ Buat UI halaman laporan (kotak-kotak per fase, tombol download Excel)
  ✅ Test: setiap role hanya lihat data scope-nya sendiri
  ✅ Test: komunitas A tidak bisa lihat data komunitas B di Excel
```

---

## Catatan Penting

### Backward Compatibility
- Kolom `access_id` ditambah dengan `ON DELETE SET NULL` → data sesi lama yang tidak punya `access_id` tetap aman (nilainya `NULL`), tidak perlu migrasi data
- Laporan cukup filter `WHERE access_id IS NOT NULL` untuk hanya tampilkan sesi yang terikat ke akses ujian formal
- RLS lama di-DROP dulu sebelum dibuat yang baru - jangan jalankan keduanya bersamaan

### Testing yang Wajib Dilakukan Setelah P1
1. Login sebagai siswa A → coba akses `student_answers` siswa B → harus gagal (0 rows)
2. Login sebagai anon murni (tanpa token) → coba akses `assessment_sessions` → harus gagal
3. Login sebagai komunitas A → coba SELECT `assessment_sessions` dari komunitas B → harus 0 rows
4. Login sebagai komunitas A → coba UPDATE `assessment_access` yang dibuat Super Admin → harus gagal

### Kolom `phase` di `assessment_sessions`
Sekarang `assessment_sessions` punya kolom `phase` (text) tapi tidak ada relasi ke `assessment_access`. Dengan tambahan `access_id`, kolom `phase` di `assessment_sessions` bisa di-deprecate secara bertahap karena `phase` bisa diambil dari JOIN ke `assessment_access`. Tidak perlu dihapus sekarang, tapi jangan duplikasi pengisian datanya.