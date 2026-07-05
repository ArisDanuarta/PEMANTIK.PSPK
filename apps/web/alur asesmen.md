# Spesifikasi Implementasi: Modul Akses Ujian & Hasil Ujian — Platform Pemantik

> **Untuk: Agent Antigravity**
> Dokumen ini adalah instruksi kerja lengkap. Baca seluruh dokumen sebelum menulis kode apa pun. Setiap perubahan UI/logic **wajib** di-crosscheck terhadap tabel RLS dan schema di Bagian 2 sebelum diimplementasikan. Jangan berasumsi terhadap struktur data yang tidak eksplisit tercantum di schema — jika ada kebutuhan yang tidak bisa dipenuhi schema saat ini, tulis di catatan "GAP / Perlu Keputusan" (Bagian 7), jangan langsung mengubah schema tanpa konfirmasi.

---

## 1. Ringkasan Alur Bisnis

**Aktor:** Super Admin → Komunitas → Sekolah → Guru → Siswa

1. **Super Admin** memberikan akses ujian melalui form "Berikan Akses Ujian":
   - Pilih **Paket Ujian** (bisa lebih dari satu) → merepresentasikan `question_categories` (mis. "Literasi").
   - Pilih target: **Komunitas (Grup)** atau **Sekolah Mandiri** (sekolah yang tidak bernaung di komunitas mana pun / diberi akses langsung).
   - Isi **Fase Ujian (Tracking)** → field teks bebas (mis. "Tahap 1") yang dipakai untuk melacak progres siswa antar ujian dengan paket yang sama.
   - Isi **Berlaku Dari** dan **Berlaku Sampai**.
2. Jika akses diberikan ke **Komunitas**, komunitas dapat:
   - Menyebarkan akses tersebut ke seluruh sekolah binaannya sekaligus ("serentak"), atau
   - Menyebarkan satu per satu ke sekolah tertentu sesuai kebutuhan.
3. **Sekolah** menerima akses (baik langsung dari Super Admin sebagai "Sekolah Mandiri", maupun hasil distribusi dari Komunitas).
4. **Guru** & **Siswa** beroperasi di dalam lingkup sekolah masing-masing.
5. Hasil ujian (jawaban siswa & skor) harus **tetap dapat diakses sebagai arsip permanen** di level Komunitas dan Sekolah **meskipun** akses ujian (`assessment_access`) sudah tidak aktif / kedaluwarsa.

---

## 2. Referensi Schema & RLS (JANGAN DIUBAH TANPA KONFIRMASI)

