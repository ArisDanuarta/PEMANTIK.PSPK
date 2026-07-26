# Laporan Audit Menyeluruh Monorepo Pemantik v2

**Tanggal Audit:** 24 Juli 2026
**Auditor:** Agent (Antigravity)
**Status:** Selesai (Discovery Phase)

---

## 1. Ringkasan Eksekutif
Audit ini dilakukan secara statis dengan meninjau kode sumber pada monorepo Pemantik (Web Next.js + Mobile Flutter). Secara umum, arsitektur keamanan menggunakan Supabase RLS dan Edge Functions sudah terimplementasi dengan baik. Namun, ditemukan beberapa celah keamanan potensial (seperti ketiadaan *rate limiting* pada login siswa), *race condition* di aplikasi mobile, dan sisa *technical debt* dari skema lama yang dapat menyebabkan *runtime error*.

---

## 2. Temuan Kritis (High Priority)

### 2.1. Bug Edge Function `cron-auto-transition` (Technical Debt)
- **Lokasi:** `supabase/functions/cron-auto-transition/index.ts`
- **Deskripsi:** Edge function ini masih mencoba melakukan *query* ke tabel `profiles` (`supabase.from("profiles").select(...)`) untuk mengambil data Super Admin. Tabel `profiles` sudah tidak ada di skema terbaru Pemantik v2 (diganti menjadi tabel `users`).
- **Dampak:** *Cron job* untuk transisi fase otomatis akan selalu gagal (crash) saat dieksekusi.
- **Rekomendasi Perbaikan:** Ubah referensi dari `profiles` ke `users`.

### 2.2. Ketiadaan *Rate Limiting* pada Autentikasi Siswa
- **Lokasi:** `supabase/functions/authenticate-student/index.ts`
- **Deskripsi:** Edge function `authenticate-student` tidak memiliki mekanisme *rate limiting* atau proteksi *brute-force*.
- **Dampak:** Karena PIN default siswa dibuat statis (`123456`) pada saat *import* Dapodik, penyerang yang mengetahui atau menebak *username* siswa dapat melakukan *brute-force* PIN dengan mudah tanpa diblokir oleh sistem.
- **Rekomendasi Perbaikan:** Tambahkan mekanisme pembatasan percobaan login (misal: maksimal 5 kali gagal per 15 menit), baik menggunakan tabel log di database atau Redis/KV store, dan wajibkan siswa mengganti PIN *default* setelah login pertama.

---

## 3. Temuan Keamanan & Akses (Medium Priority)

### 3.1. RLS pada Data SES (Socio-Economic Status) Terlalu Longgar
- **Lokasi:** `supabase/migrations/ADD_SES_SCHEMA.sql`
- **Deskripsi:** Sesuai *requirement*, konfigurasi bobot SES seharusnya hanya bisa diakses oleh Super Admin. Namun, pada implementasi RLS, tabel `ses_variables` dan `ses_thresholds` memiliki *policy* `FOR SELECT USING (true)`.
- **Dampak:** Semua pengguna (termasuk *anonymous*) dapat membaca struktur bobot SES melalui API. Meski hanya Super Admin yang bisa mengubahnya, hal ini mengekspos formula penilaian secara publik.
- **Rekomendasi Perbaikan:** Ubah *policy* `SELECT` agar secara ketat menggunakan fungsi `public.jwt_user_role() = 'super_admin'`.

### 3.2. Celah API pada Pembaruan Sekolah oleh Community Admin (Aman karena RLS)
- **Lokasi:** `apps/web/src/app/actions/schools.ts` (`updateSchoolAction`)
- **Deskripsi:** Pada saat Admin Komunitas melakukan *update* data sekolah, *action* menerima dan memproses *field* `community_id` dari *payload* HTTP (`formData`), bahkan memungkinkan nilainya di-set ke `null` (independen) atau ID komunitas lain.
- **Dampak Praktis:** Secara teknis, eksekusi manipulasi data ini akan **DIBLOKIR** oleh *database* berkat perlindungan RLS (`community_manage_schools`) yang tidak memiliki klausa `WITH CHECK` eksplisit sehingga jatuh kembali ke klausa `USING` (yang mensyaratkan `community_id` harus sama dengan JWT pengguna).
- **Rekomendasi Perbaikan:** Meskipun terproteksi di lapis *database*, *backend action* sebaiknya secara eksplisit menimpa atau mengabaikan *input* `community_id` dari *client* untuk *role* `community`.

