# Blueprint Sistem Pemantik v2.0
> Rancangan Teknis Lengkap - Platform Asesmen Literasi & Numerasi  
> **Status:** Internal - tidak untuk distribusi publik

---

## Ringkasan Sistem

Sistem Pemantik adalah platform manajemen ujian berjenjang untuk asesmen literasi dan numerasi.  
Sistem ini memiliki **6 role** dengan isolasi data yang dijamin via **JWT claim** dan **Supabase Row Level Security (RLS)**.

**Stack utama:** Next.js (monorepo web) · Flutter (mobile siswa) · Supabase (backend) · Drift SQLite (offline)

---

## 1. Hierarki Peran & Akses

Sistem memiliki 6 role: `super_admin` · `question_admin` · `community` · `school` · `teacher` · `student`

### 1.1 Super Admin
- 1 akun, kontrol penuh sistem
- Dashboard agregat: total komunitas, sekolah, guru, siswa, status asesmen real-time
- Buat & kelola akun komunitas dan sekolah, set paket asesmen per mitra
- Pantau dan manajemen semua bank soal (literasi & numerasi, semua level)
- Konfigurasi sistem: role permission, audit log, backup data
- Akses laporan agregat lintas komunitas (filter: tahun, provinsi, SES, gender)
- Export data Excel: per organisasi, sekolah, kelas, tanggal pelaksanaan
- Override akses global kapan saja

### 1.2 Admin Soal
- N akun, mengelola konten soal saja
- Input soal baru: pilih jenis (literasi/numerasi), level, paket, tipe interaksi
- Upload media: audio, video, gambar sebagai stimulus ke Supabase Storage
- Atur kunci jawaban dan bobot skor per soal
- Preview tampilan soal seperti di mobile app siswa sebelum publish
- Kelola status soal: `Draft → Review → Published`
- Edit dan arsip soal, simpan version history

### 1.3 Komunitas / Mitra
- N akun, mengelola jaringan sekolah
- Dashboard: daftar sekolah, jumlah guru dan siswa per sekolah
- Buat akun sekolah (manual atau bulk via Excel)
- Buat akun guru dan siswa, relasikan ke sekolah yang tepat
- Tentukan akses ujian: paket per sekolah/siswa
- Pantau hasil ujian siswa di seluruh sekolah
- Filter hasil: sekolah, kelas, SES, gender, tahun

### 1.4 Sekolah
- N per komunitas, mengelola guru dan siswa
- Dashboard: jumlah guru, jumlah siswa, statistik per kelas
- Buat dan kelola akun guru (manual / import Excel)
- Buat dan kelola akun siswa per kelas (manual / import Excel)
- Tentukan akses ujian per kelas atau per siswa individual
- Lihat dan export hasil ujian per siswa, per kelas, atau keseluruhan sekolah

### 1.5 Guru
- N per sekolah, mengelola murid di kelasnya
- Dashboard: daftar murid di kelas, status ujian tiap murid
- Buka atau tutup akses ujian untuk murid
- Lihat hasil ujian tiap murid secara detail (per soal)
- Review jawaban voice recording murid dan beri skor manual
- Lihat progress asesmen murid dari waktu ke waktu

### 1.6 Siswa (Mobile App Flutter)
- N per guru, menggunakan aplikasi mobile Flutter (iOS & Android)
- Login dengan username + PIN sederhana (tanpa email, ramah anak)
- Dashboard pribadi: nama, kelas, sekolah, statistik asesmen
- Track progress: level yang diselesaikan, skor per asesmen
- Mulai asesmen sesuai akses yang diberikan
- Kerjakan soal interaktif: pilihan ganda, drag & drop, audio, video, gambar
- Rekam suara untuk soal pengucapan kata/kalimat
- Lihat hasil setelah asesmen selesai (jika auto-score)

### 1.7 Matriks Akses Ujian

| Role        | Set Paket       | Per Sekolah    | Per Kelas    | Per Siswa       | Lihat Hasil          |
|-------------|-----------------|----------------|--------------|-----------------|----------------------|
| Super Admin | ✓ per komunitas | ✓ override     | ✓            | ✓               | ✓ semua level        |
| Komunitas   | -               | ✓              | via sekolah  | ✓               | ✓ lintas sekolah     |
| Sekolah     | -               | -              | ✓            | ✓               | ✓ per kelas          |
| Guru        | -               | -              | -            | ✓ muridnya saja | ✓ per soal           |

---

## 2. Alur Lengkap Asesmen Siswa

Enam tahap dari konfigurasi paket hingga hasil tersaji di dashboard semua level:

### Tahap 1 - Super Admin Menetapkan Paket Asesmen per Komunitas
- Komunitas X hanya bisa akses paket literasi level 1–4; Komunitas Y dapat akses penuh
- Konfigurasi disimpan di tabel `community_assessment_access` dalam format `JSONB`

