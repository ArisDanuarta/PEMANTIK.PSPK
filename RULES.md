# 📋 RULES.MD - AI WORKFLOW & EXECUTION PROTOCOL

> **Setiap kali file ini di-mention, AI WAJIB mengikuti seluruh aturan berikut sebelum menulis satu baris kode pun.**

---

## 🔴 PRINSIP UTAMA

Jangan pernah langsung coding. Selalu **pahami dulu, rencanakan, verifikasi, baru eksekusi.**

---

## PHASE 1 - 🔍 FULL PROJECT AUDIT (WAJIB DILAKUKAN PERTAMA)

Sebelum apapun, lakukan pengecekan menyeluruh pada seluruh project:

### 1.1 Struktur Project
- [ ] Scan seluruh direktori dan struktur folder
- [ ] Identifikasi framework, bahasa, dan library yang digunakan
- [ ] Baca file konfigurasi utama (`package.json`, `composer.json`, `.env.example`, `config/`, dsb.)
- [ ] Catat arsitektur yang dipakai (MVC, monorepo, microservice, dll.)

### 1.2 Database & Relasi
- [ ] Baca semua file migration / schema
- [ ] Petakan seluruh tabel dan kolom yang ada
- [ ] Identifikasi semua relasi: `hasMany`, `belongsTo`, `manyToMany`, foreign key, dsb.
- [ ] Catat constraint, index, dan nullable fields yang relevan

### 1.3 Models & Business Logic
- [ ] Baca seluruh model / entity
- [ ] Pahami scope, accessor, mutator, dan method yang sudah ada
- [ ] Identifikasi validasi dan rule yang sudah diterapkan

### 1.4 Routes & Controllers / API Endpoints
- [ ] List semua route yang tersedia
- [ ] Pahami controller mana yang menangani fitur terkait
- [ ] Identifikasi middleware yang aktif (auth, role, dsb.)

### 1.5 Frontend / UI (jika ada)
- [ ] Pahami komponen yang sudah ada
- [ ] Identifikasi state management yang dipakai
- [ ] Catat pola penamaan dan konvensi yang digunakan

### 1.6 Existing Features
- [ ] Pahami fitur yang sudah berjalan agar tidak bentrok
- [ ] Identifikasi pattern/helper yang bisa di-reuse
- [ ] Catat hal-hal yang JANGAN diubah

---

## PHASE 2 - 🌐 CONTEXT & REFERENCE GATHERING

Setelah memahami project, kumpulkan referensi yang dibutuhkan:

- [ ] Cari dokumentasi resmi untuk library/framework yang digunakan
- [ ] Cari best practice untuk fitur yang akan dibuat
- [ ] Cari solusi untuk edge case atau masalah teknis yang diantisipasi
- [ ] Verifikasi apakah ada breaking change atau versi yang perlu diperhatikan
- [ ] Sesuaikan referensi dengan **versi yang dipakai di project ini**, bukan versi terbaru

> 💡 **Catat semua referensi yang ditemukan** dan jelaskan mengapa relevan.

---

## PHASE 3 - 📐 IMPLEMENTATION PLAN (WAJIB DITULIS SEBELUM CODING)

Buat rencana implementasi yang jelas dan terstruktur:

### Format Implementation Plan:

```
## IMPLEMENTATION PLAN

### Target / Goal:
[Jelaskan apa yang ingin dicapai]

### Files yang akan dibuat:
- path/to/file.ext - [alasan]

### Files yang akan dimodifikasi:
- path/to/file.ext - [perubahan apa, baris berapa]

### Database changes (jika ada):
- Tabel: [nama tabel]
- Kolom baru: [nama kolom, tipe, constraint]
- Relasi baru: [deskripsi relasi]
- Migration file: [nama file migration]

### Urutan eksekusi:
1. [Langkah pertama]
2. [Langkah kedua]
3. [dst...]

### Potensi risiko / hal yang perlu diperhatikan:
- [Risiko 1]
- [Risiko 2]

### Checklist verifikasi akhir:
- [ ] [Item 1]
- [ ] [Item 2]
```

> ⚠️ **Minta persetujuan atau konfirmasi sebelum eksekusi jika ada ambiguitas.**

---

## PHASE 4 - ⚙️ EKSEKUSI TERVERIFIKASI

Saat mengeksekusi implementation plan:

### 4.1 Database & Relasi
- [ ] Pastikan **setiap kolom foreign key** punya relasi yang terdefinisi di model
- [ ] Pastikan **setiap relasi di model** punya kolom yang sesuai di database
- [ ] Jangan hardcode ID atau nilai yang seharusnya dinamis
- [ ] Gunakan transaction jika ada multiple write operation yang saling bergantung

### 4.2 Code Quality
- [ ] Ikuti konvensi penamaan yang sudah ada di project
- [ ] Jangan duplikasi logic yang sudah ada - reuse helper/service yang tersedia
- [ ] Tambahkan komentar untuk logic yang kompleks
- [ ] Tangani error dan edge case dengan benar

### 4.3 Zero Miss Policy
- [ ] Tidak ada kolom database yang lupa ditambahkan ke migration
- [ ] Tidak ada relasi yang lupa didefinisikan di model
- [ ] Tidak ada route yang lupa didaftarkan
- [ ] Tidak ada import/dependency yang lupa ditambahkan
- [ ] Tidak ada environment variable yang lupa dicatat di `.env.example`

### 4.4 Target Alignment
- [ ] Setiap baris kode yang ditulis punya tujuan yang jelas sesuai plan
- [ ] Tidak ada fitur yang dibuat di luar scope yang diminta
- [ ] Tidak ada perubahan pada kode yang tidak ada di plan tanpa penjelasan

---

## PHASE 5 - ✅ CROSSCHECK & VERIFIKASI AKHIR

Setelah semua selesai dibuat, lakukan crosscheck menyeluruh:

### 5.1 Crosscheck dengan Implementation Plan
- [ ] Semua file yang direncanakan sudah dibuat/dimodifikasi?
- [ ] Semua langkah dalam urutan eksekusi sudah dijalankan?
- [ ] Semua checklist di plan sudah dicentang?

### 5.2 Crosscheck Database
- [ ] Jalankan ulang logika: apakah semua data yang dibutuhkan bisa diambil dari struktur yang ada?
- [ ] Apakah ada query yang berpotensi N+1? Sudah diatasi dengan eager loading?
- [ ] Apakah seed/dummy data dibutuhkan dan sudah disiapkan?

### 5.3 Crosscheck Relasi
- [ ] Setiap relasi bisa diakses dari kedua arah jika dibutuhkan?
- [ ] Cascade delete/update sudah dipertimbangkan?
- [ ] Pivot table (many-to-many) sudah lengkap dengan kolom yang tepat?

### 5.4 Crosscheck Target
- [ ] Output/hasil yang dihasilkan sesuai dengan yang diminta user?
- [ ] Semua requirement/kasus yang disebutkan sudah ter-cover?
- [ ] Ada hal yang mungkin terlewat atau bisa lebih baik?

### 5.5 Final Report
Setelah crosscheck, berikan laporan singkat:

```
## ✅ COMPLETION REPORT

### Yang sudah dibuat:
- [Item 1]
- [Item 2]

### Perubahan database:
- [Deskripsi perubahan]

### Yang perlu dilakukan manual (jika ada):
- [Contoh: jalankan `php artisan migrate`]
- [Contoh: tambahkan key X ke .env]

### Potensi improvement ke depan:
- [Saran opsional]
```

---

## 🚫 LARANGAN KERAS

| ❌ JANGAN | ✅ HARUS |
|-----------|----------|
| Langsung coding tanpa audit | Audit dulu, baru coding |
| Asumsikan struktur database tanpa cek | Baca migration/schema terlebih dahulu |
| Ubah file di luar scope plan | Buat plan, minta konfirmasi, baru eksekusi |
| Skip phase karena "kelihatannya simpel" | Semua phase WAJIB dijalankan |
| Buat relasi tanpa kolom yang sesuai | Pastikan DB dan model selalu sinkron |
| Selesai tanpa crosscheck | Crosscheck adalah bagian dari "selesai" |

---

## 📌 REMINDER OTOMATIS

Setiap kali `RULES.MD` di-mention, AI harus:

1. **Acknowledge** - Konfirmasi bahwa rules ini sedang diikuti
2. **State current phase** - Sebutkan sedang di phase mana
3. **Report before proceeding** - Laporkan temuan sebelum lanjut ke phase berikutnya

---

*Rules ini dirancang untuk memastikan setiap implementasi dilakukan dengan teliti, terstruktur, dan bebas dari kesalahan yang bisa dihindari.*