### 2.1 Tabel inti yang relevan
- `communities` — data komunitas.
- `schools` — punya `community_id` (nullable secara implisit untuk kasus "Sekolah Mandiri" — **cek: apakah kolom `community_id` di tabel `schools` nullable di schema aktual?** Schema yang diberikan menunjukkan `community_id uuid NOT NULL` pada `schools`. **Ini GAP penting** — lihat Bagian 7.1.
- `assessment_access` — satu baris = satu grant akses untuk satu `category_id` ke satu `target_type`/`target_id`, dengan `phase`, `valid_from`, `valid_until`, `is_active`.
- `assessment_sessions` — satu baris = satu sesi pengerjaan siswa, punya `access_id` (link ke grant asal), `category_id`, `phase`, `school_id`, `student_id`, `score`, `status`.
- `student_answers` — jawaban per soal per sesi.
- `question_categories` — representasi "Paket Ujian".

### 2.2 Poin krusial dari schema yang WAJIB diperhatikan agent:

1. **`assessment_access.category_id` bersifat tunggal (NOT NULL, bukan array).**
   Form "Pilih Paket Ujian (bisa lebih dari satu)" di UI berarti: jika Super Admin memilih 3 paket ujian, sistem **wajib membuat 3 baris terpisah** di `assessment_access` (satu per kombinasi kategori), bukan satu baris dengan array kategori. Terapkan ini di logic submit form, jangan mencoba menyimpan multi-kategori dalam satu row.

2. **Tidak ada kolom penghubung eksplisit antara grant di level Komunitas dan hasil distribusi ke Sekolah** (tidak ada `parent_access_id`). Saat komunitas mendistribusikan akses ke sekolah, baris baru dibuat di `assessment_access` dengan `target_type='school'`. Untuk tetap bisa melacak "ini didistribusikan dari grant komunitas yang mana", gunakan kombinasi `category_id` + `phase` (nilai teks harus identik) + keanggotaan sekolah di `community_id` sebagai penanda relasi logis. **Jangan mengizinkan komunitas mengubah nilai `phase` saat distribusi** — field `phase` harus di-copy persis dari grant komunitas asal agar tracking konsisten dan laporan bisa dikelompokkan dengan benar.

3. **RLS `community_distribute_to_schools`** (INSERT pada `assessment_access`):
   ```
   target_role: public, kondisi WITH CHECK:
   jwt_user_role() = 'community' AND target_type = 'school'
   AND target_id IN (SELECT schools.id FROM schools WHERE schools.community_id = jwt_community_id())
   ```
   → Backend/frontend distribusi HARUS mengirim insert sebagai user dengan role `community`, dan hanya boleh menargetkan `school_id` yang benar-benar berada di bawah `community_id` miliknya. Validasi ini juga harus dicek di level aplikasi (bukan hanya mengandalkan RLS) agar error ditangani dengan pesan yang jelas, bukan silent fail dari Postgres.

4. **RLS `school_teacher_view_access`** (SELECT pada `assessment_access`):
   ```
   (jwt_user_role() IN ('school','teacher'))
   AND (target_type='school' AND target_id=jwt_school_id()
        OR target_type='class' AND target_id IN (kelas milik sekolah))
   AND is_active = true
   ```
   → Tab **"Akses Ujian"** di akun Sekolah/Guru **HANYA** akan menampilkan grant yang `is_active = true`. Ini sudah sesuai requirement ("menampilkan akses ujian yang diberikan dan durasi validnya"). **Konsekuensi penting:** begitu `is_active` di-set `false` (baik manual atau oleh job kedaluwarsa), grant tsb otomatis hilang dari tab ini — pastikan ada job/trigger terpisah yang menentukan kapan `is_active` diubah menjadi false (mis. cron berdasarkan `valid_until`), karena `valid_until` yang lewat TIDAK otomatis mengubah `is_active`. **GAP — lihat Bagian 7.2.**

5. **RLS hasil ujian TIDAK bergantung pada `assessment_access.is_active`:**
   - `school_view_answers`, `teacher_view_answers`, `community_view_answers` (pada `student_answers`) hanya memfilter berdasarkan `school_id`/`community_id` melalui `assessment_sessions`, tanpa cek status aktif akses.
   - `school_view_sessions`, `teacher_view_school_sessions`, `community_view_sessions` (pada `assessment_sessions`) juga tidak memfilter berdasarkan status akses.
   → Ini **sudah otomatis mendukung requirement arsip permanen**: data hasil ujian tetap terbaca oleh Sekolah/Guru/Komunitas walau `assessment_access` terkait sudah `is_active = false` atau `valid_until` terlewati. **Jangan menambahkan filter `is_active`/`valid_until` secara manual di query tab "Hasil Ujian"** — itu akan menyalahi requirement arsip. Filter tersebut hanya boleh dipakai di tab "Akses Ujian" (yang menampilkan grant, bukan hasil).

6. **`student_view_own_access`** membatasi siswa memulai ujian hanya jika `valid_from <= now() <= valid_until` — ini benar untuk mencegah siswa mengerjakan ujian di luar jendela waktu, dan terpisah dari logic arsip di atas.

7. Setiap `assessment_sessions` punya `access_id` (nullable) — pastikan saat sesi dibuat, `access_id` diisi dengan grant yang relevan agar laporan "per fase yang dibuat superadmin" bisa akurat menelusuri fase mana yang menghasilkan sesi tsb, terutama untuk kasus siswa mengerjakan ulang di fase berbeda.

---

## 3. Matriks Peran vs Fitur

| Peran | Tab "Akses Ujian" | Tab "Hasil Ujian" (dulu "Laporan"/"Analitik") | Distribusi Akses |
|---|---|---|---|
| **Super Admin** | Membuat grant baru (form "Berikan Akses Ujian") | Melihat semua data (via `super_admin_full_access_control`, `super_admin_all_sessions`, dst.) | Membuat grant awal ke Komunitas / Sekolah Mandiri |
| **Komunitas** | Melihat grant yang diterima (`community_view_own_access`) | **Ganti nama dari "Analitik Laporan" → "Hasil Ujian"**. Tampilkan hasil ujian tiap sekolah binaan per fase. Download per sekolah (Excel) & download per fase untuk semua sekolah (Excel). Data permanen sebagai arsip komunitas walau akses sudah tidak berlaku. | Distribusi ke semua sekolah binaan sekaligus, atau satu per satu |
| **Sekolah** | Hanya menampilkan akses yang **aktif** + durasi berlaku (`school_teacher_view_access`) | **Ganti nama "Laporan" → "Hasil Ujian"**. Tampilkan hasil per kelas + tombol download per kelas (Excel). Tampilkan juga per sesi/fase yang dibuat Super Admin + tombol download per fase (Excel). Data tetap terakses walau akses sudah tidak valid. | — |
| **Guru** | (opsional, mengikuti sekolah, jika relevan) | **Ganti nama "Laporan Hasil" → "Hasil Ujian"**. Tampilkan data per siswa, per kelas yang diampu (+ download Excel), per fase yang dibuat Super Admin (+ download Excel). | — |
| **Siswa** | Mengerjakan ujian sesuai `assessment_access` yang valid | — | — |

---

## 4. Spesifikasi UI per Halaman

### 4.1 Super Admin — Form "Berikan Akses Ujian"
- **Pilih Paket Ujian** (multi-select checkbox, sumber: `question_categories`, filter berdasarkan `subject_area` bila perlu).
- **Berikan Akses Kepada** (radio): `Komunitas (Grup)` atau `Sekolah Mandiri`.
  - Jika `Komunitas`: tampilkan dropdown pencarian Komunitas (`communities`), `target_type='community'`, `target_id=community.id`.
  - Jika `Sekolah Mandiri`: tampilkan dropdown pencarian Sekolah (`schools`), `target_type='school'`, `target_id=school.id`. **Perhatikan Gap 7.1** soal `community_id NOT NULL` pada schools sebelum mengimplementasikan konsep "sekolah mandiri" (sekolah tanpa komunitas).
- **Fase Ujian (Tracking)**: text input, default placeholder "Tahap 1".
- **Berlaku Dari / Berlaku Sampai**: date-time picker, validasi `valid_until > valid_from`.
- **Submit**: untuk setiap kombinasi (paket ujian × target), insert 1 baris ke `assessment_access` (lihat poin 2.2.1). Gunakan transaksi agar semua-atau-tidak-sama-sekali (all-or-nothing) jika salah satu insert gagal.
- Validasi RLS: submit dilakukan sebagai role `super_admin` (`super_admin_full_access_control`, ALL).

### 4.2 Komunitas — Distribusi Akses
- Halaman/menu baru: "Distribusikan Akses" menampilkan daftar grant yang diterima komunitas (`target_type='community'`, `target_id=jwt_community_id()`, `is_active=true`, belum lewat `valid_until`).
- Tombol **"Sebar ke Semua Sekolah Binaan"**: insert N baris ke `assessment_access` (satu per sekolah aktif di bawah komunitas), `target_type='school'`, `category_id` & `phase` **di-copy identik** dari grant asal, `valid_from`/`valid_until` mengikuti grant asal (atau bisa dipersempit, tapi tidak boleh melebihi rentang grant asal — validasi di aplikasi).
- Opsi **"Sebar per Sekolah"**: form pilih 1+ sekolah spesifik dari daftar sekolah binaan, insert baris sesuai sekolah terpilih saja.
- Semua insert melalui RLS `community_distribute_to_schools` — pastikan request dikirim dengan JWT role `community`.

### 4.3 Komunitas — Tab "Hasil Ujian" (mengganti "Analitik Laporan")
- Filter: pilih **Fase** (dropdown distinct `phase` dari `assessment_sessions` milik sekolah-sekolah binaan) dan/atau pilih **Sekolah**.
- Tampilan tabel: daftar sekolah binaan dengan ringkasan (jumlah siswa mengerjakan, rata-rata skor, dsb.) per fase — query via `community_view_sessions` + join `student_answers` via `community_view_answers`.
- Tombol **"Download per Sekolah"**: export Excel berisi detail hasil siswa untuk 1 sekolah + fase terpilih.
- Tombol **"Download per Fase (Semua Sekolah)"**: export Excel gabungan seluruh sekolah binaan untuk fase terpilih, idealnya multi-sheet (1 sheet per sekolah) atau 1 sheet dengan kolom nama sekolah.
- **Data ini permanen** — jangan filter berdasarkan `assessment_access.is_active`. Sumber data adalah `assessment_sessions`/`student_answers`, bukan `assessment_access`.
- **Detail lengkap tampilan default (section switcher Per Level/Per Sesi-Fase/Per Sekolah) dan toolbar filter kustom "Pusat Data Hasil Ujian" ada di Bagian 4.8.1 dan 4.9.**

### 4.4 Sekolah — Tab "Akses Ujian"
- Tampilkan daftar `assessment_access` yang **aktif** untuk sekolah tsb (RLS `school_teacher_view_access` sudah otomatis filter `is_active=true`), dengan kolom: Paket Ujian, Fase, Berlaku Dari, Berlaku Sampai, Sisa Waktu.
- Tidak menampilkan tombol distribusi (bukan wewenang sekolah).

### 4.5 Sekolah — Tab "Hasil Ujian" (mengganti "Laporan")
- Tampilan default: **per kelas** — daftar kelas (`classes` milik sekolah via `school_manage_classes`) dengan ringkasan hasil (via `school_view_sessions` + `school_view_answers`), tombol **Download per Kelas** (Excel).
- Tampilan alternatif: **per sesi/fase** yang dibuat Super Admin — dropdown pilih fase (distinct `phase`), tombol **Download per Fase** (Excel, mencakup semua kelas dalam sekolah tsb untuk fase itu).
- Data tetap terakses walau akses sudah tidak valid (tidak ada filter `is_active` di query ini — confirm sesuai RLS `school_view_answers`/`school_view_sessions`).
- **Detail lengkap tampilan default (section switcher Per Kelas/Per Sesi-Fase/Per Level) dan toolbar filter kustom "Pusat Data Hasil Ujian" ada di Bagian 4.8.2 dan 4.9.**

### 4.6 Guru — Tab "Hasil Ujian" (mengganti "Laporan Hasil")
- Level **per siswa**: tabel detail jawaban/skor tiap siswa di kelas yang diampu guru (`teacher_view_school_students`... perhatikan RLS guru saat ini berbasis `school_id`, bukan spesifik `class_id` guru — lihat Gap 7.3).
- Level **per kelas yang diampu**: agregat hasil per kelas + tombol **Download per Kelas** (Excel).
- Level **per fase** (dibuat Super Admin): dropdown fase + tombol **Download per Fase** (Excel), mencakup seluruh kelas yang diampu guru tsb.
- Sumber data: `teacher_view_school_sessions` + `teacher_view_answers` (keduanya sudah tanpa filter status akses → mendukung arsip).
- **Rekomendasi konsistensi section switcher (Per Level/Per Sesi-Fase/Per Kelas Diampu) untuk Guru ada di Bagian 4.8.3 — perlu konfirmasi product owner sebelum wajib diimplementasikan.**

### 4.8 Struktur Tampilan Default "Hasil Ujian": Section Switcher

Setiap tab "Hasil Ujian" (Komunitas & Sekolah) **wajib** punya kontrol switcher (tab/segmented control) di bagian atas halaman untuk berpindah cara pengelompokan data. Hanya satu section yang aktif pada satu waktu. Prasyarat wajib sebelum section manapun menampilkan data: **Kategori Ujian harus dipilih terlebih dahulu** (literasi/numerasi punya struktur level berbeda, jangan pernah mengagregasi lintas kategori dalam satu tampilan/section).

#### 4.8.1 Komunitas — 3 Section: Per Level, Per Sesi/Fase, Per Sekolah

**A. Section "Per Level"**
- Menampilkan grid kartu, satu kartu per nomor level (`question_levels.level_number`) milik kategori terpilih.
- **Kartu hanya ditampilkan sampai level tertinggi yang benar-benar pernah dicapai siswa** di seluruh sekolah komunitas tsb. Contoh: kategori punya total 8 level, tapi level tertinggi yang pernah dicapai siswa manapun baru 5 → hanya tampil kartu 1–5, kartu 6–8 **tidak** dirender sama sekali (bukan di-disable, tapi memang tidak ada).
- Isi tiap kartu: nomor level, jumlah siswa yang mencapai level tsb (agregat semua sekolah di komunitas), dan tombol **Download (Excel)**.
- Tombol download per kartu level → export seluruh jawaban siswa (`student_answers`) dari **semua sekolah dalam komunitas** yang berkaitan dengan level tsb saja (filter tambahan by level, di luar filter kategori & scope komunitas dari RLS).
- **Definisi "mencapai level" perlu keputusan data model — lihat Gap 7.5 di bawah.**

**B. Section "Per Sesi/Fase"**
- Grid kartu, satu kartu per nilai `phase` unik (dari `assessment_access`/`assessment_sessions`) untuk kategori terpilih, dalam scope sekolah-sekolah komunitas.
- Isi kartu: nama fase, rentang waktu (`valid_from`–`valid_until` dari `assessment_access` terkait), jumlah siswa mengikuti (semua sekolah), tombol **Download (Excel)**.
- Tombol download → seluruh hasil ujian semua siswa dari semua sekolah komunitas yang **aktif pada fase tsb saja**.

**C. Section "Per Sekolah"**
- Grid kartu, satu kartu per sekolah binaan komunitas (`schools` where `community_id` = milik komunitas).
- Isi kartu: data sekolah (nama, NPSN, kota/kabupaten, jumlah siswa ikut ujian), tombol **Download (Excel)**.
- Tombol download → seluruh hasil ujian siswa sekolah tsb (untuk kategori yang sedang dipilih; tidak dibatasi fase/level tertentu kecuali pengguna memakai toolbar filter kustom di Bagian 4.9).

#### 4.8.2 Sekolah — 3 Section: Per Kelas, Per Sesi/Fase, Per Level

**A. Section "Per Kelas"**
- Grid kartu, satu kartu per kelas (`classes` milik sekolah tsb).
- Isi kartu: nama kelas, tingkat (`grade`), tahun ajaran, jumlah siswa ikut ujian, tombol **Download (Excel)**.
- Tombol download → seluruh hasil ujian siswa kelas tsb saja (untuk kategori terpilih).

**B. Section "Per Sesi/Fase"**
- Sama konsepnya dengan 4.8.1.B, tapi **lingkup hanya sekolah tsb** (bukan semua sekolah komunitas). Kartu per `phase`, isi info waktu, jumlah siswa sekolah tsb yang mengikuti, tombol download hasil sekolah tsb pada fase itu saja.

**C. Section "Per Level"**
- Sama konsepnya dengan 4.8.1.A, tapi **lingkup hanya siswa-siswa di sekolah tsb**. Kartu level hanya sampai level tertinggi yang dicapai siswa **di sekolah tsb** (bisa berbeda dari level tertinggi di komunitas). Tombol download → jawaban siswa sekolah tsb pada level itu saja.

#### 4.8.3 Guru — rekomendasi konsistensi (perlu konfirmasi, bukan requirement eksplisit)
Untuk konsistensi UX, tab "Hasil Ujian" Guru **bisa** mengikuti pola 3-section yang sama: Per Level, Per Sesi/Fase, Per Kelas yang Diampu — dengan lingkup dibatasi hanya ke kelas yang benar-benar diampu guru tsb (ingat **Gap 7.3**: RLS guru saat ini berbasis `school_id`, bukan `class_id`, jadi filter tambahan `classes.teacher_id = current_user` **wajib** diterapkan di level aplikasi, jangan mengandalkan RLS saja). **Jangan implementasikan ini sebagai kewajiban sebelum dikonfirmasi ke product owner** — user hanya menjelaskan pola ini secara eksplisit untuk Komunitas dan Sekolah.

### 4.9 Toolbar Filter Kustom & Download Rekap Detail ("Pusat Data Hasil Ujian")

Selain 3 section di atas (yang merupakan tampilan **default/cepat** saat halaman dibuka), setiap role juga punya toolbar filter kustom untuk kebutuhan pencarian/export granular sesuai contoh referensi UI berikut:

```
Pusat Data Hasil Ujian
[Kategori Ujian (WAJIB) ▾]  [Filter Komunitas ▾]  [Filter Sekolah ▾]  [Filter Gender ▾]  [Cari Nama/NISN/Sekolah ...]
                                                              [⬇ Download Rekap Detail (Excel)]
```

Field-field ini **wajib disesuaikan cakupannya per role** (jangan tampilkan field yang di luar scope role tsb, dan tetap validasi ulang di server-side, jangan percaya filter dari frontend mentah-mentah):

| Field | Super Admin | Komunitas | Sekolah | Guru |
|---|---|---|---|---|
| Kategori Ujian (wajib) | ✅ | ✅ | ✅ | ✅ |
| Filter Komunitas | ✅ (semua komunitas) | ❌ (sudah implisit dirinya sendiri) | ❌ | ❌ |
| Filter Sekolah | ✅ (semua sekolah) | ✅ (dibatasi hanya sekolah binaannya) | ❌ (sudah implisit dirinya sendiri) | ❌ |
| Filter Kelas | ❌ (tidak relevan di level ini, opsional) | ❌ | ✅ (dibatasi hanya kelas di sekolahnya) | ✅ (dibatasi hanya kelas yang diampu — lihat Gap 7.3) |
| Filter Gender | ✅ | ✅ | ✅ | ✅ |
| Cari Nama/NISN/Sekolah | ✅ | ✅ (pencarian nama sekolah dibatasi sekolah binaannya) | ✅ (pencarian nama/NISN dibatasi siswa sekolahnya, field "sekolah" bisa disembunyikan karena sudah 1 sekolah) | ✅ (sama seperti Sekolah, dibatasi kelas yang diampu) |

- **Kategori Ujian wajib dipilih** sebelum tombol "Download Rekap Detail" bisa ditekan (disabled state sebelum dipilih) — mencegah agregasi lintas kategori yang strukturnya berbeda.
- Pencarian Nama/NISN/Sekolah → `ilike` terhadap `students.full_name`, `students.nisn`, dan `schools.name` (kolom `schools.name` hanya relevan untuk Super Admin/Komunitas yang mencakup lebih dari satu sekolah).
- Filter Gender → join ke `students.gender`.
- Tombol **"Download Rekap Detail (Excel)"** menghasilkan 1 file Excel **detail per baris siswa** (bukan agregat per kartu), berdasarkan kombinasi seluruh filter aktif. Ini terpisah/berbeda tujuan dari tombol download per-kartu di Bagian 4.8 — toolbar ini untuk kebutuhan pencarian granular custom, sedangkan tombol per-kartu untuk export cepat sesuai pengelompokan section yang sedang aktif.
- Semua query filter kustom tetap dieksekusi melalui koneksi ber-role sesuai user login (tunduk RLS), filter tambahan (gender, search, kelas guru) diterapkan sebagai **WHERE clause tambahan di aplikasi**, bukan bypass RLS.

### 4.10 Ketentuan Umum Export
- **Semua tombol download wajib menghasilkan file `.xlsx`** (gunakan library seperti `exceljs`/`xlsx` sesuai stack — cek konvensi proyek yang sudah ada sebelum menambah dependency baru).
- Nama file harus deskriptif, mis. `hasil-ujian_{nama_sekolah}_{fase}_{tanggal-export}.xlsx`.
- Sertakan header kolom yang jelas (Nama Siswa, NISN, Kelas, Skor, Status, Tanggal Pengerjaan, dst.) — sesuaikan dengan kolom yang tersedia di `students`, `assessment_sessions`, `student_answers`.

---

## 5. Checklist Cross-check RLS Sebelum Coding (wajib dicentang satu per satu)

- [ ] Semua query "Hasil Ujian" (Komunitas/Sekolah/Guru) **tidak** menambahkan filter `is_active`/`valid_until` pada `assessment_access` — karena RLS pada `assessment_sessions`/`student_answers` sudah tidak bergantung ke situ, dan requirement arsip mensyaratkan data tetap tampil.
- [ ] Semua query "Akses Ujian" (Sekolah/Guru) **memanfaatkan** RLS `school_teacher_view_access` apa adanya (jangan override dengan service-role/bypass RLS) agar hanya grant aktif yang muncul.
- [ ] Insert distribusi akses oleh Komunitas dikirim dengan sesi/JWT role `community`, bukan role lain, agar cocok dengan `community_distribute_to_schools`.
- [ ] Insert oleh Super Admin dikirim dengan role `super_admin`.
- [ ] Setiap kombinasi Paket Ujian × Target menghasilkan baris `assessment_access` terpisah (bukan array di satu baris).
- [ ] `phase` yang didistribusikan Komunitas ke Sekolah **identik string-nya** dengan `phase` grant asal dari Super Admin (case-sensitive match) agar pengelompokan laporan per fase tidak pecah.
- [ ] Query "per kelas" di akun Sekolah/Guru join lewat `classes.school_id` (bukan asumsi field lain yang tidak ada di schema).
- [ ] Semua query menggunakan tabel/kolom yang benar-benar ada di schema Bagian 2 — tidak mengarang kolom (mis. tidak ada `parent_access_id`, tidak ada array `category_ids`).
- [ ] Export Excel tidak melakukan query tambahan yang bypass RLS (tetap melalui koneksi ber-role sesuai user yang login).
- [ ] Section "Per Level" (Komunitas & Sekolah) hanya merender kartu sampai level tertinggi yang benar-benar dicapai — tidak ada kartu untuk level yang belum tercapai siapa pun (lihat Bagian 4.8, definisi "dicapai" mengikuti keputusan Gap 7.5).
- [ ] Perhitungan "level tertinggi" di kartu Sekolah tidak pernah melebihi hasil agregat yang sama di level Komunitas untuk sekolah yang sama (konsistensi angka lintas role).
- [ ] Tombol download per kartu (Level/Fase/Sekolah/Kelas) di Bagian 4.8 hanya memfilter sesuai scope kartu tsb — diuji agar tidak tercampur data kategori lain, fase lain, atau sekolah/kelas lain.
- [ ] Toolbar filter kustom (Bagian 4.9) menyembunyikan field yang di luar scope role (mis. Sekolah tidak melihat "Filter Komunitas"/"Filter Sekolah") **dan** tetap memvalidasi ulang di server-side meski field disembunyikan di UI.
- [ ] Field "Kategori Ujian" bersifat wajib (blocking) sebelum section manapun atau tombol "Download Rekap Detail" bisa menampilkan/mengekspor data.

---

## 6. Pengujian Pasca-Implementasi (QA)

1. **Uji Super Admin**: buat grant dengan 2 paket ujian sekaligus ke 1 komunitas → pastikan 2 baris `assessment_access` terbentuk, bukan 1.
2. **Uji distribusi Komunitas**: sebar ke semua sekolah binaan → jumlah baris baru = jumlah sekolah aktif di komunitas tsb, dengan `phase` & `category_id` identik ke asal.
3. **Uji distribusi Komunitas ke sekolah di luar binaannya** → harus ditolak RLS (expect error, bukan silent insert).
4. **Uji tab Akses Ujian Sekolah**: set `is_active=false` pada satu grant → grant tsb hilang dari tab Akses Ujian, tapi hasil ujian terkait (sesi yang sudah dikerjakan) tetap muncul di tab Hasil Ujian.
5. **Uji `valid_until` terlewati tanpa `is_active` diubah** → pastikan perilaku sesuai keputusan di Gap 7.2 (apakah tetap tampil sebagai "aktif" atau tidak).
6. **Uji Guru**: pastikan guru hanya melihat siswa/kelas dalam `school_id` miliknya, tidak lintas sekolah.
7. **Uji Download Excel** dari ketiga level (Komunitas per sekolah & per fase, Sekolah per kelas & per fase, Guru per kelas & per fase) — buka file hasil export dan pastikan data cocok dengan tampilan di UI, format `.xlsx` valid (bukan `.csv` yang di-rename).
8. **Uji arsip permanen**: nonaktifkan / biarkan kedaluwarsa sebuah `assessment_access`, lalu login ulang sebagai Sekolah/Komunitas/Guru terkait → data hasil ujian historis harus tetap bisa dilihat & didownload.
9. **Regresi RLS**: jalankan test-suite (jika ada) untuk role `student`, `teacher`, `school`, `community`, `super_admin` guna memastikan tidak ada kebocoran data lintas sekolah/komunitas akibat perubahan query baru.
10. **Uji Section "Per Level"**: buat data dummy dimana total level di kategori = 8, tapi level tertinggi yang dicapai siswa manapun = 5 → pastikan hanya kartu 1–5 yang muncul, baik di tampilan Komunitas maupun Sekolah.
11. **Uji Download per Level**: pastikan file Excel hasil download kartu level tertentu **hanya** berisi jawaban terkait level tsb, tidak tercampur level lain maupun kategori lain.
12. **Uji Download per Sesi/Fase & per Sekolah/Kelas** (Bagian 4.8): masing-masing tombol kartu diuji satu per satu untuk memastikan cakupan datanya sesuai kartu yang diklik (tidak bocor ke fase/sekolah/kelas lain).
13. **Uji Toolbar Filter Kustom**: kombinasikan filter Kategori + Gender + kata kunci Nama/NISN, pastikan hasil Excel "Download Rekap Detail" sesuai kombinasi filter tsb.
14. **Uji manipulasi request langsung** (bukan lewat UI): role Sekolah mencoba mengirim parameter `school_id` milik sekolah lain lewat API/network tab → harus tetap diblokir RLS di server, bukan hanya disembunyikan di UI.
15. **Uji konsistensi angka lintas level**: bandingkan jumlah siswa & level tertinggi yang tampil di kartu Sekolah dengan agregat yang sama di kartu Komunitas untuk sekolah yang sama — harus konsisten (lihat checklist Bagian 5).

---

## 7. GAP / Perlu Keputusan (jangan diputuskan sepihak oleh agent — tandai dan tanyakan ke pemilik produk jika belum jelas)

### 7.1 `schools.community_id` NOT NULL vs konsep "Sekolah Mandiri"
Schema menunjukkan `community_id uuid NOT NULL` pada `schools`, artinya setiap sekolah *harus* terdaftar di bawah sebuah komunitas. Namun UI form "Berikan Akses Kepada" punya opsi terpisah "Sekolah Mandiri" yang mengindikasikan ada sekolah tanpa komunitas (atau komunitas "dummy/default"). **Perlu klarifikasi**: apakah "Sekolah Mandiri" berarti sekolah yang tetap punya `community_id` (mis. komunitas placeholder) tetapi diberi akses langsung (`target_type='school'`) tanpa melalui distribusi komunitas? Jika ya, tidak perlu ubah schema — cukup pastikan Super Admin bisa memilih target `school` secara langsung terlepas dari `community_id`-nya. Jangan mengubah constraint `NOT NULL` tanpa konfirmasi eksplisit.

### 7.2 Tidak ada mekanisme otomatis menonaktifkan `assessment_access` saat `valid_until` terlewati
RLS `is_active=true` dipakai sebagai gerbang tampil di tab Akses Ujian, tapi tidak ada trigger/cron di schema yang mengubah `is_active` berdasarkan `valid_until`. Perlu diputuskan: (a) buat scheduled job/edge function yang menonaktifkan otomatis, atau (b) ubah query tab Akses Ujian untuk turut mengecek `valid_until >= now()` di sisi aplikasi selain RLS. Rekomendasi: opsi (a) agar konsisten dengan RLS siswa (`student_view_own_access`) yang sudah memakai kombinasi `is_active` + rentang waktu.

### 7.3 RLS Guru berbasis `school_id`, bukan `class_id` guru
`teacher_view_school_sessions`, `teacher_view_answers`, dan `teacher_view_school_students` semuanya memfilter berdasarkan `school_id = jwt_school_id()`, bukan berdasarkan kelas spesifik yang diampu guru (`classes.teacher_id`). Artinya secara RLS, seorang guru bisa melihat data **seluruh sekolah**, bukan hanya kelas yang ia ampu. Requirement menyebutkan guru harus melihat "per kelas yang diampu" — ini perlu **filter tambahan di level aplikasi** (WHERE `classes.teacher_id = current_user_id`) di atas RLS yang lebih longgar, karena RLS saat ini tidak membatasi sampai level kelas. Jangan mengandalkan RLS saja untuk pembatasan ini.

### 7.4 Tidak ada kolom penanda "arsip" eksplisit
Karena tidak ada kolom seperti `archived_at` atau flag arsip, status "permanen sebagai arsip" murni berasal dari sifat RLS yang tidak bergantung pada `is_active`. Ini sudah cukup untuk requirement saat ini, tapi jika ke depan dibutuhkan fitur "hapus arsip" atau "sembunyikan dari komunitas", perlu kolom tambahan — dicatat sebagai potensi migrasi masa depan, bukan untuk dikerjakan sekarang.

### 7.5 Definisi "level tertinggi yang dicapai siswa" belum eksplisit di schema
Section "Per Level" (Bagian 4.8.1.A dan 4.8.2.C) butuh cara menentukan level tertinggi yang sudah dicapai siswa, tapi schema tidak punya tabel/kolom "level completion" yang eksplisit. Ada 2 kandidat sumber data, agent **wajib memilih salah satu dan mendokumentasikan pilihannya**, jangan mencampur keduanya secara tidak konsisten:
  - **Opsi A — `assessment_sessions.current_level_id`**: field ini (join ke `question_levels.level_number`) merepresentasikan level dimana sesi tsb terakhir berada. Plus: sederhana, 1 query per sesi. Minus: kalau siswa sedang "di level 5" belum tentu berarti level 5 sudah *selesai* dikerjakan (bisa jadi baru mulai).
  - **Opsi B — Level tertinggi dari `question_levels.level_number` yang punya minimal satu baris terkait di `student_answers`** (melalui `questions.level_id`) untuk sesi siswa tsb. Plus: lebih akurat mencerminkan "level yang benar-benar dikerjakan". Minus: query lebih berat (perlu join `student_answers` → `questions` → `question_levels`).
  - **Rekomendasi sementara**: gunakan Opsi B jika definisi "mencapai" dimaksudkan sebagai "sudah mengerjakan minimal 1 soal di level tsb", atau Opsi A jika cukup "level saat ini/terakhir dari progres siswa". **Tanyakan ke product owner (Aris) definisi mana yang dimaksud sebelum implementasi section Per Level dimulai** — pilihan ini memengaruhi akurasi jumlah siswa per kartu level dan isi file download per level.
  - Apa pun opsinya, terapkan **konsisten** di semua tempat yang menghitung "level tertinggi" (Komunitas & Sekolah), agar angka yang ditampilkan di kedua level tidak saling kontradiktif (mis. level tertinggi di kartu sekolah tidak boleh lebih tinggi dari yang muncul di agregat komunitasnya).

---

## 8. Definition of Done

- [ ] Semua form & tab di Bagian 4 terimplementasi sesuai penamaan baru ("Hasil Ujian" menggantikan "Analitik Laporan"/"Laporan"/"Laporan Hasil" di ketiga level).
- [ ] Section switcher (Per Level/Per Sesi-Fase/Per Sekolah untuk Komunitas; Per Kelas/Per Sesi-Fase/Per Level untuk Sekolah) di Bagian 4.8 terimplementasi lengkap dengan tombol download per kartu yang scope-nya benar.
- [ ] Toolbar filter kustom "Pusat Data Hasil Ujian" (Bagian 4.9) terimplementasi dengan field yang menyesuaikan scope tiap role.
- [ ] Semua item checklist Bagian 5 tercentang dan dibuktikan lewat kode (bukan asumsi).
- [ ] Semua skenario uji Bagian 6 lulus (termasuk skenario 10–15 terkait section & toolbar filter).
- [ ] Semua Gap di Bagian 7 (termasuk Gap 7.5 soal definisi "level tercapai") sudah mendapat keputusan tertulis dari pemilik produk (Aris) sebelum dianggap selesai — jika belum ada keputusan, implementasikan opsi paling konservatif (tidak mengubah schema/constraint) dan beri komentar TODO di kode yang merujuk ke nomor gap terkait.