### Tahap 2 - Komunitas / Sekolah / Guru Membuat Akun Siswa
- Bisa manual satu per satu atau bulk import via template Excel
- Akun siswa otomatis berelasi ke sekolah dan kelas yang sesuai
- Data siswa mencakup SES (kelas I–IV) dan gender

### Tahap 3 - Guru / Sekolah / Komunitas Membuka Akses Ujian
- Akses diatur per siswa, per kelas, atau per sekolah
- Status berjenjang: `Belum Bisa Ujian → Siap Ujian → Sudah Selesai`
- Guru hanya bisa membuka akses untuk muridnya sendiri

### Tahap 4 - Siswa Login di Mobile App dan Mulai Asesmen
- App fetch soal sesuai paket yang diizinkan via Supabase REST API / Realtime
- Soal dapat diacak atau berurutan sesuai konfigurasi
- Progress tersimpan real-time; bisa dilanjutkan jika koneksi terputus (offline-first SQLite)

### Tahap 5 - Jawaban Tersimpan dan Dikoreksi
- Pilihan ganda dan drag & drop: **auto-score**
- Voice recording: masuk antrian **manual review** oleh guru
- Skor disimpan per soal dan per sesi
- UPSERT digunakan untuk mencegah duplikat jawaban

### Tahap 6 - Hasil Tampil di Dashboard Semua Level Hierarki
- Guru → per siswa | Sekolah → per kelas | Komunitas → per sekolah | Super Admin → agregat semua
- Filter tersedia: tahun, SES I–IV, gender, kelas, provinsi

---

## 3. Manajemen Soal Asesmen

### 3.1 Tipe Soal Interaktif

| Tipe              | Deskripsi                                                              |
|-------------------|------------------------------------------------------------------------|
| Drag & Drop       | Seret huruf/kata ke posisi yang benar. Cocok untuk literasi dasar.    |
| Pilihan Ganda     | Single/multi choice. Paling umum untuk semua level asesmen.           |
| Audio Stimulus    | Putar audio, anak menjawab pertanyaan. Cocok literasi level awal.     |
| Video Stimulus    | Tampilkan video, anak menjawab berdasarkan konten visual.             |
| Voice Recording   | Anak mengucapkan kata/kalimat. Direkam & dievaluasi manual guru.      |
| Image Stimulus    | Gambar sebagai soal, anak menjawab berdasarkan konten gambar.         |

### 3.2 Alur Input Soal oleh Admin Soal

1. **Pilih jenis & level asesmen** - Literasi (Level 1–9) atau Numerasi (Level 0–3+)
2. **Pilih tipe soal** - form input berubah adaptif sesuai tipe yang dipilih
   - Pilihan ganda → input teks/gambar pilihan
   - Drag & drop → input item dan target posisi
   - Audio/Video → upload file media ke Supabase Storage
3. **Input konten soal + kunci jawaban**
   - Soal disimpan dalam format JSON terstruktur (`content: jsonb`)
   - Media diupload ke Supabase Storage, URL disimpan di `media_url`
4. **Preview & Publish** - status: `Draft → Review → Published`
   - Hanya soal berstatus `Published` yang bisa diakses siswa
5. **Delivery ke Flutter via Supabase API** - widget khusus per tipe interaksi, cache lokal SQLite

---

## 4. Skema Database Utama (Supabase / PostgreSQL)

### Tabel `users`
```
id          uuid        PRIMARY KEY
email       text
role        enum        (super_admin | question_admin | community | school | teacher | student)
entity_id   uuid        FK (community_id / school_id / teacher_id)
created_at  timestamp
```

### Tabel `communities`
```
id                  uuid    PRIMARY KEY
name                text
code                text    UNIQUE
assessment_access   jsonb   (paket yang bisa diakses per komunitas)
created_by          uuid    FK → users
```

### Tabel `schools`
```
id              uuid    PRIMARY KEY
community_id    uuid    FK → communities
name            text
province        text
district        text
```

### Tabel `classes`
```
id          uuid    PRIMARY KEY
school_id   uuid    FK → schools
teacher_id  uuid    FK → users
grade       int
name        text
```

### Tabel `students`
```
id          uuid    PRIMARY KEY
school_id   uuid    FK → schools
class_id    uuid    FK → classes
name        text
gender      enum
ses_score   int
ses_class   enum    (I | II | III | IV)
```

### Tabel `questions`
```
id          uuid    PRIMARY KEY
type        enum    (drag_drop | multiple_choice | audio | video | voice | image)
subject     text    (literasi | numerasi)
level       int
packet      int
content     jsonb   (struktur soal)
media_url   text    (URL Supabase Storage)
answer_key  jsonb
status      enum    (draft | review | published)
```

