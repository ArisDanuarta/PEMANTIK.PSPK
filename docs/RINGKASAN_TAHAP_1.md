# Ringkasan Pengembangan Sistem Pemantik (Tahap 1)

Dokumen ini merangkum seluruh arsitektur, fitur yang telah selesai, tantangan yang diselesaikan, serta acuan panduan desain UI/UX yang telah diimplementasikan dari awal hingga saat ini. Dokumen ini sangat penting untuk dijadikan pegangan teknis dan pedoman gaya pada pengembangan tahap berikutnya.

## 1. Arsitektur & Teknologi Dasar
Proyek ini dibangun menggunakan arsitektur **Monorepo (Turborepo)** dengan komponen hierarkis berikut:
- **`apps/web`**: Aplikasi web utama (Next.js 14 App Router) untuk panel admin dan dashboard institusi pendidikan.
- **`apps/mobile`**: *(Tahap Mendatang)* Folder khusus untuk aplikasi mobile (Flutter) bagi siswa.
- **`packages/ui`**: Sistem kumpulan komponen UI terpusat (Button, Modal, Table, Badge) yang dirancang untuk dapat dipakai ulang di berbagai modul.
- **`packages/supabase`**: Konfigurasi sentral koneksi database, instansiasi klien Supabase, dan *helper scripts* (seperti logika Row-Level Security).
- **`packages/shared-types`**: Repositori definisi tipe data TypeScript (User, Question, Level, dsb) agar ada keseragaman data antara Frontend, Backend, dan UI.

**Teknologi Utama:**
- **Next.js 14** (App Router & React Server Components)
- **Supabase** (PostgreSQL Database, Authentication, Realtime Subscription)
- **Vanilla CSS (CSS Modules & Globals)** untuk kontrol penuh atas desain visual (menghindari limitasi desain *utility-first* murni).
- **TypeScript** untuk validasi statik kode.

**Struktur Folder & Hirarki Repositori Saat Ini:**
```text
pemantik/
 ├── apps/
 │    ├── mobile/          # (Mendatang) Aplikasi siswa menggunakan framework Flutter
 │    └── web/             # (Fokus Utama) Next.js App Router (Dashboard Admin/Institusi)
 │         ├── src/app/
 │         │    ├── admin-soal/  # Modul dasbor khusus role Admin Soal (CRUD Soal, Preview)
 │         │    ├── guru/        # Modul dasbor khusus role Guru
 │         │    ├── komunitas/   # Modul dasbor khusus role Komunitas
 │         │    ├── sekolah/     # Modul dasbor khusus role Sekolah
 │         │    ├── super-admin/ # Modul dasbor super user (Manajemen pengguna & pengaturan)
 │         │    ├── login/       # Halaman autentikasi utama
 │         │    └── globals.css  # Definisi tata letak dasar, warna brand, dan custom scrollbar
 │         └── src/components/   # Komponen UI berorientasi fitur (Layout, Sidebar, Feedback)
 ├── packages/
 │    ├── shared-types/    # Interface & Tipe TS lintas modul (Dipakai Web & Mobile)
 │    ├── supabase/        # Konfigurasi klien dan otentikasi untuk dibagikan antar aplikasi
 │    └── ui/              # Design System komponen murni (Badge, Button, Modal, Table, dsb)
 ├── docs/                 # Dokumentasi proyek (seperti ringkasan ini)
 └── supabase/
      └── migrations/      # Berkas eksekusi SQL untuk skema database (Tabel, RLS, Enum)
```

---

## 2. Otentikasi & Manajemen Sesi (Middleware)
- Menggunakan Supabase Auth yang dikombinasikan dengan tabel kustom `users` sebagai pusat manajemen identitas dan peran (Role-Based Access Control).
- Diatur secara kokoh oleh *Middleware* (`apps/web/src/middleware.ts`) yang memeriksa token sesi secara langsung di sisi server (`supabase.auth.getSession()`).
- Terdapat aturan proteksi rute ganda:
  - Pengguna tanpa akses login otomatis tertendang ke `/login`.
  - Pengguna yang mencoba mengakses *path* peran lain otomatis dikembalikan ke *dashboard* utama mereka.
  - Alur distribusi peran (*Role Dispatching*):
    - `super_admin` ➔ `/super-admin/*`
    - `question_admin` ➔ `/admin-soal/*`
    - `school` ➔ `/sekolah/*`
    - `teacher` ➔ `/guru/*`
    - `community` ➔ `/komunitas/*`
    - `student` ➔ Panel ujian (mayoritas akan ditangani via Mobile App).

---

