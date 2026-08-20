# Panduan Lengkap Migrasi Data Ujian Lama ke Platform Baru (Pemantik)

Dokumen ini merupakan pedoman komprehensif berdasarkan pembelajaran dari proses migrasi riwayat ujian KKN UGM. Agar semua fitur dari **Dashboard Admin** hingga **Export Excel 0/1** dapat menyajikan data dengan sempurna tanpa _blank_ atau nilai yang hilang, ikuti daftar periksa (_checklist_) dan peringatan berikut.

---

## 1. Persiapan Data Hierarki Sekolah
Platform baru menggunakan skema relasi hierarkis ketat: `Komunitas` -> `Sekolah` -> `Kelas` -> `Siswa`.

- **Constraint Unik**: Tabel `students` mensyaratkan `username` yang unik (`students_username_key`). Selalu sediakan formula _username_ yang konsisten (misal NISN + kode unik).
- **Relasi Wajib**: Siswa tidak bisa berdiri sendiri, mereka wajib merujuk ke UUID `school_id` dan `class_id` yang valid di dalam database.
- **Hindari Pemicu (Trigger) Ganda**: Saat memasukkan data siswa baru ke tabel `students`, jika menggunakan API backend biasa, pastikan _trigger_ `auth.users` berfungsi dengan baik atau masukkan _dummy password_ (`pin_hash`) agar tidak gagal _login_.

## 2. Pemetaan Kode Soal (Questions Mapping)
Jangan membuat ID soal secara acak. Hubungkan data jawaban lama dengan bank soal di platform baru melalui `question_code` (misal: `NUM-0-3`, `LIT-1-4`).

- **Validasi Referensi**: Sebelum memasukkan `student_answers`, pastikan sistem melakukan lookup/pencarian ID dengan mencocokkan `question_code` dari Excel ke tabel `questions`.
- **Pengaruh Level**: Jika `question_id` yang terpasang salah, maka `level_id` yang ditarik oleh sistem akan salah. Ini akan merusak kalkulasi hasil ujian.

## 3. WAJIB: Kalkulasi `current_level_id` (Syarat Utama Dashboard)
> [!CAUTION]
> **Penyebab Utama Dashboard Kosong!**
> Tabel `assessment_sessions` memiliki kolom `current_level_id`. Jika dibiarkan `null`, Views Database seperti `v_assessment_report` akan mengabaikan seluruh data sesi tersebut. Akibatnya grafik distribusi Literasi/Numerasi di Dashboard Sekolah maupun Komunitas akan kosong (0).

**Cara Mengatasi**:
Setelah memasukkan semua data `student_answers`, Anda **harus** menjalankan skrip atau logika yang mengecek soal dengan level tertinggi yang dijawab pada sesi tersebut, lalu memperbarui (`UPDATE`) kolom `current_level_id` pada `assessment_sessions` dengan UUID level tertinggi tersebut.

## 4. Keamanan Beban Kueri (Cegah Error 0/1 Kosong Saat Export)
> [!WARNING]
> **Penyebab Utama Matrix 0/1 Excel Gagal Tampil (`"-"`)**
> Supabase JS secara default mengubah filter `.in("session_id", [id1, id2, ..., id500])` menjadi kueri teks panjang di URL. Jika Anda langsung melempar 500 ID untuk menarik data `student_answers` saat *export*, sistem akan diam-diam terkena error **HTTP 414 URI Too Long**. Data jawaban tidak akan terambil, dan matriks Excel akan menampilkan kosong (`"-"`).

**Cara Mengatasi**:
Setiap penarikan data dalam jumlah besar (seperti di `/api/export/detailed-results`) wajib menggunakan metode _Chunking_ (pemotongan antrean). Pecah daftar ID sesi menjadi maksimal **100 ID per kueri**, lalu gabungkan (`push`) hasilnya.

## 5. Sinkronisasi Data Demografi & SES Orang Tua
Pengisian Status Ekonomi Sosial (SES) tidak boleh dilakukan dengan nilai sembarangan. Ini adalah penyebab mengapa data Pekerjaan dan Pendidikan Ibu/Ayah sering muncul kosong di hasil _export_.

### A. Validasi Ketersediaan Variabel
Pastikan semua jenis pekerjaan di file Excel lama **sudah terdaftar** di menu `Superadmin -> Variabel SES`. Jika ada pekerjaan seperti "Lainnya" atau "Nelayan" yang tidak ada di referensi, skrip tidak akan bisa memetakannya (akan melempar `null` / kosong).

### B. Pembersihan Format (Normalize Matcher)
String dari file lama sangat bervariasi. Gunakan sistem `sesMatcher` yang ada di `apps/web/src/lib/utils/sesMatcher.ts` untuk membersihkan teks sebelum me-lookup ID ke database `ses_variables`. Contoh standarisasi yang harus dikonversi skrip:
- `"Pegawai Swasta"` -> `"KARYAWAN SWASTA"`
- `"Tidak Bekerja"` / `"Mengurus Rumah Tangga"` -> `"IBU RUMAH TANGGA"` (tipe: occupation)
- `"D-3"`, `"D.3"`, `"Diploma 3"` -> `"D3"`
- `"SMA/SMK/MA/SEDERAJAT"` -> `"SMA"`

### C. Pemetaan Kelas SES (`ses_class`)
Nilai akhir SES ("Bawah", "Menengah Bawah") harus dikonversi ke format enum tabel (`bawah`, `menengah_bawah`, `menengah`, `menengah_atas`, `atas`) sebelum dimasukkan ke kolom `ses_class` pada tabel `students`. Jika spasi tidak ditangani, insert akan gagal/kosong.

---

## Rangkuman Urutan Migrasi Optimal
Jika akan melakukan migrasi serupa di masa depan, ikuti langkah berikut:
1. Siapkan `ses_variables` di Superadmin untuk menangkap semua kemungkinan Pekerjaan/Pendidikan.
2. Upsert `Communities`, lalu `Schools`, lalu `Classes`.
3. Gunakan `sesMatcher` untuk membersihkan data orang tua saat Insert ke `Students`. 
4. Tarik Peta `question_code` -> `id`.
5. Insert `assessment_sessions`.
6. Insert `student_answers` menggunakan mapping soal.
7. **(Krusial)** Lakukan iterasi untuk menghitung soal level tertinggi dari tiap sesi, dan lakukan `UPDATE assessment_sessions SET current_level_id = [Max_Level]`.