### Tabel `assessment_sessions`
```
id          uuid        PRIMARY KEY
student_id  uuid        FK → students
subject     text
level       int
packet      int
status      enum        (ongoing | done)
score       numeric
started_at  timestamp
finished_at timestamp
```

### Tabel `answers`
```
id              uuid    PRIMARY KEY
session_id      uuid    FK → assessment_sessions
question_id     uuid    FK → questions
answer_data     jsonb
media_url       text    (untuk voice recording)
is_correct      bool    (null jika perlu manual review)
score           numeric
question_version text   (untuk deteksi soal berubah saat offline)
```

### 4.1 Constraint & Row Level Security

- `UNIQUE(session_id, question_id)` pada tabel `answers` - mencegah duplikat, mendukung UPSERT
- RLS per role: komunitas hanya bisa lihat sekolah miliknya, guru hanya muridnya
- JWT claim menyimpan `entity_id` untuk filtering otomatis di setiap query
- `assessment_access` di tabel `communities` disimpan sebagai `JSONB` untuk fleksibilitas
- Kolom `question_version` wajib disimpan di setiap jawaban untuk skenario soal berubah saat offline

---

## 5. Strategi Offline-First (Flutter Mobile)

Siswa dapat mengerjakan soal tanpa internet. Jawaban disimpan lokal di SQLite via **Drift ORM**. Saat koneksi kembali, antrian dikirim ke Supabase secara otomatis.

### 5.1 Status Sinkronisasi Jawaban

| Status    | Keterangan                                                              |
|-----------|-------------------------------------------------------------------------|
| `pending` | Belum dikirim ke server, menunggu koneksi internet tersedia.           |
| `syncing` | Sedang dikirim ke Supabase, menunggu response dari server.             |
| `synced`  | Berhasil tersimpan di Supabase. Data aman.                             |
| `failed`  | Gagal sinkronisasi, perlu intervensi. Tampilkan peringatan ke siswa.   |

### 5.2 Empat Tahap Alur Offline-First

**Tahap 1 - App Launch: Fetch & Cache Soal**
- Saat online, fetch semua soal yang diizinkan untuk siswa tersebut
- Simpan ke SQLite lokal via Drift (typed SQLite ORM untuk Flutter)
- Media audio/video kecil bisa di-preload ke local storage
- Tabel: `Questions` dengan field `cachedAt`

**Tahap 2 - Siswa Menjawab: Simpan Lokal Dulu, Selalu**
- Setiap jawaban SELALU disimpan ke tabel `pending_answers` di SQLite lokal terlebih dahulu
- Berlaku terlepas dari status koneksi - satu-satunya cara menghindari kehilangan data
- Field `synced` defaultnya `false`

**Tahap 3 - SyncService: Jaga Koneksi & Proses Antrian**
- Background service listen perubahan konektivitas via package `connectivity_plus`
- Saat koneksi terdeteksi kembali, SyncService langsung memproses semua jawaban dengan `synced = false`

**Tahap 4 - Upload ke Supabase: Batch dengan Retry**
- Kirim jawaban pending ke Supabase dalam batch
- Jika sukses → tandai `synced = true`
- Jika gagal (error jaringan) → biarkan di antrian, coba lagi saat koneksi stabil
- Gunakan `UPSERT` dengan conflict target `(session_id, question_id)`

### 5.3 Tiga Skenario Konflik

**Skenario 1: Jawaban Ganda (Paling Umum)**
- Penyebab: Internet mati-nyala, jawaban dikirim 2x ke server
- Solusi: UPSERT dengan constraint `UNIQUE(session_id, question_id)` - bukan INSERT biasa

**Skenario 2: Sesi Asesmen Sudah Expired**
- Penyebab: Siswa mulai ujian lalu offline lama; sesi ditutup guru atau sudah expired
- Server response: `403 session_expired`
- Solusi: Jangan retry. Tandai sebagai `failed_sync`. Tampilkan notifikasi: _"Jawaban tidak dapat dikirim, sesi ujian sudah berakhir. Hubungi guru."_

**Skenario 3: Konten Soal Berubah Saat Offline**
- Penyebab: Admin soal mengedit soal saat siswa sedang mengerjakan offline
- Solusi: Simpan `question_version` di setiap jawaban. Server menandai sebagai `answered_on_old_version` (bukan error). Data tetap tersimpan dengan flag untuk guru saat review.

> **Aturan dasar:** Jawaban siswa tidak pernah dihapus atau di-overwrite tanpa alasan. Gunakan UPSERT untuk duplikat, simpan timestamp untuk urutan, dan selalu ada status flag yang menjelaskan kondisi data ke guru/admin.

---

## 6. Arsitektur Teknis

### 6.1 Pendekatan Monorepo

