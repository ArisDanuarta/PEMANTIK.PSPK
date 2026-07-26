# TEMUAN AUDIT PUTARAN 3 MONOREPO PEMANTIK - VERIFIKASI SISTEMATIS
Tanggal Audit: 24 Juli 2026

Dokumen ini berisi hasil verifikasi putaran ketiga, yang berfokus pada penelusuran sistematis per role untuk memastikan tidak ada celah keamanan atau fungsional pada aplikasi Pemantik.

## 1. Super Admin
- **CRUD Komunitas (Cascade Delete / Restrict Blocking):** 
  - **Aman.** Berdasarkan skema tabel `schools` dan `students` di `20250613000001_initial_schema.sql`, referensi ke `community_id` dan `school_id` menggunakan klausa `ON DELETE RESTRICT`. Jika Super Admin mencoba menghapus komunitas yang memiliki sekolah, penghapusan akan diblokir oleh Postgres dan tidak ada data anak yang ikut terhapus.
- **Konfigurasi Bobot SES (RLS INSERT/UPDATE):** 
  - **Aman.** RLS pada `ses_variables` (lihat file `ADD_SES_SCHEMA.sql` baris 125) diatur menjadi `FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin')`. Di Postgres, `USING` tanpa klausa `WITH CHECK` pada policy `FOR ALL` secara otomatis meng-copy kondisinya ke `WITH CHECK`, sehingga INSERT dan UPDATE aman.
- **Notifikasi Sistem & Broadcast `needs_review`:**
  - **Aman.** Broadcast `needs_review` sudah diterapkan di Action Layer. Di file `apps/web/src/app/actions/schools.ts` (baris 1176), sistem mendeteksi komponen SES yang tidak dikenali (`needs_review`) dan langsung menginsert pemberitahuan (notifikasi) bertipe `warning` ke tabel `notifications` untuk seluruh user `super_admin` yang aktif.

## 2. Komunitas
- **Timeline Asesmen 5 Tahap (Cron Job Auto-Transition):**
  - ⚠️ **Ada Masalah (Tidak Terdaftar Otomatis).** Di dalam file `supabase/migrations/20260710170001_cron_auto_transition.sql`, seluruh logika `SELECT cron.schedule(...)` **di-comment out** dan hanya dijadikan panduan manual (baris 52). Skrip ini belum didaftarkan di Supabase, sehingga auto-transition tidak akan berjalan secara otomatis sampai admin Supabase menjalankan kueri tersebut secara manual.
- **Update Data Sekolah (Action Layer vs RLS):**
  - ⚠️ **Ada Masalah (Celah Manipulasi Komunitas).** Pada `apps/web/src/app/actions/schools.ts`, di dalam fungsi `updateSchoolAction` (baris 234), nilai `community_id` diambil mentah-mentah dari `formData`. Tidak ada *override/enforcement* yang menimpa `community_id` dengan `authCommunityId` jika *role* adalah `community` (berbeda dengan fungsi `createSchoolAction` yang menimpa input tersebut). Hal ini berisiko bagi user Komunitas untuk merubah sekolah milik mereka pindah ke luar komunitas atau pindah ke komunitas lain secara paksa.

## 3. Sekolah
- **Multi-Guru Per Kelas (Bug Cross-Check):**
  - ⚠️ **Ada Masalah (Penyebaran Bug).** Walaupun *database* sudah menggunakan relasi M:N (`class_teachers`), *codebase* front-end/server action masih kotor dengan pemakaian legacy column `classes.teacher_id`. Kutipan pemakaian hardcoded `teacher_id`:
    - `apps/web/src/app/guru/dashboard/page.tsx` baris 47 (`.eq("teacher_id", teacherId)`)
    - `apps/web/src/app/guru/kelas/page.tsx`
    - `apps/web/src/app/guru/siswa/page.tsx`
    - `apps/web/src/app/api/guru/report/route.ts` baris 25
    - Server action `updateSchoolAction` dan `classes.ts` juga masih melakukan mutasi ke `teacher_id`. 
    - Ini berarti guru kedua di dalam satu kelas tidak diakui secara sistem UI.