---

## 4. Temuan Fungsional & Kualitas Kode (Low Priority)

### 4.1. Notifikasi Indikator SES Baru Tidak Terintegrasi di Trigger
- **Lokasi:** `apps/web/src/app/actions/schools.ts` & `supabase/migrations/20260711180000_ses_recalculation_trigger.sql`
- **Deskripsi:** Kebutuhan untuk menyiarkan notifikasi *broadcast* saat ada SES tidak dikenali (`needs_review = true`) diimplementasikan murni di sisi aplikasi (`importDapodikAction`), bukan di dalam level *database/trigger*.
- **Dampak:** Jika ada penambahan nilai SES dari sumber lain selain *importer* Dapodik, Super Admin tidak akan menerima notifikasi.
- **Rekomendasi Perbaikan:** Pindahkan logika pengiriman notifikasi menggunakan `pg_net` langsung dari *trigger* Supabase, atau biarkan di *application layer* dengan memastikan semua jalur *entry* memanggil fungsi yang sama.

### 4.2. *Race Condition* pada Sinkronisasi Mobile
- **Lokasi:** `apps/mobile/pemantik_mobile/lib/features/dashboard/providers/dashboard_provider.dart`
- **Deskripsi:** Di dalam `availableAssessments` (sebuah `FutureProvider`), pemanggilan `syncService.syncCategoriesAndQuestions()` dilakukan secara langsung tanpa ada mekanisme *locking* atau pengecekan *state* (seperti halnya di `auth_provider.dart` yang sudah menggunakan `_mounted`).
- **Dampak:** Jika *user* melakukan *refresh* atau berpindah layar berulang kali dengan cepat, aplikasi akan memicu *multiple concurrent sync requests* yang memberatkan *backend* dan memori perangkat.
- **Rekomendasi Perbaikan:** Gunakan status *flag* (misal: `isSyncing`) di dalam `SyncService` untuk mencegah tumpang-tindih eksekusi sinkronisasi.

### 4.3. Sisa Ketidakselarasan Penamaan `media_url`
- **Lokasi:** `packages/shared-types/src/question.ts`
- **Deskripsi:** Atribut `media_url` masih secara eksplisit didefinisikan di dalam struktur `Question` (`media_url: string | null;`), meskipun skema database Supabase sudah bermigrasi menggunakan atribut yang lebih spesifik (`question_image_url`, `question_audio_url`, dsb.).
- **Dampak:** Membingungkan *developer* saat melakukan *mapping data* dari API ke UI (contoh: di `QuestionFormClient.tsx` yang masih memiliki residu *state* lokal `mediaUrl`).
- **Rekomendasi Perbaikan:** Hapus atribut `media_url` dari paket `shared-types` dan selaraskan *state* komponen sepenuhnya dengan atribut skema *database* terbaru.

---

## 5. Kesimpulan dan Next Steps
Arsitektur keamanan data antar-*role* secara fundamental solid dengan pondasi Supabase RLS yang kuat, termasuk pemisahan data antar siswa menggunakan JWT *claims* kustom di aplikasi mobile. Pekerjaan selanjutnya (Backlog) harus diprioritaskan pada:
1. Menambal Edge Function `cron-auto-transition` (Hapus referensi ke `profiles`).
2. Menambahkan perlindungan *Rate Limiting* pada proses masuk (login) siswa.
3. Memperketat proteksi RLS pada data SES.