## 3. Sistem Layout & Desain Global (UI/UX)
Mengadopsi struktur estetika yang mematuhi **PSPK Brand Guidelines**. Bertujuan untuk memancarkan kesan yang profesional, modern, responsif, elegan, namun tetap ramah.
- **Warna Identitas**: Menggunakan *Biru PSPK* (`#102e50`), *Kuning PSPK* (`#f2af3e`), dipadukan dengan aksen turunannya (seperti latar belakang yang lembut: `#eef8ff` dan `#f9fafb`).
- **Tipografi Harmonis**:
  - **Inter**: Diterapkan pada komponen fungsional (UI tombol, *dashboard*, navigasi, form) untuk keterbacaan yang modern.
  - **Lora (Serif)**: Digunakan khusus untuk penekanan teks bernuansa akademis (contoh: *Page Title*, konten soal, literasi panjang).
- **Navigasi Global (`Sidebar.tsx` & `AppLayout.tsx`)**:
  - Menu dirender secara dinamis membaca struktur navigasi `NavSection` berdasarkan peran.
  - Sidebar mendukung status *collapse* (responsif di layar kecil) dan memiliki indikator *badge* atau *chip status* warna.
- **Custom Aesthetic Scrollbar**: 
  - Penambahan *class* `.pemantik-scrollbar`. Memberikan *scrollbar* berbentuk membulat (*rounded*), transparan, dan minimalis layaknya antarmuka sistem operasi macOS. Menghilangkan scrollbar kotak tebal standar Windows/Browser.

---

## 4. Modul Admin Soal (Core Feature Tahap 1)
Ini adalah modul yang telah dieksplorasi secara paling dalam dan ekstensif, berfokus untuk menyediakan pengalaman pembuatan asesmen (soal) yang revolusioner bagi pengguna `question_admin`.

### A. Mesin Form Input Dinamis (`QuestionFormClient.tsx`)
Komponen master ini sudah dibangun untuk mendukung **6 tipe interaksi asesmen modern**:
1. **Pilihan Ganda (Multiple Choice)**: Teks & opsi dinamis berbatas panjang.
2. **Pilih Gambar (Image Choice)**: Pengunggahan dan seleksi visual sebagai matriks jawaban.
3. **Audio**: Soal bertipe pendengaran (*listening*) atau literasi suara.
4. **Video**: Stimulus interaktif yang bisa menampung `iframe` otomatis dari link YouTube maupun berkas mandiri.
5. **Drag & Drop**: Mendukung manipulasi interaktif pengisian titik rumpang (*Fill in the Blank*) dengan deteksi format spesifik `___` (tiga *underscore*), atau metode pengelompokan kategori silang.
6. **Voice Recording (Deteksi Suara)**: Modul canggih yang memadukan input teks referensi dengan suara siswa, yang mana komparasinya dinilai otomatis melalui perhitungan jarak algoritme *Levenshtein Distance* — disertai dengan kontrol persentase batas kelonggaran (*Threshold*) toleransi aksen/ejaan bagi guru.

### B. Live Mobile Phone Preview (Inovasi UX)
- Simulator layar *smartphone* vertikal yang dibuat secara murni dengan CSS Flexbox & kalkulasi rasio, untuk memberikan pratinjau seketika tanpa perlu perangkat sungguhan.
- **Arsitektur Layout Terbagi (Split Rigid Layout)**: 
  - Dibangun menghindari *scroll* pada level halaman (*body-scroll*).
  - Sisi Kiri: Tempat form panjang yang *scrollable* dengan *scrollbar* mandiri.
  - Sisi Kanan: Ruang eksklusif untuk mockup HP. Dibuat diam pada tempatnya (*fixed/sticky*) sehingga editor tidak pernah kehilangan pandangan terhadap pratinjau ketika ia menggulir form soal di sisi kiri.

### C. Dashboard Preview Menyeluruh (`/admin-soal/preview`)
- Layout terbelah antara Daftar Ringkas Soal (Kiri) dan Eksekusi *Mobile Preview* (Kanan).
- Mengintegrasikan mekanisme penyaringan/filter *Client-Side* seketika. Admin dapat beralih menyoroti soal Literasi vs Numerasi, mengelompokkan berdasarkan tipe soal, atau melihat yang berstatus Draft vs Published, semuanya instan tanpa hambatan pemuatan server (*loading bar*).

---

## 5. Modul Global Bersama (Shared Systems)

### A. Modul Lapor Masalah (`FeedbackFAB.tsx`)
- Fitur *Floating Action Button* berwujud lingkaran elegan di pojok kanan bawah yang terus membuntuti navigasi pengguna (Guru, Komunitas, Sekolah, dan Admin Soal).
- Langsung terhubung ke tindakan basis data untuk menampung kritik, masukan ide, dan deteksi *bug* untuk ditangani Super Admin.
- Disempurnakan melalui perbaikan *conditional rendering* (penambahan otorisasi untuk `question_admin`).