- **Sinkronisasi Dapodik (Background Job Resilience):**
  - ⚠️ **Ada Masalah (Resiliensi Background Job).** Pada file `schools.ts`, proses `importDapodikAction` dieksekusi secara asinkron (menggunakan blok `void (async () => { ... })();`) di dalam *serverless action* (Next.js Edge/Node runtime). Lingkungan *serverless function* (seperti Vercel) **berisiko tinggi mematikan instance** segera setelah HTTP Response terkirim (status 200 return di bawah loop asinkron tersebut). Proses ini dapat dibatalkan secara sepihak oleh platform tanpa ada jaminan `batch_id` yang sedang diimpor selesai, yang meninggalkan data Dapodik gantung.

## 4. Guru
- **Melihat Hasil Asesmen Anak Didik:**
  - ⚠️ **Ada Masalah (Data Guru Kosong).** Berhubungan dengan poin Sekolah di atas. Jika kelas diajar oleh lebih dari satu guru (multi-guru / asisten guru), halaman `dashboard`, `kelas`, dan riwayat siswa akan menampilkan state **kosong** bagi guru kedua karena query di halaman-halaman tersebut secara mutlak menggunakan `.eq("teacher_id", auth.user.id)`. Akses ini sangat bergantung pada skema data lama dan memblokir kinerja pengajar di lapangan.

## 5. Anak (Mobile Siswa - Flutter)
- **Login Offline PIN:**
  - ⚠️ **Ada Masalah (Membutuhkan Internet).** Syarat login offline yang sesungguhnya tidak terjadi di kode. Pada file `auth_provider.dart` baris 87, login memanggil Edge Function `authenticate-student` via HTTP request (`SupabaseConfig.client.functions.invoke`). Apabila perangkat tidak terhubung ke internet saat mau *login/switch account*, akan terjadi `TimeoutException`. Anak tidak bisa memulai ujian tanpa jaringan awal untuk auth.
- **Level Advancement Lokal vs Server:**
  - **Aman.** Evaluasi Dart lokal (`assessment_provider.dart` menggunakan `correctCount >= level.passingThreshold`) dan evaluasi Supabase Server (melalui fungsi RPC `advance_student_level` yang memvalidasi `SUM(sa.is_correct) >= v_current_level.passing_threshold`) menggunakan logika matematika yang setara. Mobile app menangani pembukaan level berikutnya dengan sangat aman berkat referensi langsung dari state `highestCorrectAnswers` di SQLite.
- **Idempotency Submit Ujian:**
  - **Aman.** Pada file `sync_service.dart` baris 160 (`_uploadSingleAnswer`), penggunaan API Supabase memanggil methode `.upsert` dengan `onConflict: 'session_id,question_id'`. Demikian juga `.upsert` pada pengiriman `assessment_sessions` di baris 211 menggunakan Primary Key secara default. Submit ganda saat jaringan tidak stabil **tidak akan** menduplikasi entri di tabel server.
- **Alur Soal (6 Tipe Interaksi, Timer, Idle Phase):**
  - **Terverifikasi.** State UI untuk asesmen di mobile ditangani dengan stabil pada `question_page.dart` dibantu `assessment_provider.dart`.

## 6. Performa & Memory Leak (Flutter Mobile)
- **`StreamSubscription` Cleanup:**
  - **Aman.** Satu-satunya pemanggilan global `.listen` eksternal adalah `Connectivity().onConnectivityChanged.listen` pada `main.dart`. Variabel `_connectivitySub` sudah dibatalkan (dibersihkan) dengan rapi di dalam methode `dispose()` milik `_PemantikAppState` pada baris 57.
- **Provider Leak & Drift Instances:**
  - **Aman.** Seluruh sinkronisasi data reaktif dikelola aman menggunakan Riverpod `ref.watch` di dalam block auto-dispose dan `ConsumerStatefulWidget`. Objek database `AppDatabase` juga instansiasi *singleton-based* yang hanya di-trigger satu kali di dalam `databaseProvider` (`database.dart` baris 110) yang aman dari memory leak.

---
**Kesimpulan Putaran 3:** Fitur database relasional dan memory management pada mobile sudah stabil. Namun, perlu perbaikan mendasar sebelum uji coba lapangan (Go/No-Go), terutama untuk:
1. Logic Server Action Next.js (Dapodik import background job).
2. Bug mutasi update data Sekolah Komunitas (Action Layer bypass).
3. Query dashboard Guru yang masih mengandalkan legacy field `classes.teacher_id`.
4. Login offline Anak via PIN yang ternyata masih request jaringan/API.