- Satu codebase Next.js, satu deploy, satu domain
- Isolasi data bukan soal project terpisah - itu tugas **RLS Supabase + middleware Next.js**
- Type safety dishare antar role via `packages/shared-types/`
- Shared React components di `packages/ui/` (Button, Table, Modal, Chart, dll)
- Update fitur shared sekali jalan untuk semua role

### 6.2 URL Structure - 1 Next.js Project, 5 Role

| Route              | JWT Claim    | Deskripsi                                           |
|--------------------|--------------|-----------------------------------------------------|
| `/super-admin/*`   | super_admin  | Kontrol penuh sistem - dashboard, user, soal, laporan |
| `/admin-soal/*`    | question_admin | Manajemen konten soal - input, preview, publish   |
| `/komunitas/*`     | community_id | Jaringan sekolah - inject community_id dari JWT    |
| `/sekolah/*`       | school_id    | Manajemen guru & siswa - inject school_id dari JWT |
| `/guru/*`          | teacher_id   | Dashboard kelas - inject teacher_id + class_ids dari JWT |
| `/login`           | -            | Satu halaman login, redirect otomatis ke route sesuai role |

### 6.3 Struktur Folder Monorepo

```
apps/
  web/                  ← Next.js project utama (semua 5 role)
    app/
      super-admin/
      admin-soal/
      komunitas/
      sekolah/
      guru/
      login/
  mobile/               ← Flutter project untuk siswa

packages/
  shared-types/         ← TypeScript types: Question, Student, AssessmentSession
  ui/                   ← Shared React components (Button, Table, Modal, Chart)
  supabase/             ← Supabase client config, typed queries, RLS helpers

turbo.json              ← Turborepo orchestration build & dev
pnpm-workspace.yaml
```

### 6.4 Tech Stack Lengkap

| Teknologi               | Kategori         | Peran dalam Sistem                                              |
|-------------------------|------------------|-----------------------------------------------------------------|
| Next.js (App Router)    | Frontend web     | Monorepo semua 5 role admin - satu codebase, satu deploy       |
| Turborepo + pnpm        | Build system     | Monorepo orchestration, shared packages, type safety           |
| Tailwind CSS + shadcn/ui | UI library      | Design system terpadu untuk semua route group                  |
| Flutter                 | Mobile siswa     | iOS & Android, offline-first, interaksi soal kaya             |
| Drift (SQLite ORM)      | Local DB         | Cache soal & antrian jawaban di device siswa                   |
| connectivity_plus       | Flutter package  | Deteksi status koneksi untuk trigger SyncService               |
| Supabase (PostgreSQL)   | Backend          | Database, Auth, Row Level Security, Realtime, Storage          |
| Supabase Storage        | Media            | Upload & serve audio, video, gambar soal                       |
| JWT + RLS               | Keamanan         | Isolasi data per role, setiap API call difilter JWT claim      |
| Supabase Realtime       | Sync             | Progress siswa tersimpan real-time saat mengerjakan soal       |

### 6.5 Prinsip Keamanan Data

- Isolasi data antar komunitas adalah tanggung jawab **RLS Supabase + middleware Next.js**, bukan pemisahan project
- Setiap API call difilter oleh JWT claim yang menyimpan `entity_id` sesuai role pengguna
- RLS Supabase memastikan Komunitas A tidak bisa mengakses data Komunitas B sama sekali
- Audit log di dashboard Super Admin mencatat semua perubahan konfigurasi sistem
- Backup data terjadwal dikonfigurasi dari panel Super Admin

---

## 7. Gap & Keputusan yang Masih Perlu Ditetapkan

Area yang belum terdefinisi dan perlu keputusan sebelum implementasi:

| Area                        | Keputusan yang Dibutuhkan                                                                                                     |
|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| Notifikasi push             | Apakah guru/sekolah perlu push notification saat siswa selesai ujian? Jika ya, integrasi FCM (Firebase Cloud Messaging).    |
| UI review voice recording   | Antarmuka untuk review rekaman suara? Perlu timestamp per jawaban agar guru bisa scrub audio dengan mudah.                   |
| Expiry sesi asesmen         | Apakah ada batas waktu otomatis per sesi? Siapa yang bisa extend? Perlu field `expires_at` di tabel `assessment_sessions`.  |
| Version history soal        | Saat soal diedit setelah ada jawaban, perlu strategi snapshot versi - kolom terpisah atau tabel `questions_history`?         |
| Kolom export Excel          | Perlu definisi kolom dan agregasi per level role - format per siswa vs per kelas vs per komunitas bisa berbeda.              |
| Batas waktu pengerjaan      | Apakah ada timer per sesi atau per soal? Jika ya, perlu konfigurasi di level paket dan penanganan saat waktu habis di Flutter.|

---

*Blueprint Sistem Pemantik v2.0 · Rancangan Teknis Lengkap*
