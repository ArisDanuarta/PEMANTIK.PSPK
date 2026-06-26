# Rancangan Implementasi Aplikasi Mobile Pemantik (Flutter)

Rancangan ini mendetailkan pembuatan aplikasi *mobile* untuk Siswa menggunakan framework Flutter di dalam direktori `apps/mobile`. Aplikasi ini ditargetkan untuk **anak-anak**, sehingga antarmuka (UI) akan dirancang agar ramah, intuitif, dan *gamified*, namun tetap mengadopsi palet warna PSPK dan pedoman *brand* yang telah ditetapkan.

## User Review Required

> [!IMPORTANT]
> **Persetujuan Inisialisasi Proyek**
> Pembuatan proyek Flutter akan dilakukan menggunakan perintah `flutter create --org id.pspk pemantik_mobile` di dalam direktori `apps/mobile`. Pastikan Flutter SDK telah terinstal di lingkungan pengembangan Anda. Jika sudah siap, saya akan mengeksekusinya.

> [!TIP]
> **Pendekatan Offline-First (Drift + Supabase)**
> Aplikasi ini dirancang dengan pendekatan *offline-first*. Artinya, seluruh interaksi (login token, paket soal, dan penyimpanan jawaban) akan bermuara di **SQLite lokal (Drift)** terlebih dahulu. Sinkronisasi ke Supabase hanya terjadi di latar belakang ketika `connectivity_plus` mendeteksi koneksi internet.


# Rancangan Implementasi Aplikasi Mobile Pemantik (Flutter)

**Versi:** 2.0 (Revisi — Dashboard disederhanakan, gamifikasi dihapus)  
**Tanggal:** Juni 2025  
**Target Platform:** iOS & Android  
**Framework:** Flutter (Dart)  
**Direktori:** `apps/mobile/`

---

## Daftar Isi

