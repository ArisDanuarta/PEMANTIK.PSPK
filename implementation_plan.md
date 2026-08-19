# SES Normalization and Validation System

Kita akan merombak cara sistem membaca dan mendeteksi data SES (Pendidikan & Pekerjaan Orang Tua) saat mengimpor data (seperti Dapodik atau Excel), agar lebih pintar membaca variasi teks dan lebih ketat terhadap data yang benar-benar tidak dikenali.

## User Review Required

> [!IMPORTANT]
> **Penghapusan Penambahan Otomatis (Auto-Insert)**
> Saat ini, jika ada nama pekerjaan/pendidikan baru di file Dapodik, sistem secara otomatis memasukkannya ke database dengan status `needs_review`. Sesuai permintaan Anda, saya akan **mematikan** fitur otomatis ini. Jika ada nama yang sama sekali tidak dikenali, baris siswa tersebut akan **ditolak (gagal diimpor)** dan memunculkan error spesifik (misal: `"Gagal: Pekerjaan Ayah 'Peternak Sapi' belum ada di database SES"`). Apakah Anda setuju dengan skema penolakan baris ini?

## Proposed Changes

### 1. Sistem Alias (Pendeteksi Pintar)
#### [NEW] `apps/web/src/lib/utils/sesMatcher.ts`
Membuat utilitas yang bertugas membersihkan teks dan mencocokkannya dengan alias yang sudah kita tentukan. Misalnya:
- `"SMA/SMK/MA/SEDERAJAT"`, `"SMK"`, `"SLTA"` -> otomatis dibaca sebagai `"SMA"`
- `"SMP/MTS/SEDERAJAT"`, `"MTS"` -> otomatis dibaca sebagai `"SMP"`
- `"D-1"`, `"D.1"`, `"D 1"` -> otomatis dibaca sebagai `"D1"`
- `"D-3"`, `"DIPLOMA"` -> otomatis dibaca sebagai `"D3"`
- `"PEGAWAI SWASTA"` -> otomatis dibaca sebagai `"KARYAWAN SWASTA"`
- `"TIDAK BERSEKOLAH"` -> otomatis dibaca sebagai `"TIDAK SEKOLAH"`

### 2. Modifikasi Impor Dapodik
#### [MODIFY] `apps/web/src/app/actions/schools.ts`
- Memodifikasi fungsi `resolveOrCreateSesVariable` agar tidak lagi melakukan `.insert()` ke database saat data tidak ditemukan.
- Mengubah fungsi ini agar menggunakan `sesMatcher.ts` untuk mencari kecocokan nama.
- Jika nama yang sudah distandardisasi tetap tidak ditemukan di database (`ses_variables`), fungsi ini akan melemparkan error spesifik seperti: `"Data Pekerjaan Ibu '...' belum terdaftar"`. Baris data anak tersebut akan dilewati dan dilaporkan ke daftar error.

### 3. Pembaruan Data Susulan (Migration)
#### [EXECUTE] `migrate/fix_student_ses_data.js`
Menjalankan kembali skrip perbaikan untuk siswa `SD Alhilaal Jamilu` karena Anda telah menambahkan variabel "Lainnya" dan memperbaiki "Tidak Bekerja" di pengaturan Superadmin.

## Verification Plan
1. Mengecek daftar siswa yang baru saja diperbarui menggunakan skrip susulan, memastikan anak dengan pekerjaan orang tua "Lainnya" sudah mendapatkan nilai SES yang tepat.
2. Mensimulasikan pemanggilan fungsi import Dapodik dengan variasi penulisan seperti "D-3" dan memastikan nilainya bisa dipetakan tanpa membuat duplikat di database.