### B. Sistem Notifikasi Real-Time (`NotificationBell.tsx`)
- Menarik *event* secara *realtime* di latar belakang menggunakan `supabase.channel` atas kejadian *PostgreSQL INSERT & UPDATE* pada tabel spesifik `notifications`.
- Menghadirkan indikator notifikasi belum terbaca secara langsung (*badge* merah lonceng).
- **Pencapaian Teknis**: Berhasil merancang desain arsitektural *popover container* dengan metode ekskavasi dimensi (*escape bounding block*). Karena ikon lonceng ditanamkan di dalam sidebar yang bersifat `overflow-x: hidden`, sebuah *popover* melayang tradisional otomatis akan terpotong batas pinggir. Ini diselesaikan dengan sempurna melalui injeksi metode `createPortal` (React DOM) yang mengeluarkan kotak notifikasi tersebut agar terapung merdeka di tingkat `document.body` dan menggunakan `position: fixed` kalkulatif secara relatif terhadap lonceng.

---

## 6. Pembelajaran & Pola Desain (Lessons Learned & Anti-Patterns)
Beberapa tantangan struktural yang telah berhasil dipetakan, untuk selalu dijadikan pedoman ke depannya:
1. **Hydration Mismatch pada Dimensi Adaptif**: 
   - Karena sisi server (*Server-Side Rendering*) tidak memiliki wawasan tentang *viewport* aktual (ukuran spesifik monitor klien), implementasi rendering rasio komputasi (seperti memperbesar *scale mockup* HP menggunakan rumus *calc*) rentan meledakkan DOM jika dirender dari server.
   - **Aturan Proyek**: Selalu bungkus komputasi visual sisi-klien di dalam pelindung `isMounted` atau eksekusi dalam fase `useEffect` agar harmonis saat tahap integrasi (*Hydration*).
2. **Anti-Pattern Layout: Scrolling Penuh Halaman (Body Scroll) vs Scroll Kolom**: 
   - Untuk melahirkan nuansa aplikasi "Desktop" di browser (misal: panel dasbor admin), *body* situs utama HARUS digembok (`minHeight: 100vh`, `overflow: hidden`). 
   - Biarkan elemen anak tingkat bawah yang diberi properti pengisi (`flex: 1`, `minHeight: 0`, `overflow-y: auto`). Hal ini berhasil diterapkan di form input Admin Soal.
3. **Mengalahkan Hierarki z-index / overflow-hidden**: 
   - Sidebar wajib diatur dengan `overflow-x: hidden` agar tidak "bocor" secara *layout*.
   - **Aturan Proyek**: Efek sampingnya, elemen modal interaktif/dropdown/popover (*seperti notifikasi*) yang asalnya dipicu dari dalam bilah sidebar WAJIB diekstrak memanfaatkan fungsi `createPortal` agar melayang di *layer* paling atas.

---

## 7. Rencana Pengembangan Selanjutnya (Next Target Milestones)
Rekomendasi implementasi fase lanjutan mencakup:
- [ ] **Modul Super Admin Dashboard**: Menyiapkan meja kontrol utama yang meliputi tabel CRUD seluruh pengguna lintas batas institusi, panel grafik statistik SES (Sosial Ekonomi Sekolah), serta pemeriksaan log aktivitas.
- [ ] **Modul Sekolah & Pendidik**: Implementasi unggah massal (*batch upload*) via CSV bagi data Siswa/Guru, konfigurasi penciptaan "Sesi Ruang Asesmen", serta sistem rekapitulasi penilaian/rapor formatif.
- [ ] **Penyimpanan Objek Otomatis (Storage)**: Mengganti input *media_url* sementara dengan sistem tarik-lepas (*drag & drop*) file multimedia (*image/audio/video*) yang otomatis memompa *stream* asinkron ke layanan *Supabase Storage Bukcets*.
- [ ] **Fondasi `apps/mobile`**: Mendeklarasikan arsitektur awal modul Flutter dengan menautkan ke otentikasi API yang sama, menyusun purwarupa UI pengisian soal (*interface* siswa), dan penyesuaian fungsi sinkronisasi *offline-first* dengan perpustakaan SQLite (Drift).