1. [Konteks & Tujuan](#1-konteks--tujuan)
2. [Prinsip Desain — Brand PSPK](#2-prinsip-desain--brand-pspk)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Struktur Folder](#4-struktur-folder)
5. [Dependensi & pubspec.yaml](#5-dependensi--pubspecyaml)
6. [Fitur 1 — Autentikasi: Login Username + PIN](#6-fitur-1--autentikasi-login-username--pin)
7. [Fitur 2 — Dashboard: Halaman Utama Siswa](#7-fitur-2--dashboard-halaman-utama-siswa)
8. [Fitur 3 — Pilih Asesmen](#8-fitur-3--pilih-asesmen)
9. [Fitur 4 — Engine Soal Interaktif](#9-fitur-4--engine-soal-interaktif)
10. [Fitur 5 — Voice Recording & Analisis Pengucapan](#10-fitur-5--voice-recording--analisis-pengucapan)
11. [Fitur 6 — Halaman Hasil Asesmen](#11-fitur-6--halaman-hasil-asesmen)
12. [Skema Database Lokal (Drift/SQLite)](#12-skema-database-lokal-driftsqlite)
13. [Strategi Sinkronisasi Offline-First](#13-strategi-sinkronisasi-offline-first)
14. [Panduan UI/UX Lengkap](#14-panduan-uiux-lengkap)
15. [Alur Navigasi Antar Halaman](#15-alur-navigasi-antar-halaman)
16. [Tahapan Implementasi (Sprint Plan)](#16-tahapan-implementasi-sprint-plan)
17. [Keputusan Teknis](#17-keputusan-teknis)
18. [Verification Plan](#18-verification-plan)

---

## 1. Konteks & Tujuan

Aplikasi mobile Pemantik adalah antarmuka utama bagi **siswa usia 6–12 tahun** untuk mengerjakan asesmen literasi dan numerasi. Aplikasi ini terhubung dengan ekosistem Pemantik yang sudah berjalan di `apps/web` (panel admin, guru, sekolah, dan komunitas berbasis Next.js).

### Filosofi Utama

Aplikasi ini bukan aplikasi belajar mandiri. Ia adalah **alat asesmen** yang dioperasikan siswa — sering kali dengan pendampingan guru. Prioritas utama adalah:

- **Navigasi yang jelas dan tidak membingungkan** — siswa (termasuk yang baru pertama kali pegang tablet) harus bisa memahami apa yang harus dilakukan tanpa instruksi verbal panjang.
- **Stabil dan dapat diandalkan** — lebih baik sederhana dan tidak pernah error daripada kaya fitur tapi sering bermasalah.
- **Tanpa distraksi gamifikasi** — tidak ada poin, streak, lencana, atau elemen kompetitif. Fokus sepenuhnya pada pengerjaan soal.
- **Offline-first** — seluruh asesmen berjalan tanpa koneksi internet. Sinkronisasi terjadi otomatis di latar belakang saat online.

### Relasi dengan Database yang Ada

Aplikasi mobile membaca dan menulis ke tabel-tabel Supabase berikut:

| Tabel | Peran |
|---|---|
| `students` | Identitas dan kredensial siswa |
| `assessment_access` | Paket ujian yang boleh diakses siswa/sekolah/kelas |
| `assessment_packages` | Metadata paket soal (nama, mata pelajaran, batas waktu) |
| `assessment_package_questions` | Daftar soal dalam sebuah paket |
| `questions` | Konten soal (teks, audio, video, gambar, opsi, jawaban benar) |
| `question_levels` + `question_categories` | Hierarki level per mata pelajaran |
| `assessment_sessions` | Sesi pengerjaan ujian oleh siswa |
| `student_answers` | Jawaban siswa per soal |

---

## 2. Prinsip Desain — Brand PSPK

Seluruh antarmuka aplikasi mengikuti Brand Guidelines PSPK secara konsisten. Tagline visual utama adalah: **"Bersih, Sederhana, dan Elegan"**.

### Palet Warna

```dart
// core/theme/app_colors.dart
class AppColors {
  // === WARNA PRIMER PSPK ===
  static const birNavy    = Color(0xFF102E50); // Dominan: teks, header, elemen utama
  static const kuningEmas = Color(0xFFF2AF3E); // Aksen: tombol CTA utama
  static const merahMarun = Color(0xFFA8281C); // Aksen: status penting, peringatan

  // === WARNA SEKUNDER PSPK ===
  static const jingga     = Color(0xFFDF632F); // Tombol sekunder, highlight
  static const birTeal    = Color(0xFF0874AA); // Info, link
  static const kuningMuda = Color(0xFFF4B867); // Background aksen lembut

  // === TURUNAN (saturasi dari primer) ===
  static const birNavyMuda  = Color(0xFFEEF4FA); // Background card, halaman
  static const birNavyGelap = Color(0xFF0A1F38); // Teks heading utama

  // === SEMANTIK ===
  static const sukses   = Color(0xFF22C55E); // Konfirmasi berhasil
  static const gagal    = Color(0xFFA8281C); // Gunakan merahMarun PSPK

  // === NETRAL ===
  static const background = Color(0xFFF9FAFB); // Latar halaman
  static const surface    = Color(0xFFFFFFFF); // Latar kartu/komponen
  static const textMuted  = Color(0xFF6B7280); // Teks sekunder
  static const border     = Color(0xFFE5E7EB); // Garis pembatas
}
```

### Tipografi

Sesuai Brand Guidelines PSPK, gunakan dua typeface:

```dart
// core/theme/app_text_styles.dart
class AppTextStyles {
  // LORA — untuk judul dan heading (formal, elegan)
  static final heading1 = GoogleFonts.lora(
    fontSize: 26, fontWeight: FontWeight.bold,
    color: AppColors.birNavyGelap, height: 1.3,
  );

  static final heading2 = GoogleFonts.lora(
    fontSize: 20, fontWeight: FontWeight.w600,
    color: AppColors.birNavyGelap, height: 1.4,
  );

  // Lora juga digunakan untuk teks soal — konsisten dengan konten akademis
  static final questionText = GoogleFonts.lora(
    fontSize: 18, fontWeight: FontWeight.normal,
    color: AppColors.birNavyGelap, height: 1.7,
  );

  // RUBIK — untuk body, tombol, label UI (ramah, mudah dibaca anak)
  static final bodyLarge = GoogleFonts.rubik(
    fontSize: 16, fontWeight: FontWeight.normal,
    color: AppColors.birNavy, height: 1.5,
  );

  static final bodyMedium = GoogleFonts.rubik(
    fontSize: 14, fontWeight: FontWeight.normal,
    color: AppColors.birNavy, height: 1.5,
  );

  static final label = GoogleFonts.rubik(
    fontSize: 13, fontWeight: FontWeight.w500,
    color: AppColors.textMuted,
  );

  static final buttonText = GoogleFonts.rubik(
    fontSize: 16, fontWeight: FontWeight.w600,
    color: Colors.white,
  );
}
```

### Aturan Visual yang Wajib Dipatuhi

| Aturan | Penerapan |
|---|---|
| Layout bersih, banyak ruang putih | Padding konsisten 20–24dp di semua halaman |
| Tidak terlalu banyak elemen visual | Maksimal 3 elemen focal point per layar |
| Ikon selalu outline, bukan solid | Gunakan `Icons.*_outlined` atau paket Lucide outline |
| Warna di luar palet PSPK dilarang | Tidak ada warna random, semua dari `AppColors` |
| Tombol utama selalu `kuningEmas` | Satu CTA dominan per layar |
| Hierarki teks jelas | Heading Lora besar → body Rubik lebih kecil |
| Tidak ada elemen dekoratif berlebihan | Tidak ada gradien kompleks, bayangan tebal, animasi idle |

---

## 3. Arsitektur Sistem

Aplikasi menggunakan **Clean Architecture berlapis empat**:

```
┌──────────────────────────────────────────────────────────────────┐
│  UI LAYER                                                        │
│  Login  │  Dashboard  │  Pilih Asesmen  │  Soal  │  Hasil       │
├──────────────────────────────────────────────────────────────────┤
│  DOMAIN LAYER (Riverpod Providers / Notifiers)                   │
│  AuthNotifier  │  AssessmentListNotifier  │  AssessmentNotifier  │
│  SpeechService (STT on-device + Levenshtein Distance)            │
├──────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                      │
│  Drift SQLite (lokal)  │  SyncService  │  Repositories           │
├──────────────────────────────────────────────────────────────────┤
│  BACKEND                                                         │
│  Supabase Auth  │  Supabase DB  │  Storage  │  Connectivity+     │
└──────────────────────────────────────────────────────────────────┘
```

### State Management: Riverpod

Riverpod dipilih karena:
- Aliran data reaktif antara state lokal (Drift) dan remote (Supabase) tanpa boilerplate.
- `AsyncNotifierProvider` cocok untuk operasi yang bisa gagal dan perlu retry otomatis.
- Tidak bergantung pada `BuildContext` — provider bisa diakses dari service layer.
- Compile-safe — error terdeteksi di build time, bukan saat runtime.

---

## 4. Struktur Folder

```
apps/mobile/
├── pubspec.yaml
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── theme/
│   │   │   ├── app_theme.dart            # ThemeData utama
│   │   │   ├── app_colors.dart           # Konstanta warna PSPK
│   │   │   └── app_text_styles.dart      # TextStyle Lora + Rubik
│   │   ├── database/
│   │   │   ├── database.dart             # Drift AppDatabase
│   │   │   ├── daos/
│   │   │   │   ├── question_dao.dart
│   │   │   │   ├── answer_dao.dart
│   │   │   │   └── session_dao.dart
│   │   │   └── tables/
│   │   │       ├── local_questions.dart
│   │   │       ├── local_answers.dart
│   │   │       └── local_sessions.dart
│   │   ├── sync/
│   │   │   └── sync_service.dart         # Orkestrasi offline → online
│   │   ├── supabase/
│   │   │   └── supabase_client.dart      # Singleton Supabase client
│   │   ├── router/
│   │   │   └── app_router.dart           # Definisi rute + guard auth
│   │   └── utils/
│   │       ├── levenshtein.dart           # Algoritma jarak edit
│   │       └── audio_helpers.dart         # Path + format file audio
│   │
│   ├── shared/
│   │   └── widgets/
│   │       ├── pspk_button.dart           # Tombol CTA standar PSPK
│   │       ├── pspk_card.dart             # Kartu standar PSPK
│   │       ├── connection_banner.dart      # Banner status offline
│   │       └── loading_overlay.dart       # Loading state
│   │
│   └── features/
│       ├── auth/
│       │   ├── providers/
│       │   │   └── auth_provider.dart
│       │   ├── widgets/
│       │   │   ├── numpad_widget.dart     # Numpad kustom 12 tombol
│       │   │   └── pin_display.dart       # Tampilan ● ● ● ● ●
│       │   └── pages/
│       │       └── login_page.dart
│       │
│       ├── dashboard/
│       │   ├── providers/
│       │   │   └── dashboard_provider.dart
│       │   └── pages/
│       │       └── dashboard_page.dart
│       │
│       ├── assessment/
│       │   ├── providers/
│       │   │   ├── assessment_list_provider.dart
│       │   │   └── assessment_provider.dart
│       │   ├── question_types/
│       │   │   ├── multiple_choice_widget.dart
│       │   │   ├── image_choice_widget.dart
│       │   │   ├── drag_drop_widget.dart
│       │   │   ├── audio_question_widget.dart
│       │   │   ├── video_question_widget.dart
│       │   │   └── voice_recording_widget.dart
│       │   ├── widgets/
│       │   │   ├── progress_bar.dart       # Progress bar sederhana linear
│       │   │   └── answer_card.dart
│       │   └── pages/
│       │       ├── assessment_list_page.dart  # Daftar asesmen tersedia
│       │       ├── assessment_lobby_page.dart # Konfirmasi sebelum mulai
│       │       ├── question_page.dart          # Engine soal
│       │       └── result_page.dart
│       │
│       └── profile/
│           └── pages/
│               └── profile_page.dart          # Nama, kelas, sekolah
```

---

## 5. Dependensi & pubspec.yaml

```yaml
name: pemantik_mobile
description: Aplikasi asesmen siswa Pemantik — offline-first, sederhana, stabil
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"
  flutter: ">=3.13.0"

dependencies:
  flutter:
    sdk: flutter

  # Backend & Auth
  supabase_flutter: ^2.3.0

  # Database Lokal (Offline-First)
  drift: ^2.14.0
  sqlite3_flutter_libs: ^0.5.0
  path_provider: ^2.1.0
  path: ^1.9.0

  # State Management
  flutter_riverpod: ^2.4.0
  riverpod_annotation: ^2.3.0

  # Konektivitas & Penyimpanan Aman
  connectivity_plus: ^5.0.0
  flutter_secure_storage: ^9.0.0

  # Media: Audio
  audioplayers: ^5.2.0
  record: ^5.0.0                 # Rekam suara siswa
  speech_to_text: ^6.3.0         # STT on-device (offline)

  # Media: Video
  video_player: ^2.8.0
  youtube_player_flutter: ^9.0.0 # Embed YouTube otomatis

  # Media: Gambar
  cached_network_image: ^3.3.0

  # Tipografi & UI
  google_fonts: ^6.1.0           # Lora + Rubik (font resmi PSPK)

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.0
  drift_dev: ^2.14.0
  riverpod_generator: ^2.3.0
  flutter_lints: ^3.0.0
```

> **Catatan:** Package `lottie` (animasi confetti) sengaja dihapus dari versi ini. Tidak ada gamifikasi visual yang memerlukan animasi berat. Animasi yang ada hanya transisi halaman standar Flutter dan feedback tap sederhana.

---

## 6. Fitur 1 — Autentikasi: Login Username + PIN

### Konsep

Siswa tidak memiliki email. Kredensial di-generate otomatis saat admin memasukkan data siswa di panel web. Siswa hanya perlu mengetik **username** (yang bisa tertulis di kartu/lembar dari guru) dan **PIN 6 digit**.

Tidak ada keyboard sistem yang muncul. Semua input dilakukan via widget kustom di layar.

### Alur Login

```
[1] Siswa ketik username via keyboard sistem (field biasa)
        ↓
[2] Siswa ketuk tombol angka PIN satu per satu (numpad kustom)
        ↓
[3] Tekan "Masuk"
        ↓
[4] Panggil Supabase Edge Function: authenticate_student(username, pin)
        ↓
[5] Edge Function: verifikasi bcrypt(pin) vs pin_hash di tabel students
        ↓
[6] Jika valid → kembalikan student_id + data siswa + custom JWT
        ↓
[7] Simpan JWT ke flutter_secure_storage
[7] Simpan data siswa ke Drift (nama, kelas, sekolah)
        ↓
[8] SyncService: download paket soal yang tersedia
        ↓
[9] Navigate ke Dashboard
```

### Supabase Edge Function: `authenticate-student`

```typescript
// supabase/functions/authenticate-student/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";

serve(async (req) => {
  const { username, pin } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Cari siswa berdasarkan username
  const { data: student, error } = await supabase
    .from("students")
    .select(`
      id, pin_hash, full_name, is_active,
      school_id, class_id, username,
      classes (name, grade),
      schools (name)
    `)
    .eq("username", username)
    .eq("is_active", true)
    .single();

  if (error || !student) {
    return new Response(
      JSON.stringify({ error: "Username tidak ditemukan" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verifikasi PIN
  const valid = await bcrypt.compare(pin, student.pin_hash);
  if (!valid) {
    return new Response(
      JSON.stringify({ error: "PIN salah" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Generate custom JWT dengan expiry 7 hari
  const token = await generateStudentToken(student.id);

  return new Response(
    JSON.stringify({ token, student }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
```

### Halaman Login

Halaman login sengaja dibuat **sangat sederhana**. Dua area: username di atas, numpad PIN di bawah. Tidak ada ilustrasi berat, tidak ada animasi masuk yang panjang.

```
┌─────────────────────────────┐
│                             │
│    [Logo PSPK — kecil]      │
│                             │
│    Nama Pengguna            │
│   ┌─────────────────────┐   │
│   │ username siswa...   │   │
│   └─────────────────────┘   │
│                             │
│    PIN                      │
│    ● ● ● ● ● ○             │
│                             │
│  ┌───┐  ┌───┐  ┌───┐       │
│  │ 1 │  │ 2 │  │ 3 │       │
│  ├───┤  ├───┤  ├───┤       │
│  │ 4 │  │ 5 │  │ 6 │       │
│  ├───┤  ├───┤  ├───┤       │
│  │ 7 │  │ 8 │  │ 9 │       │
│  ├───┤  ├───┤  ├───┤       │
│  │ ⌫ │  │ 0 │  │ ✓ │       │
│  └───┘  └───┘  └───┘       │
│                             │
└─────────────────────────────┘
```

```dart
// features/auth/widgets/numpad_widget.dart
class NumpadWidget extends StatelessWidget {
  final Function(String) onDigitPressed;
  final VoidCallback onDelete;
  final VoidCallback onConfirm;
  final bool confirmEnabled;

  const NumpadWidget({
    required this.onDigitPressed,
    required this.onDelete,
    required this.onConfirm,
    this.confirmEnabled = false,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.6,
      children: [
        ...['1','2','3','4','5','6','7','8','9'].map(
          (d) => _NumpadKey(label: d, onPressed: () => onDigitPressed(d)),
        ),
        _NumpadKey(label: '⌫', onPressed: onDelete, variant: KeyVariant.action),
        _NumpadKey(label: '0', onPressed: () => onDigitPressed('0')),
        _NumpadKey(
          label: 'Masuk',
          onPressed: confirmEnabled ? onConfirm : null,
          variant: KeyVariant.primary,
        ),
      ],
    );
  }
}

enum KeyVariant { normal, action, primary }

class _NumpadKey extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final KeyVariant variant;

  const _NumpadKey({
    required this.label,
    this.onPressed,
    this.variant = KeyVariant.normal,
  });

  @override
  Widget build(BuildContext context) {
    final bg = switch (variant) {
      KeyVariant.primary => onPressed != null ? AppColors.kuningEmas : AppColors.border,
      KeyVariant.action  => AppColors.birNavyMuda,
      KeyVariant.normal  => AppColors.surface,
    };

    final textColor = switch (variant) {
      KeyVariant.primary => Colors.white,
      KeyVariant.action  => AppColors.birNavy,
      KeyVariant.normal  => AppColors.birNavy,
    };

    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onPressed,
        child: Center(
          child: Text(
            label,
            style: AppTextStyles.buttonText.copyWith(
              color: textColor,
              fontSize: label.length > 1 ? 13 : 22,
            ),
          ),
        ),
      ),
    );
  }
}
```

---

## 7. Fitur 2 — Dashboard: Halaman Utama Siswa

### Konsep

Dashboard adalah halaman pertama setelah login. Fungsinya **satu hal saja**: menampilkan siapa siswa ini dan memberi akses ke asesmen yang tersedia. Tidak ada elemen dekoratif berlebihan, tidak ada angka skor, tidak ada progress visual yang kompleks.

### Layout Dashboard

```
┌─────────────────────────────────┐
│  ← (tidak ada — ini home)       │
│                                 │
│  Halo, Budi! 👋                 │  ← Sapaan hangat dengan nama siswa
│  Kelas 4 · SDN Maju Bersama     │  ← Info kelas dan sekolah (kecil, muted)
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Asesmen yang Tersedia          │  ← Section header
│                                 │
│  ┌─────────────────────────┐    │
│  │  📖 Literasi            │    │  ← Kartu asesmen
│  │  Membaca & Menulis      │    │
│  │  30 soal · 60 menit     │    │
│  │              [Mulai →]  │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🔢 Numerasi            │    │
│  │  Berhitung              │    │
│  │  25 soal · 45 menit     │    │
│  │              [Mulai →]  │    │
│  └─────────────────────────┘    │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Riwayat Asesmen                │  ← Section sederhana
│  Literasi · Selesai · 10 Jun    │
│  Numerasi · Selesai · 8 Jun     │
│                                 │
└─────────────────────────────────┘
         [Profil Saya]             ←  Bottom navigation (2 tab saja)
```

### Aturan Konten Dashboard

- Tampilkan **hanya paket asesmen yang memang tersedia** untuk siswa ini (berdasarkan `assessment_access` sesuai `school_id` atau `class_id` siswa).
- Jika belum ada asesmen yang diberikan: tampilkan pesan kosong yang jelas — "Belum ada asesmen yang tersedia. Tanya gurumu ya."
- Jika siswa sudah mengerjakan sebuah asesmen dan nilainya sudah di-submit: tampilkan badge "Selesai" di kartu itu. Tombol "Mulai" berubah menjadi "Lihat Hasil".
- Jika `assessment_access.max_attempts > 1` dan masih ada attempt tersisa: tampilkan "Coba Lagi".

### Kode: Dashboard Page

```dart
// features/dashboard/pages/dashboard_page.dart
class DashboardPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final student = ref.watch(currentStudentProvider);
    final assessments = ref.watch(availableAssessmentsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header: sapaan siswa
            _DashboardHeader(student: student),

            // Status offline (muncul hanya jika offline)
            const ConnectionBanner(),

            // Daftar asesmen
            Expanded(
              child: assessments.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => _ErrorState(message: e.toString()),
                data: (list) => list.isEmpty
                    ? const _EmptyState()
                    : _AssessmentList(assessments: list),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _BottomNav(),
    );
  }
}

class _DashboardHeader extends StatelessWidget {
  final Student student;

  const _DashboardHeader({required this.student});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Halo, ${student.firstName}!', style: AppTextStyles.heading1),
          const SizedBox(height: 4),
          Text(
            '${student.className} · ${student.schoolName}',
            style: AppTextStyles.label,
          ),
        ],
      ),
    );
  }
}

class _AssessmentCard extends StatelessWidget {
  final AssessmentPackage package;
  final AssessmentStatus status; // available | completed | locked

  const _AssessmentCard({required this.package, required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Judul asesmen
            Text(package.name, style: AppTextStyles.heading2),
            const SizedBox(height: 6),

            // Metadata (soal + waktu)
            Text(
              '${package.totalQuestions} soal · ${package.timeLimitMin} menit',
              style: AppTextStyles.label,
            ),

            const SizedBox(height: 16),

            // Tombol aksi
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Badge status
                if (status == AssessmentStatus.completed)
                  _StatusBadge(label: 'Selesai', color: AppColors.sukses),

                const Spacer(),

                // CTA
                PspkButton(
                  label: switch (status) {
                    AssessmentStatus.available  => 'Mulai',
                    AssessmentStatus.completed  => 'Lihat Hasil',
                    AssessmentStatus.retryable  => 'Coba Lagi',
                    AssessmentStatus.locked     => 'Belum Tersedia',
                  },
                  enabled: status != AssessmentStatus.locked,
                  onPressed: () => _handleTap(context),
                  size: ButtonSize.small,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.assignment_outlined, size: 64, color: AppColors.border),
            const SizedBox(height: 16),
            Text(
              'Belum ada asesmen',
              style: AppTextStyles.heading2,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Tanya gurumu kapan asesmen dimulai.',
              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textMuted),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 8. Fitur 3 — Pilih Asesmen

### Lobby Asesmen (Sebelum Mulai)

Sebelum soal pertama muncul, siswa diarahkan ke halaman konfirmasi. Ini penting karena:
- Siswa yang awam butuh konteks — "soal apa yang akan dikerjakan, berapa lama."
- Guru yang mendampingi butuh momen untuk memastikan siswa siap.
- Aplikasi perlu mengunci attempt (membuat `assessment_session` baru di Drift).

```
┌─────────────────────────────────┐
│  ←  Kembali                     │
│                                 │
│  📖 Literasi                    │  ← Nama asesmen (Heading Lora besar)
│  Membaca & Menulis              │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  30 soal                        │
│  Waktu: 60 menit                │
│  Tahap 1                        │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  ⚠ Petunjuk                     │
│  Kerjakan semua soal dengan     │
│  teliti. Kamu tidak bisa        │
│  kembali ke soal sebelumnya.    │
│                                 │
│                                 │
│  [        Mulai Sekarang       ]│  ← Tombol kuning besar, full width
│                                 │
└─────────────────────────────────┘
```

```dart
// features/assessment/pages/assessment_lobby_page.dart
class AssessmentLobbyPage extends ConsumerWidget {
  final String packageId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final package = ref.watch(packageDetailProvider(packageId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: const BackButton(color: AppColors.birNavy),
        title: const SizedBox.shrink(),
      ),
      body: package.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorState(message: e.toString()),
        data: (pkg) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(pkg.name, style: AppTextStyles.heading1),
              const SizedBox(height: 8),
              Text(pkg.description ?? '', style: AppTextStyles.bodyMedium),
              const SizedBox(height: 24),

              _InfoRow(icon: Icons.quiz_outlined,
                  label: '${pkg.totalQuestions} soal'),
              _InfoRow(icon: Icons.timer_outlined,
                  label: 'Waktu: ${pkg.timeLimitMin} menit'),
              _InfoRow(icon: Icons.layers_outlined,
                  label: pkg.phase ?? 'Tahap 1'),

              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 16),

              // Petunjuk
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.birNavyMuda,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline,
                        color: AppColors.birTeal, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Kerjakan semua soal dengan teliti. '
                        'Kamu tidak bisa kembali ke soal sebelumnya.',
                        style: AppTextStyles.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // CTA utama
              PspkButton(
                label: 'Mulai Sekarang',
                onPressed: () => ref
                    .read(assessmentProvider(packageId).notifier)
                    .startSession(),
                fullWidth: true,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## 9. Fitur 4 — Engine Soal Interaktif

### Struktur Halaman Soal

Satu `PageView` utama yang tidak bisa di-swipe manual. Navigasi hanya via tombol "Lanjut" setelah menjawab. Di atas layar ada progress bar linear sederhana.

```
┌─────────────────────────────────┐
│  Soal 3 dari 30                 │
│  [████████░░░░░░░░░░░░░░░░░░]  │  ← Progress bar linear, sederhana
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Bacalah kalimat berikut ini.   │  ← Instruksi (Rubik kecil, muted)
│                                 │
│  "Ibu memasak nasi              │  ← Teks soal (Lora, besar, terbaca)
│   di dapur setiap pagi."        │
│                                 │
│  Apa yang dilakukan ibu?        │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │ Memasak  │  │ Berlari  │    │  ← Kartu jawaban besar
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │ Tidur    │  │ Belajar  │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  [        Lanjut →            ] │  ← Aktif setelah dipilih
└─────────────────────────────────┘
```

### Dispatcher Tipe Soal

```dart
// features/assessment/pages/question_page.dart
class QuestionPage extends ConsumerWidget {
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(assessmentProvider(sessionId));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Progress bar linear di atas
            ProgressBar(
              current: state.currentIndex + 1,
              total: state.questions.length,
            ),

            // Area soal — tidak bisa di-swipe
            Expanded(
              child: PageView.builder(
                controller: state.pageController,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: state.questions.length,
                itemBuilder: (_, i) {
                  final q = state.questions[i];
                  return SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: _buildQuestionWidget(q, sessionId),
                  );
                },
              ),
            ),

            // Tombol Lanjut
            _NextButton(
              sessionId: sessionId,
              isLast: state.isLastQuestion,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionWidget(Question q, String sessionId) {
    return switch (q.questionType) {
      'multiple_choice' => MultipleChoiceWidget(question: q, sessionId: sessionId),
      'image_choice'    => ImageChoiceWidget(question: q, sessionId: sessionId),
      'audio'           => AudioQuestionWidget(question: q, sessionId: sessionId),
      'video'           => VideoQuestionWidget(question: q, sessionId: sessionId),
      'drag_drop'       => DragDropWidget(question: q, sessionId: sessionId),
      'voice_recording' => VoiceRecordingWidget(question: q, sessionId: sessionId),
      _                 => MultipleChoiceWidget(question: q, sessionId: sessionId),
    };
  }
}
```

### Progress Bar Sederhana

Tidak ada bintang atau ikon khusus — cukup bar linear yang mengisi seiring soal dijawab.

```dart
// features/assessment/widgets/progress_bar.dart
class ProgressBar extends StatelessWidget {
  final int current;
  final int total;

  const ProgressBar({required this.current, required this.total, super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Soal $current dari $total',
            style: AppTextStyles.label,
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: current / total,
              backgroundColor: AppColors.border,
              color: AppColors.kuningEmas,
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }
}
```

### Tipe Soal: Multiple Choice

```dart
// features/assessment/question_types/multiple_choice_widget.dart
class MultipleChoiceWidget extends ConsumerWidget {
  final Question question;
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(selectedAnswerProvider(question.id));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Instruksi (jika ada)
        if (question.options?['instruction'] != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              question.options!['instruction'],
              style: AppTextStyles.label,
            ),
          ),

        // Teks soal
        Text(question.questionText ?? '', style: AppTextStyles.questionText),
        const SizedBox(height: 24),

        // Grid pilihan — 2 kolom
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 2.2,
          ),
          itemCount: question.options?['choices']?.length ?? 0,
          itemBuilder: (_, i) {
            final choice = question.options!['choices'][i];
            final isSelected = selected == choice['value'];

            return GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                ref.read(assessmentProvider(sessionId).notifier)
                    .selectAnswer(question.id, choice['value']);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.birNavy : AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? AppColors.birNavy : AppColors.border,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                alignment: Alignment.center,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Text(
                  choice['label'],
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: isSelected ? Colors.white : AppColors.birNavy,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
```

### Tipe Soal: Drag & Drop

Mendukung dua mode yang terdeteksi otomatis dari format data di database:
- **Fill in the Blank:** Teks soal mengandung placeholder `___`, siswa menyeret kata ke celah.
- **Kategorisasi:** Siswa menyeret item ke kelompok yang sesuai.

```dart
// features/assessment/question_types/drag_drop_widget.dart
class DragDropWidget extends ConsumerWidget {
  final Question question;
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isFillBlank = question.questionText?.contains('___') ?? false;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(question.questionText ?? '', style: AppTextStyles.questionText),
        const SizedBox(height: 24),

        if (isFillBlank)
          _FillBlankDrop(question: question, sessionId: sessionId)
        else
          _CategorizeDrop(question: question, sessionId: sessionId),
      ],
    );
  }
}

// Drop zone — area penerima item yang diseret
class _DropZone extends StatelessWidget {
  final String zoneId;
  final String? currentItem;
  final Function(String) onAccept;

  @override
  Widget build(BuildContext context) {
    return DragTarget<String>(
      onAcceptWithDetails: (details) {
        HapticFeedback.mediumImpact();
        onAccept(details.data);
      },
      builder: (_, candidates, __) {
        final isHover = candidates.isNotEmpty;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          constraints: const BoxConstraints(minWidth: 80, minHeight: 48),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: isHover
                ? AppColors.kuningEmas.withOpacity(0.15)
                : AppColors.birNavyMuda,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isHover ? AppColors.kuningEmas : AppColors.border,
              width: isHover ? 2 : 1,
            ),
          ),
          child: currentItem != null
              ? Draggable<String>(
                  data: currentItem,
                  feedback: _DragFeedbackCard(text: currentItem!),
                  childWhenDragging: const SizedBox.shrink(),
                  child: Text(currentItem!, style: AppTextStyles.bodyMedium),
                )
              : Text('_ _ _',
                  style: AppTextStyles.label.copyWith(color: AppColors.border)),
        );
      },
    );
  }
}
```

### Tipe Soal: Audio

```dart
// features/assessment/question_types/audio_question_widget.dart
class AudioQuestionWidget extends ConsumerWidget {
  final Question question;
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isPlaying = ref.watch(isPlayingProvider(question.id));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (question.questionText?.isNotEmpty ?? false) ...[
          Text(question.questionText!, style: AppTextStyles.questionText),
          const SizedBox(height: 20),
        ],

        // Player tombol play sederhana — tidak perlu gelombang audio animasi
        GestureDetector(
          onTap: () => ref.read(assessmentProvider(sessionId).notifier)
              .toggleAudio(question.questionAudioUrl!),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            decoration: BoxDecoration(
              color: isPlaying ? AppColors.birNavy : AppColors.birNavyMuda,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.birNavy, width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isPlaying ? Icons.pause_outlined : Icons.volume_up_outlined,
                  color: isPlaying ? Colors.white : AppColors.birNavy,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Text(
                  isPlaying ? 'Jeda' : 'Putar Suara',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: isPlaying ? Colors.white : AppColors.birNavy,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 24),
        _ChoiceGrid(question: question, sessionId: sessionId),
      ],
    );
  }
}
```

### Tipe Soal: Video

```dart
// features/assessment/question_types/video_question_widget.dart
class VideoQuestionWidget extends ConsumerWidget {
  final Question question;
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final url = question.questionVideoUrl ?? '';
    final isYouTube = url.contains('youtube.com') || url.contains('youtu.be');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (question.questionText?.isNotEmpty ?? false) ...[
          Text(question.questionText!, style: AppTextStyles.questionText),
          const SizedBox(height: 16),
        ],

        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: isYouTube
                ? YoutubePlayer(
                    controller: YoutubePlayerController.fromVideoId(
                      videoId: YoutubePlayerController.convertUrlToId(url) ?? '',
                    ),
                  )
                : _LocalVideoPlayer(url: url),
          ),
        ),

        const SizedBox(height: 24),
        _ChoiceGrid(question: question, sessionId: sessionId),
      ],
    );
  }
}
```

---

## 10. Fitur 5 — Voice Recording & Analisis Pengucapan

### Pendekatan: On-Device STT + Levenshtein Distance

Rekaman ditranskripsi langsung di perangkat menggunakan `speech_to_text` (tidak butuh internet). Hasilnya dibandingkan dengan `correct_answer` dari database menggunakan Levenshtein Distance.

**Threshold toleransi** diambil dari kolom `passing_threshold` di `question_levels`, sehingga fleksibel per level dan dikendalikan penuh oleh admin soal.

### Algoritma Levenshtein

```dart
// core/utils/levenshtein.dart

/// Mengembalikan nilai similarity 0.0 (tidak mirip) hingga 1.0 (identik)
double calculateSimilarity(String input, String target) {
  final s1 = input.toLowerCase().trim();
  final s2 = target.toLowerCase().trim();

  if (s1 == s2) return 1.0;
  if (s1.isEmpty || s2.isEmpty) return 0.0;

  final dist = _levenshtein(s1, s2);
  return 1.0 - (dist / max(s1.length, s2.length));
}

int _levenshtein(String s, String t) {
  final m = s.length, n = t.length;
  final dp = List.generate(m + 1, (_) => List.filled(n + 1, 0));

  for (int i = 0; i <= m; i++) dp[i][0] = i;
  for (int j = 0; j <= n; j++) dp[0][j] = j;

  for (int i = 1; i <= m; i++) {
    for (int j = 1; j <= n; j++) {
      dp[i][j] = s[i - 1] == t[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + [dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]].reduce(min);
    }
  }
  return dp[m][n];
}
```

### Widget Voice Recording

Tampilannya sengaja sederhana: satu tombol besar "Rekam", satu tombol "Selesai", satu area feedback teks. Tidak ada visualisasi gelombang suara yang kompleks.

```dart
// features/assessment/question_types/voice_recording_widget.dart
class VoiceRecordingWidget extends ConsumerStatefulWidget {
  final Question question;
  final String sessionId;

  @override
  ConsumerState<VoiceRecordingWidget> createState() =>
      _VoiceRecordingWidgetState();
}

class _VoiceRecordingWidgetState extends ConsumerState<VoiceRecordingWidget> {
  final SpeechToText _stt = SpeechToText();
  final AudioRecorder _recorder = AudioRecorder();

  RecordState _state = RecordState.idle;
  // idle | recording | analyzing | done
  String _transcription = '';
  bool? _isCorrect;
  String? _localPath;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Teks soal
        if (widget.question.questionText?.isNotEmpty ?? false) ...[
          Text(widget.question.questionText!, style: AppTextStyles.questionText),
          const SizedBox(height: 24),
        ],

        // Kata target (jika soal menampilkannya)
        if (widget.question.options?['show_target'] == true)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.birNavyMuda,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Text(
              widget.question.options?['display_text'] ?? '',
              style: AppTextStyles.heading2,
              textAlign: TextAlign.center,
            ),
          ),

        const SizedBox(height: 32),

        // Tombol rekam
        Center(
          child: Column(
            children: [
              GestureDetector(
                onTap: _handleRecordTap,
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _state == RecordState.recording
                        ? AppColors.merahMarun
                        : AppColors.birNavy,
                  ),
                  child: Icon(
                    _state == RecordState.recording
                        ? Icons.stop_outlined
                        : Icons.mic_outlined,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                switch (_state) {
                  RecordState.idle      => 'Tekan untuk merekam',
                  RecordState.recording => 'Sedang merekam... Tekan untuk berhenti',
                  RecordState.analyzing => 'Menganalisis...',
                  RecordState.done      => 'Selesai',
                },
                style: AppTextStyles.label,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),

        // Hasil analisis
        if (_state == RecordState.done && _transcription.isNotEmpty) ...[
          const SizedBox(height: 24),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _isCorrect == true
                  ? AppColors.sukses.withOpacity(0.1)
                  : AppColors.merahMarun.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _isCorrect == true
                    ? AppColors.sukses
                    : AppColors.merahMarun,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Kamu mengucapkan:', style: AppTextStyles.label),
                const SizedBox(height: 4),
                Text('"$_transcription"', style: AppTextStyles.bodyMedium),
                const SizedBox(height: 8),
                Text(
                  _isCorrect == true ? 'Bagus sekali!' : 'Coba ucapkan lagi ya.',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: _isCorrect == true
                        ? AppColors.sukses
                        : AppColors.merahMarun,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _handleRecordTap() async {
    if (_state == RecordState.idle || _state == RecordState.done) {
      await _startRecording();
    } else if (_state == RecordState.recording) {
      await _stopAndAnalyze();
    }
  }

  Future<void> _startRecording() async {
    if (!await _recorder.hasPermission()) return;
    final dir = await getTemporaryDirectory();
    _localPath = '${dir.path}/rec_${widget.question.id}_${DateTime.now().millisecondsSinceEpoch}.m4a';

    await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: _localPath!);
    setState(() => _state = RecordState.recording);
  }

  Future<void> _stopAndAnalyze() async {
    await _recorder.stop();
    setState(() => _state = RecordState.analyzing);

    final targetText = (widget.question.correctAnswer['text'] as String?) ?? '';
    String transcribed = '';

    final available = await _stt.initialize();
    if (available) {
      await _stt.listen(
        onResult: (r) => transcribed = r.recognizedWords,
        listenFor: const Duration(seconds: 8),
      );
      await Future.delayed(const Duration(seconds: 3));
      await _stt.stop();
    }

    // Ambil threshold dari data level
    final level = await ref.read(currentLevelProvider.future);
    final threshold = (level.passingThreshold ?? 70) / 100.0;
    final similarity = calculateSimilarity(transcribed, targetText);
    final correct = similarity >= threshold;

    // Simpan ke Drift
    await ref.read(assessmentProvider(widget.sessionId).notifier).saveVoiceAnswer(
      questionId: widget.question.id,
      transcription: transcribed,
      similarity: similarity,
      isCorrect: correct,
      localAudioPath: _localPath,
    );

    setState(() {
      _transcription = transcribed;
      _isCorrect = correct;
      _state = RecordState.done;
    });
  }
}

enum RecordState { idle, recording, analyzing, done }
```

### Alur Upload Audio (Saat Online)

```
[OFFLINE]
Rekam → simpan .m4a di temp directory lokal
Simpan LocalAnswer:
  - recording_local_path = "/tmp/rec_xxx.m4a"
  - recording_url        = null
  - sync_status          = "pending_audio_upload"

[ONLINE — SyncService aktif]
1. Temukan LocalAnswer dengan sync_status = "pending_audio_upload"
2. Upload .m4a ke Supabase Storage: recordings/{session_id}/{question_id}.m4a
3. Dapatkan URL publik
4. Update LocalAnswer:
   - recording_url        = "https://[project].supabase.co/storage/..."
   - recording_local_path = null
   - sync_status          = "pending"
5. Hapus file .m4a lokal
6. Lanjutkan sinkronisasi normal ke tabel student_answers
```

---

## 11. Fitur 6 — Halaman Hasil Asesmen

### Prinsip: Tidak Ada Angka Skor

Siswa hanya melihat dua kemungkinan layar — lulus ke level berikutnya, atau tetap di level yang sama dan bisa mencoba lagi. Tidak ada persentase, tidak ada rangking.

### Layar Lulus (Naik Level)

Tampil ketika jawaban benar ≥ `passing_threshold` dari `question_levels`.

```
┌─────────────────────────────────┐
│                                 │
│        [Ikon centang besar]     │
│           ✓                     │
│                                 │
│     Selamat, kamu berhasil!     │  ← Lora, besar, navy
│                                 │
│   Kamu sudah menyelesaikan      │
│   Literasi · Level 2.           │  ← Info level yang selesai
│                                 │
│                                 │
│  [   Kembali ke Beranda   ]     │  ← Tombol kuning full width
│                                 │
└─────────────────────────────────┘
```

```dart
// features/assessment/pages/result_page.dart
class ResultSuccessPage extends StatelessWidget {
  final String categoryName;
  final int levelNumber;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // Ikon centang — tidak ada animasi confetti
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.sukses.withOpacity(0.12),
                ),
                child: const Icon(
                  Icons.check_outlined,
                  color: AppColors.sukses,
                  size: 52,
                ),
              ),

              const SizedBox(height: 32),

              Text(
                'Selamat, kamu berhasil!',
                style: AppTextStyles.heading1,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Kamu sudah menyelesaikan\n$categoryName · Level $levelNumber.',
                style: AppTextStyles.bodyLarge.copyWith(color: AppColors.textMuted),
                textAlign: TextAlign.center,
              ),

              const Spacer(),

              PspkButton(
                label: 'Kembali ke Beranda',
                onPressed: () => Navigator.of(context)
                    .pushNamedAndRemoveUntil('/dashboard', (_) => false),
                fullWidth: true,
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
```

### Layar Belum Lulus (Coba Lagi)

```dart
class ResultRetryPage extends StatelessWidget {
  final String categoryName;
  final int levelNumber;
  final String packageId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.kuningEmas.withOpacity(0.12),
                ),
                child: const Icon(
                  Icons.refresh_outlined,
                  color: AppColors.kuningEmas,
                  size: 48,
                ),
              ),

              const SizedBox(height: 32),

              Text(
                'Kamu masih berada\ndi Level $levelNumber',
                style: AppTextStyles.heading1,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Tidak apa-apa. Coba lagi dan kamu\npasti bisa!',
                style: AppTextStyles.bodyLarge.copyWith(color: AppColors.textMuted),
                textAlign: TextAlign.center,
              ),

              const Spacer(),

              PspkButton(
                label: 'Coba Lagi',
                onPressed: () => Navigator.of(context).pushReplacementNamed(
                  '/assessment/lobby',
                  arguments: packageId,
                ),
                fullWidth: true,
              ),

              const SizedBox(height: 12),

              TextButton(
                onPressed: () => Navigator.of(context)
                    .pushNamedAndRemoveUntil('/dashboard', (_) => false),
                child: Text(
                  'Kembali ke Beranda',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.birTeal,
                  ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## 12. Skema Database Lokal (Drift/SQLite)

```dart
// core/database/tables/local_questions.dart
class LocalQuestions extends Table {
  TextColumn    get id               => text()();
  TextColumn    get levelId          => text()();
  TextColumn    get packageId        => text()();
  TextColumn    get subjectArea      => text()();
  TextColumn    get questionType     => text()();
  TextColumn    get questionText     => text().nullable()();
  TextColumn    get questionAudioUrl => text().nullable()();
  TextColumn    get questionVideoUrl => text().nullable()();
  TextColumn    get questionImageUrl => text().nullable()();
  TextColumn    get optionsJson      => text().nullable()();  // JSON
  TextColumn    get correctAnswerJson => text()();            // JSON
  IntColumn     get version          => integer().withDefault(const Constant(1))();
  IntColumn     get orderIndex       => integer().withDefault(const Constant(0))();
  DateTimeColumn get cachedAt        => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

// core/database/tables/local_sessions.dart
class LocalSessions extends Table {
  TextColumn    get id            => text()();
  TextColumn    get studentId     => text()();
  TextColumn    get packageId     => text()();
  TextColumn    get schoolId      => text()();
  TextColumn    get levelId       => text().nullable()();
  TextColumn    get phase         => text().withDefault(const Constant('Tahap 1'))();
  TextColumn    get status        => text().withDefault(const Constant('pending'))();
  // status: pending | in_progress | completed
  IntColumn     get attemptNumber => integer().withDefault(const Constant(1))();
  IntColumn     get currentQuestionIndex => integer().withDefault(const Constant(0))();
  DateTimeColumn get startedAt   => dateTime().nullable()();
  DateTimeColumn get completedAt => dateTime().nullable()();
  IntColumn     get timeSpentSec => integer().nullable()();
  TextColumn    get syncStatus   => text().withDefault(const Constant('pending'))();
  // syncStatus: pending | syncing | synced | failed
  DateTimeColumn get createdAt   => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

// core/database/tables/local_answers.dart
class LocalAnswers extends Table {
  TextColumn    get id                 => text()();
  TextColumn    get sessionId          => text()();
  TextColumn    get questionId         => text()();
  TextColumn    get answerData         => text()();         // JSON
  TextColumn    get recordingLocalPath => text().nullable()(); // Sebelum upload
  TextColumn    get recordingUrl       => text().nullable()(); // Setelah upload
  BoolColumn    get isCorrect          => boolean().nullable()();
  RealColumn    get score              => real().nullable()();
  IntColumn     get timeSpentSec       => integer().nullable()();
  TextColumn    get status             => text().withDefault(const Constant('answered'))();
  TextColumn    get syncStatus         => text().withDefault(const Constant('pending'))();
  // syncStatus: pending | pending_audio_upload | uploading_audio | syncing | synced | failed
  DateTimeColumn get answeredAt        => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
```

---

## 13. Strategi Sinkronisasi Offline-First

```dart
// core/sync/sync_service.dart
class SyncService {
  final SupabaseClient _supabase;
  final AppDatabase _db;

  SyncService({required SupabaseClient supabase, required AppDatabase db})
      : _supabase = supabase,
        _db = db {
    // Dengarkan perubahan konektivitas
    Connectivity().onConnectivityChanged.listen((result) {
      if (result != ConnectivityResult.none) {
        syncAll();
      }
    });
  }

  /// Urutan sync yang benar: download soal → upload audio → upload jawaban → upload sesi
  Future<void> syncAll() async {
    await _downloadPackages();    // Unduh paket soal terbaru
    await _uploadAudioFiles();    // Upload rekaman suara dulu
    await _uploadAnswers();       // Baru upload data jawaban
    await _uploadSessions();      // Terakhir update status sesi
  }

  Future<void> _downloadPackages() async {
    // Ambil student dari Drift
    final student = await _db.sessionDao.getCurrentStudent();
    if (student == null) return;

    // Query paket yang boleh diakses (by school atau class)
    final accessRows = await _supabase
        .from('assessment_access')
        .select('package_id, valid_from, valid_until, max_attempts, phase')
        .or('target_id.eq.${student.schoolId},target_id.eq.${student.classId}')
        .eq('is_active', true)
        .gte('valid_until', DateTime.now().toIso8601String());

    for (final row in accessRows) {
      final packageId = row['package_id'] as String;

      // Ambil soal-soal dalam paket
      final questions = await _supabase
          .from('assessment_package_questions')
          .select('order_index, questions(*)')
          .eq('package_id', packageId)
          .order('order_index');

      // Simpan ke Drift (upsert berdasarkan id + version)
      for (final q in questions) {
        await _db.questionDao.upsertQuestion(
          LocalQuestionsCompanion(
            id:               Value(q['questions']['id']),
            packageId:        Value(packageId),
            levelId:          Value(q['questions']['level_id'] ?? ''),
            subjectArea:      Value(q['questions']['subject_area']),
            questionType:     Value(q['questions']['question_type']),
            questionText:     Value(q['questions']['question_text']),
            questionAudioUrl: Value(q['questions']['question_audio_url']),
            questionVideoUrl: Value(q['questions']['question_video_url']),
            questionImageUrl: Value(q['questions']['question_image_url']),
            optionsJson:      Value(jsonEncode(q['questions']['options'])),
            correctAnswerJson:Value(jsonEncode(q['questions']['correct_answer'])),
            version:          Value(q['questions']['version']),
            orderIndex:       Value(q['order_index']),
            cachedAt:         Value(DateTime.now()),
          ),
        );
      }
    }
  }

  Future<void> _uploadAudioFiles() async {
    final pending = await _db.answerDao.getAnswersByStatus('pending_audio_upload');

    for (final answer in pending) {
      if (answer.recordingLocalPath == null) continue;

      try {
        await _db.answerDao.updateSyncStatus(answer.id, 'uploading_audio');
        final file = File(answer.recordingLocalPath!);

        if (!await file.exists()) {
          await _db.answerDao.updateSyncStatus(answer.id, 'failed');
          continue;
        }

        final path = 'recordings/${answer.sessionId}/${answer.questionId}.m4a';
        await _supabase.storage.from('student-recordings').upload(path, file);
        final url = _supabase.storage.from('student-recordings').getPublicUrl(path);

        await _db.answerDao.updateRecordingUrl(
          answer.id, url: url, syncStatus: 'pending',
        );
        await file.delete(); // Hapus file lokal setelah berhasil upload
      } catch (_) {
        await _db.answerDao.updateSyncStatus(answer.id, 'failed');
      }
    }
  }

  Future<void> _uploadAnswers() async {
    final pending = await _db.answerDao.getAnswersByStatus('pending');

    for (final answer in pending) {
      if (answer.recordingLocalPath != null) continue; // Audio belum selesai upload

      try {
        await _supabase.from('student_answers').upsert({
          'id':            answer.id,
          'session_id':    answer.sessionId,
          'question_id':   answer.questionId,
          'answer_data':   jsonDecode(answer.answerData),
          'recording_url': answer.recordingUrl,
          'is_correct':    answer.isCorrect,
          'score':         answer.score,
          'time_spent_sec':answer.timeSpentSec,
          'status':        answer.status,
          'answered_at':   answer.answeredAt.toIso8601String(),
          'sync_status':   'synced',
        });

        await _db.answerDao.updateSyncStatus(answer.id, 'synced');
      } catch (_) {
        await _db.answerDao.updateSyncStatus(answer.id, 'failed');
      }
    }
  }

  Future<void> _uploadSessions() async {
    final pending = await _db.sessionDao.getSessionsByStatus('pending');

    for (final session in pending) {
      if (session.status != 'completed') continue;

      try {
        await _supabase.from('assessment_sessions').upsert({
          'id':            session.id,
          'student_id':    session.studentId,
          'package_id':    session.packageId,
          'school_id':     session.schoolId,
          'status':        session.status,
          'started_at':    session.startedAt?.toIso8601String(),
          'completed_at':  session.completedAt?.toIso8601String(),
          'time_spent_sec':session.timeSpentSec,
          'sync_status':   'synced',
          'synced_at':     DateTime.now().toIso8601String(),
        });

        await _db.sessionDao.updateSyncStatus(session.id, 'synced');
      } catch (_) {
        await _db.sessionDao.updateSyncStatus(session.id, 'failed');
      }
    }
  }
}
```

### Banner Status Offline

Muncul di atas Dashboard hanya jika tidak ada koneksi. Satu baris, tidak mencolok.

```dart
// shared/widgets/connection_banner.dart
class ConnectionBanner extends ConsumerWidget {
  const ConnectionBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectivity = ref.watch(connectivityProvider);

    return connectivity.when(
      data: (result) => result == ConnectivityResult.none
          ? Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              color: AppColors.kuningMuda,
              child: Row(
                children: [
                  const Icon(Icons.cloud_off_outlined,
                      size: 16, color: AppColors.birNavy),
                  const SizedBox(width: 8),
                  Text(
                    'Tidak ada koneksi internet. Jawabanmu tetap tersimpan.',
                    style: AppTextStyles.label.copyWith(color: AppColors.birNavy),
                  ),
                ],
              ),
            )
          : const SizedBox.shrink(),
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}
```

---

## 14. Panduan UI/UX Lengkap

### Komponen Bersama

#### PspkButton

Satu tombol standar untuk semua CTA di aplikasi. Konsisten di seluruh halaman.

```dart
// shared/widgets/pspk_button.dart
enum ButtonSize { normal, small }

class PspkButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool fullWidth;
  final ButtonSize size;
  final bool outlined; // Untuk tombol sekunder

  const PspkButton({
    required this.label,
    this.onPressed,
    this.fullWidth = false,
    this.size = ButtonSize.normal,
    this.outlined = false,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;
    final height = size == ButtonSize.normal ? 52.0 : 40.0;
    final fontSize = size == ButtonSize.normal ? 16.0 : 14.0;

    final bg = outlined
        ? Colors.transparent
        : disabled
            ? AppColors.border
            : AppColors.kuningEmas;

    final textColor = outlined
        ? AppColors.birNavy
        : Colors.white;

    final button = SizedBox(
      height: height,
      width: fullWidth ? double.infinity : null,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: textColor,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: outlined
                ? const BorderSide(color: AppColors.birNavy, width: 1.5)
                : BorderSide.none,
          ),
          padding: EdgeInsets.symmetric(
            horizontal: size == ButtonSize.normal ? 24 : 16,
          ),
        ),
        child: Text(
          label,
          style: AppTextStyles.buttonText.copyWith(fontSize: fontSize),
        ),
      ),
    );

    return button;
  }
}
```

### Aturan UX Khusus Anak Usia 6–12 Tahun

| Aspek | Aturan | Alasan |
|---|---|---|
| Ukuran tap target | Minimum **64×64dp** untuk semua tombol aksi | Jari anak kurang presisi |
| Teks tombol | Maksimal **3 kata**, langsung ke tujuan | Anak tidak membaca teks panjang |
| Konfirmasi destruktif | Selalu tampilkan dialog konfirmasi sebelum aksi tidak bisa di-undo | Mencegah kesalahan tap |
| Pesan error | Bahasa sederhana, tanpa kode error teknis | "Coba lagi ya" bukan "Error 401" |
| Navigasi | Selalu ada tombol kembali yang jelas, kecuali dari halaman soal | Tidak membuat siswa terjebak |
| Loading state | Tampilkan indikator setiap kali ada proses lebih dari 0.5 detik | Anak cenderung mengira app macet |
| Teks soal | Font Lora minimal 18sp, line-height 1.7 | Bacaan mudah untuk pembaca awal |
| Kontras warna | Gunakan navy (#102E50) di atas putih atau kuning muda | Keterbacaan maksimal |
| Keyboard sistem | Hanya untuk input username di login | Numpad kustom untuk PIN |
| Haptic feedback | Pada setiap tap kartu jawaban dan drop target | Konfirmasi fisik bahwa input diterima |

### Hierarki Navigasi

Aplikasi menggunakan navigasi **dua tab di bottom navigation bar** — sesederhana mungkin:

- **Tab 1 — Beranda:** Dashboard + daftar asesmen
- **Tab 2 — Profil:** Nama, kelas, sekolah, tombol keluar

Tidak ada drawer, tidak ada nested tab, tidak ada hamburger menu.

---

## 15. Alur Navigasi Antar Halaman

```
[Buka App]
    ↓
[Cek token di secure storage]
    ↓ (ada token)          ↓ (tidak ada / expired)
[Dashboard]             [Login Page]
    ↓                       ↓
[Pilih asesmen]         [Masukkan username]
    ↓                   [Masukkan PIN via numpad]
[Lobby asesmen]             ↓
(konfirmasi + info)     [Dashboard]
    ↓
[Soal 1 dari N]
    ↓ (jawab → tekan Lanjut)
[Soal 2 dari N]
    ↓
    ... (sampai soal terakhir)
    ↓
[Tekan "Selesai" di soal terakhir]
    ↓
[Hitung: benar ≥ passing_threshold?]
    ↓ Ya                  ↓ Tidak
[Layar Berhasil]      [Layar Coba Lagi]
    ↓                     ↓               ↓
[Kembali ke          [Coba Lagi]    [Kembali ke
 Beranda]            → Lobby         Beranda]
```

---

## 16. Tahapan Implementasi (Sprint Plan)

### Sprint 1 — Fondasi (2 minggu)

**Deliverable:** Proyek Flutter berjalan, login berfungsi end-to-end, data siswa tersimpan lokal.

| Task | Detail |
|---|---|
| Init proyek | `flutter create --org id.pspk pemantik_mobile` di `apps/mobile/` |
| AppTheme | Warna PSPK, Lora + Rubik, komponen dasar (`PspkButton`, `PspkCard`) |
| Setup Drift | 3 tabel lokal + DAO dasar |
| Setup Supabase | Client singleton, konfigurasi `.env` |
| Edge Function | `authenticate_student` dengan bcrypt di Supabase |
| Login Page | Numpad kustom, PIN display, validasi username, pesan error ramah |
| Auth Provider | Riverpod, secure storage, routing guard `/dashboard` vs `/login` |

### Sprint 2 — Dashboard & Daftar Asesmen (2 minggu)

**Deliverable:** Dashboard menampilkan sapaan siswa dan daftar asesmen yang tersedia, lobby asesmen berfungsi.

| Task | Detail |
|---|---|
| SyncService download | `_downloadPackages()` saat login berhasil |
| Dashboard Provider | Query paket dari Drift, filter berdasarkan `assessment_access` |
| Dashboard Page | Header siswa, daftar kartu asesmen, empty state, riwayat sederhana |
| Connection Banner | Indikator offline muncul otomatis jika tidak ada koneksi |
| Assessment Lobby | Info asesmen, petunjuk singkat, tombol Mulai yang membuat sesi baru |

### Sprint 3 — Engine Soal Dasar (2 minggu)

**Deliverable:** Multiple Choice, Image Choice, Audio, dan Video bisa dikerjakan dan tersimpan offline.

| Task | Detail |
|---|---|
| QuestionPage | PageView + ProgressBar linear + tombol Lanjut |
| AssessmentProvider | State soal aktif, navigasi antar soal, simpan jawaban ke Drift |
| MultipleChoiceWidget | Grid 2 kolom, haptic feedback, animasi border saat dipilih |
| ImageChoiceWidget | Grid gambar dengan `cached_network_image` |
| AudioQuestionWidget | Tombol Play/Jeda, `audioplayers` |
| VideoQuestionWidget | Deteksi YouTube vs lokal, AspectRatio 16:9 |
| ResultPage | Layar berhasil + layar coba lagi, tanpa skor |

### Sprint 4 — Soal Interaktif (2 minggu)

**Deliverable:** Drag & Drop dan Voice Recording berfungsi dengan scoring.

| Task | Detail |
|---|---|
| DragDropWidget | Dua mode (fill blank + kategorisasi), DragTarget, haptic drop |
| VoiceRecordingWidget | `record`, `speech_to_text` on-device, UI rekam sederhana |
| Levenshtein utility | Implementasi + unit test |
| Scoring voice | Ambil threshold dari `question_levels.passing_threshold` |
| Result voice | Feedback teks "Bagus sekali!" / "Coba lagi" (tanpa skor angka) |

### Sprint 5 — Sinkronisasi Penuh & Stabilisasi (2 minggu)

**Deliverable:** Semua data tersinkronisasi ke Supabase, skenario kritis diuji, aplikasi stabil.

| Task | Detail |
|---|---|
| SyncService lengkap | Upload audio → answers → sessions secara berurutan |
| Retry mechanism | Auto-retry untuk status `failed` saat koneksi pulih |
| Resume sesi | Jika app ditutup di tengah soal, buka kembali dari posisi terakhir |
| Profil page | Nama, kelas, sekolah, tombol keluar |
| End-to-end test | Offline → jawab soal → online → verifikasi di Supabase dashboard |
| Bug fixing | Stabilisasi semua edge case |

---

## 17. Keputusan Teknis

### Sudah Diputuskan

| Pertanyaan | Keputusan | Alasan |
|---|---|---|
| State management | Riverpod | Reaktif, compile-safe, cocok offline-first |
| Dashboard | Daftar kartu sederhana, tanpa map/gamifikasi | Sesuai arahan atasan, prioritas stabilitas |
| Voice recording | `record` + `speech_to_text` on-device | Offline-first, tidak butuh internet |
| Scoring suara | Levenshtein Distance | Deterministik, bisa diatur threshold per level |
| Threshold | Dari `question_levels.passing_threshold` | Fleksibel, dikontrol admin soal |
| Hasil asesmen | Hanya lulus/tidak lulus, tanpa angka | Mengurangi kecemasan, sesuai prinsip pedagogi |
| Keyboard | Numpad kustom untuk PIN, keyboard sistem untuk username | Kontrol UX penuh untuk PIN |
| Gamifikasi | Tidak ada — dihapus sepenuhnya | Arahan atasan: fokus stabilitas dan navigasi |
| Animasi | Minimal — hanya transisi halaman dan haptic tap | Sesuai brand PSPK: bersih, tidak ramai |
| Font | Lora (heading) + Rubik (body) | Sesuai Brand Guidelines PSPK resmi |
| Warna | Hanya dari palet primer + sekunder PSPK | Sesuai Brand Guidelines PSPK resmi |

### Masih Perlu Keputusan

| Pertanyaan | Opsi A | Opsi B |
|---|---|---|
| **Jumlah digit PIN** | 4 digit | 6 digit |
| **Autentikasi teknis** | Supabase Edge Function custom JWT | Supabase RPC + Row Level Security |
| **Upgrade voice accuracy** | Flag di `system_settings` untuk aktifkan Whisper API jika online | Selalu on-device STT |
| **Durasi sesi tersimpan** | 7 hari (token JWT) | 30 hari |

---

## 18. Verification Plan

### Automated Tests

```bash
# Analisis statis
flutter analyze

# Unit tests
flutter test test/unit/levenshtein_test.dart
flutter test test/unit/sync_service_test.dart
flutter test test/unit/assessment_scoring_test.dart

# Widget tests
flutter test test/widget/numpad_widget_test.dart
flutter test test/widget/multiple_choice_widget_test.dart
flutter test test/widget/progress_bar_test.dart
```

### Manual Verification per Sprint

**Sprint 1:** Login username + PIN berhasil → data siswa muncul di dashboard → logout membersihkan session → login ulang berhasil.

**Sprint 2:** Dashboard menampilkan daftar asesmen sesuai akses sekolah/kelas → kartu asesmen menampilkan info yang benar → tap "Mulai" → masuk lobby → info lobby sesuai paket.

**Sprint 3:** Semua tipe soal merender tanpa error → tap jawaban → pilihan ter-highlight → tombol "Lanjut" aktif → soal berikutnya muncul → di soal terakhir muncul "Selesai" → layar hasil tampil sesuai threshold.

**Sprint 4:** Drag & drop berhasil dengan haptic saat item di-drop → rekam suara → transkripsi muncul → feedback teks sesuai threshold → jawaban tersimpan di Drift.

**Sprint 5:** Matikan koneksi internet → kerjakan asesmen penuh → nyalakan koneksi → tunggu beberapa detik → buka Supabase Studio → verifikasi `student_answers` dan `assessment_sessions` terisi dengan benar → file audio tersimpan di Storage.

### Skenario Kritis

| Skenario | Hasil yang Diharapkan |
|---|---|
| Login saat offline | Berhasil menggunakan token tersimpan di secure storage |
| App ditutup paksa di tengah soal | Saat dibuka kembali, sesi berlanjut dari soal terakhir yang belum dijawab |
| Rekam suara tanpa koneksi | Audio tersimpan lokal; terupload otomatis saat koneksi pulih |
| Sinkronisasi gagal (server error) | Status berubah ke `failed`; retry otomatis saat koneksi pulih berikutnya |
| Siswa tap dua kali cepat pada tombol Mulai | Hanya satu sesi yang terbuat (guard di provider) |
| Soal tanpa koneksi dengan media (audio/video) | Media diambil dari cache lokal; jika tidak ada cache, tampilkan placeholder informatif |

---

*Dokumen ini adalah living document. Diperbarui setiap akhir sprint.*  
*Versi 2.0 — Revisi: dashboard disederhanakan menjadi daftar kartu, gamifikasi dihapus sepenuhnya, brand PSPK diterapkan secara penuh.*



