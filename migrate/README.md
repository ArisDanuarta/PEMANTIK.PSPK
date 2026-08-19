# Migrasi Data Ujian KKN UGM → Pemantik

Script Node.js untuk migrasi hasil ujian dari platform lama (export Excel
per-level) ke database Supabase Pemantik.

## Struktur

```
config.js              semua asumsi & mapping (SES, urutan topik Numerasi, dll)
lib/answerKey.js        parse soal.xlsx -> kunci jawaban per level+posisi
lib/parseOldExport.js   parse file export ujian lama -> sesi ternormalisasi
lib/buildEntities.js    bangun communities/schools/classes/students + dedup
lib/supabaseClient.js   koneksi Supabase (pakai Service Role Key)
dryRun.js               validasi OFFLINE, tanpa koneksi DB sama sekali
load.js                 insert ke Supabase (default dry-run, --execute utk beneran)
input/                  taruh semua file .xlsx export lama + soal.xlsx di sini
output/                 hasil report dryRun.js
```

## Cara pakai

### 1. Install dependency

```bash
npm install
```

### 2. Siapkan file input

Taruh di folder `input/`:
- `soal.xlsx` — bank soal + kunci jawaban platform lama
- Semua file export ujian lama (`.xlsx`, satu file per komunitas atau
  berapapun jumlah filenya — script otomatis baca semua `.xlsx` di folder
  ini kecuali `soal.xlsx`)

### 3. Validasi OFFLINE dulu (WAJIB sebelum lanjut)

```bash
node dryRun.js
```

Ini tidak konek ke database sama sekali. Cek di terminal & di
`output/dry_run_report.json`:
- Jumlah sesi/siswa/sekolah/komunitas masuk akal?
- Warning duplikat siswa (nama+sekolah+kelas sama tapi id beda) — ini
  butuh **review manual**, bukan auto-merge.
- Berapa jawaban yang gagal ke-link ke question_code baru (`matchedAnswers`
  vs `totalAnswers`) — kalau ada gap besar, cek `config.js`.

### 4. Siapkan kredensial Supabase

```bash
cp .env.example .env
# isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY (Service Role, bukan anon)
```

### 5. Dry-run TERKONEKSI (validasi lookup question_code ke DB asli)

```bash
node load.js
```

Ini konek ke DB (read-only untuk lookup `questions`), tapi TIDAK insert
apa-apa. Berguna untuk cek apakah semua `LIT-*`/`NUM-*` yang dibutuhkan
memang sudah ada di tabel `questions` production/sandbox kamu.

### 6. Insert sungguhan

```bash
node load.js --execute
```

Berjalan bertahap: `communities → schools → classes → students →
assessment_sessions → student_answers`, di-batch 500 baris per insert
(`config.BATCH_SIZE`).

Semua entity yang dibuat otomatis diberi `is_sandbox = true` di tabel
`communities` (lihat `config.SANDBOX_MODE`) — sesuai keputusan untuk
uji coba di sandbox dulu sebelum production. Kalau hasil review oke,
tinggal ubah `is_sandbox` jadi `false` di database, atau set
`SANDBOX_MODE: false` di `config.js` untuk batch import berikutnya.

## Asumsi penting (cek `config.js`)

1. **Urutan topik Numerasi** (Bilangan_Operasi=1, Aljabar=2, Geometri=3,
   Pengukuran=4, Data_Peluang=5) — sudah **diverifikasi** lewat
   content-matching `soal.xlsx` vs `Export_Daftar_Soal_Pemantik`, konsisten
   di level 1-4.
2. **`SES_CLASS_MAP` / `SES_SCORE_MAP`** — best-guess, HARUS dicek lagi
   supaya cocok dengan enum `ses_class` yang sebenarnya berlaku di DB.
3. **`DEFAULT_ACADEMIC_YEAR`** — data lama tidak punya info tahun ajaran,
   dipakai default. Sesuaikan kalau perlu.
4. **Dedup siswa** — kunci utama `(organisasi_user, id_user)` dari sistem
   lama, karena `id_user` konsisten dipakai berulang untuk siswa yang sama.
   Fingerprint `(nama+sekolah+kelas)` dipakai sebagai pengaman tambahan
   untuk deteksi kemungkinan duplikat (di-flag, **tidak** di-auto-merge).
5. **PIN siswa** — semua siswa hasil migrasi diberi PIN default
   (`config.DEFAULT_STUDENT_PIN`, di-hash bcrypt). Sebaiknya dipaksa reset
   setelah data masuk.
6. **`level_id`** di `assessment_sessions` sengaja dikosongkan (`null`) —
   kalau skema butuh FK spesifik ke `question_levels`, tambahkan lookup-nya
   di `load.js` bagian [6/6] sebelum eksekusi ke production.

## Yang TIDAK dilakukan script ini

- **Tidak** membuat soal baru di tabel `questions` — script cuma lookup
  `question_id` dari kode yang sudah ada (`LIT-*`/`NUM-*`, kategori
  "Paket Literasi Uji Coba" / draft `2024` sengaja diabaikan).
- **Tidak** auto-merge siswa yang diduga duplikat — hanya kasih warning.
- **Tidak** menghapus/mengubah data yang sudah ada di Supabase — semua
  operasi upsert-by-lookup atau insert baru.