struktur database terbaru saat ini di supabase
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.communities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT communities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid NOT NULL,
  name text NOT NULL,
  npsn text UNIQUE,
  address text,
  province text,
  city text,
  principal_name text,
  contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  district text,
  village text,
  CONSTRAINT schools_pkey PRIMARY KEY (id),
  CONSTRAINT schools_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role USER-DEFINED NOT NULL,
  community_id uuid,
  school_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  kode_guru text,
  nip text,
  gender USER-DEFINED,
  birth_date date,
  village text,
  district text,
  regency text,
  province text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id)
);
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL,
  teacher_id uuid,
  name text NOT NULL,
  grade integer NOT NULL CHECK (grade >= 1 AND grade <= 9),
  academic_year text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL,
  class_id uuid,
  nisn text,
  full_name text NOT NULL,
  gender USER-DEFINED NOT NULL,
  birth_date date,
  ses_class USER-DEFINED,
  pin_hash text NOT NULL,
  username text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  father_education_id uuid,
  mother_education_id uuid,
  father_occupation_id uuid,
  mother_occupation_id uuid,
  province text,
  city text,
  district text,
  village text,
  ses_score integer DEFAULT 0,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT students_father_education_id_fkey FOREIGN KEY (father_education_id) REFERENCES public.ses_variables(id),
  CONSTRAINT students_mother_education_id_fkey FOREIGN KEY (mother_education_id) REFERENCES public.ses_variables(id),
  CONSTRAINT students_father_occupation_id_fkey FOREIGN KEY (father_occupation_id) REFERENCES public.ses_variables(id),
  CONSTRAINT students_mother_occupation_id_fkey FOREIGN KEY (mother_occupation_id) REFERENCES public.ses_variables(id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_by uuid,
  subject_area USER-DEFINED NOT NULL,
  question_type USER-DEFINED NOT NULL,
  question_text text,
  question_audio_url text,
  question_video_url text,
  question_image_url text,
  options jsonb,
  correct_answer jsonb NOT NULL,
  explanation text,
  tags ARRAY,
  is_published boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  level_id uuid,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT questions_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.question_levels(id)
);
CREATE TABLE public.assessment_packages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_by uuid,
  name text NOT NULL,
  description text,
  subject_area USER-DEFINED NOT NULL,
  grade_target integer CHECK (grade_target >= 1 AND grade_target <= 9),
  total_questions integer NOT NULL DEFAULT 0,
  time_limit_min integer NOT NULL DEFAULT 60,
  is_published boolean NOT NULL DEFAULT false,
  valid_from timestamp with time zone,
  valid_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assessment_packages_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_packages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.assessment_package_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  package_id uuid NOT NULL,
  question_id uuid NOT NULL,
  order_index integer NOT NULL,
  CONSTRAINT assessment_package_questions_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_package_questions_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.assessment_packages(id),
  CONSTRAINT assessment_package_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.assessment_access (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  package_id uuid NOT NULL,
  school_id uuid NOT NULL,
  granted_by uuid,
  valid_from timestamp with time zone NOT NULL,
  valid_until timestamp with time zone NOT NULL,
  max_attempts integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assessment_access_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_access_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.assessment_packages(id),
  CONSTRAINT assessment_access_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT assessment_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id)
);
CREATE TABLE public.assessment_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  package_id uuid NOT NULL,
  school_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::session_status,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  score numeric,
  time_spent_sec integer,
  device_info jsonb,
  sync_status USER-DEFINED NOT NULL DEFAULT 'pending'::sync_status,
  synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assessment_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_sessions_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.assessment_packages(id),
  CONSTRAINT assessment_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT assessment_sessions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.student_answers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  question_id uuid NOT NULL,
  answer_data jsonb NOT NULL,
  recording_url text,
  is_correct boolean,
  score numeric,
  time_spent_sec integer,
  status USER-DEFINED NOT NULL DEFAULT 'answered'::answer_status,
  answered_at timestamp with time zone NOT NULL DEFAULT now(),
  sync_status USER-DEFINED NOT NULL DEFAULT 'pending'::sync_status,
  CONSTRAINT student_answers_pkey PRIMARY KEY (id),
  CONSTRAINT student_answers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.assessment_sessions(id),
  CONSTRAINT student_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.ses_variables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type USER-DEFINED NOT NULL,
  name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ses_variables_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ses_thresholds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  min_score integer NOT NULL,
  max_score integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ses_thresholds_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_settings (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  system_name text NOT NULL DEFAULT 'Platform Asesmen Pemantik'::text,
  session_timeout integer NOT NULL DEFAULT 60,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text DEFAULT 'Sistem sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi.'::text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT system_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info'::text,
  source text NOT NULL DEFAULT 'system'::text,
  role_context text,
  user_id uuid,
  message text NOT NULL,
  details jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT system_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'success'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.question_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  subject_area USER-DEFINED NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT question_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.question_levels (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category_id uuid,
  level_number integer NOT NULL,
  time_limit_sec integer DEFAULT 60,
  passing_threshold integer DEFAULT 0,
  access_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT question_levels_pkey PRIMARY KEY (id),
  CONSTRAINT question_levels_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.question_categories(id)
);