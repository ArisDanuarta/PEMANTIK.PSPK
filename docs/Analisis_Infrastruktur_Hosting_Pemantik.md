# ANALISIS INFRASTRUKTUR & HOSTING SISTEM PEMANTIK

Dokumen ini berisi analisis mendalam, rasionalisasi keputusan, serta perbandingan opsi infrastruktur *hosting* (server dan database) yang paling ideal untuk menopang **Sistem Asesmen Pemantik**.

---

## 1. LATAR BELAKANG: KARAKTERISTIK LALU LINTAS (TRAFFIC) PEMANTIK

Berdasarkan pola operasionalnya, Pemantik memiliki karakteristik beban kerja (*workload*) yang sangat unik dan ekstrem:
* **Spiky (Melonjak Tiba-tiba)**: Saat ada mitra/komunitas yang menyelenggarakan ujian, sistem bisa tiba-tiba diakses oleh **10.000 anak** secara bersamaan dalam jendela waktu beberapa jam saja.
* **Idle (Mati Suri)**: Di luar masa ujian, sistem nyaris tidak memiliki pengguna aktif sama sekali (0 interaksi). 

Karakteristik "Nol ke Sepuluh Ribu" ini membuat penggunaan **Server Konvensional (VPS bulanan) sangat tidak masuk akal**. Jika menyewa server murah, sistem akan mati (down) saat 10.000 anak ujian. Jika menyewa server mahal (puluhan juta per bulan), uang akan terbuang sia-sia saat sistem sedang tidak dipakai.

Oleh karena itu, arsitektur yang wajib digunakan adalah **Serverless (Tanpa Server Tetap)** dengan model pembayaran *Pay-as-you-go* (bayar sesuai tarikan data/pemakaian aktual).

---

## 2. FAKTOR PENYELAMAT: ARSITEKTUR OFFLINE-FIRST (MOBILE)

Satu hal yang membuat beban server Pemantik jauh lebih ringan dari yang dibayangkan adalah kecerdasan arsitektur aplikasi mobile-nya: **Offline-First (Sinkronisasi)**.

10.000 anak **tidak** melakukan "klik" ke server secara bersamaan setiap detiknya.
* **Klik ke-1 (Sync Down)**: Anak mengunduh soal ke HP.
* **Fase Offline**: Anak mengerjakan soal tanpa internet (0 interaksi ke server).
* **Klik ke-2 (Sync Up)**: Anak menekan kirim di akhir sesi.

Artinya, server hanya perlu menahan "pintu antrean" di awal dan di akhir, bukan sepanjang durasi ujian. Ini sangat menghemat biaya operasional database.

---

## 3. ANALISIS HOSTING DATABASE & BACKEND

Sistem Pemantik saat ini sudah dibangun di atas fondasi ekosistem **Supabase** (PostgreSQL, Edge Functions, RLS). 

### A. Rekomendasi Utama: Supabase (Paket Pro)
Tetap menggunakan Supabase (tidak pindah ke penyedia lain) dengan mengaktifkan paket berbayar tingkat dasar (Pro Plan).

| Aspek | Supabase Pro |
| :--- | :--- |
| **Kelebihan** | 1. Tidak perlu merombak ulang kode (hemat waktu & biaya developer).<br>2. Fitur *Supavisor* (Connection Pooling) otomatis membariskan ribuan anak yang mengantre kirim jawaban tanpa membuat database "jebol".<br>3. Sangat stabil untuk aplikasi yang butuh keamanan ketat (Row Level Security). |
| **Kekurangan** | Server berada di region global (misal: Singapura), bukan di Jakarta, walau latensinya masih sangat aman untuk Indonesia (sekitar 20-30ms). |
| **Rasionalisasi** | Pemantik butuh sinkronisasi JSON mentah yang sangat kompleks dari HP. Edge Functions di Supabase sudah dibuat khusus untuk ini. Memindahkannya ke database lain sama dengan membuat ulang 50% sistem. |

### B. Perbandingan dengan Opsi Lain (Database)

| Penyedia | Analisis Kekurangan untuk Pemantik | Keputusan |
| :--- | :--- | :--- |
| **Firebase (Google)** | Struktur data Pemantik (Relasional/SQL) sangat berbeda dengan Firebase (NoSQL). Memaksa pindah ke Firebase akan menghancurkan sistem pelaporan yang sudah ada. | ❌ **Ditolak** |
| **AWS RDS Serverless** | Basis datanya sama (PostgreSQL), namun AWS tidak menyediakan sistem Autentikasi dan *Security Rules* sepraktis Supabase secara bawaan. Biaya AWS sering kali "bocor" tak terduga. | ❌ **Ditolak** |
| **VPS DB (Niagahoster/Hostinger)** | Tidak memiliki sistem *Connection Pooling* otomatis. Saat 10.000 anak melakukan *Sync Up*, server ini berpotensi besar langsung *Error 500* atau mati. | ❌ **Ditolak** |

---

## 4. ANALISIS HOSTING WEB PORTAL (FRONTEND NEXT.JS)

Web portal (diakses oleh Super Admin, Admin Soal, Komunitas, Sekolah, Guru) dibangun menggunakan framework **Next.js**.

### A. Rekomendasi Utama: Vercel (Paket Pro)
Vercel adalah perusahaan yang menciptakan Next.js. Vercel menganut sistem *Serverless Edge*.

| Aspek | Vercel Pro |
| :--- | :--- |
| **Kelebihan** | 1. **Auto-Scaling Otomatis**: Saat sepi server "tidur". Saat ramai tiba-tiba (misal ribuan guru membuka dashboard), Vercel seketika melipatgandakan mesinnya sendiri.<br>2. Kode Next.js dipastikan berjalan paling optimal dan cepat tanpa ada *error routing*.<br>3. Gratis *Bandwidth* besar bulanan. |
| **Kekurangan** | Cenderung mahal jika ada serangan data atau jika aplikasi dipakai terus menerus 24 jam dengan lalu lintas bergiga-giga (yang mana bukan kasus Pemantik). |
| **Rasionalisasi** | Sifat Pemantik yang *idle* lalu melonjak (*spiky*) adalah target pasar utama Vercel. Anda tak perlu repot memikirkan spesifikasi RAM/CPU. |

### B. Perbandingan dengan Opsi Lain (Web Hosting)

| Penyedia | Analisis Kekurangan untuk Pemantik | Keputusan |
| :--- | :--- | :--- |
| **Cloudflare Pages** | Bagus, murah, dan sangat cepat (Pesaing kuat Vercel). Namun, terkadang ada beberapa *library* Next.js terbaru yang belum 100% didukung sempurna di sistem "Workers" milik Cloudflare. | ⚠️ **Bisa Dipertimbangkan** |
| **VPS (DigitalOcean/AWS EC2)** | Anda harus menyewa tim IT ekstra hanya untuk mengatur Linux, Nginx, SSL, dan Docker secara manual. Anda bayar kapasitas 100% setiap bulan walau sistem 90% menganggur. | ❌ **Ditolak** |
| **Shared Hosting Lokal (cPanel)** | Next.js berbasis Node.js tidak bisa dan tidak dirancang berjalan di *Shared Hosting* murah (seperti cPanel pada umumnya). Performa akan sangat buruk. | ❌ **Ditolak** |

---

## 5. KESIMPULAN EKSEKUTIF & ESTIMASI BIAYA DASAR

Berdasarkan karakteristik operasional Pemantik (Sangat Sepi ➔ Tiba-tiba Sangat Ramai ➔ Sangat Sepi lagi), pendekatan **Modern Serverless** adalah harga mati untuk menjaga kewarasan teknis dan kesehatan finansial.

**Arsitektur Final yang Direkomendasikan:**
1. **Backend & Database**: **Supabase (Pro Plan)**
2. **Frontend Web Portal**: **Vercel (Pro Plan)**

**Estimasi Biaya Infrastruktur Bulanan (Saat Sepi / Standby):**
* Supabase Pro: ~$25 (Rp 400.000)
* Vercel Pro: ~$20 (Rp 320.000)
* **Total Biaya Dasar: ± Rp 720.000 / bulan.**

**Bagaimana Saat Ujian Tiba (Lalu Lintas 10.000 Anak)?**
Karena sistemnya *Pay-as-you-go*, saat ada ujian Anda tidak perlu menelepon teknisi untuk memperbesar server. Sistem Supabase dan Vercel akan merenggang secara otomatis. Anda mungkin akan ditagih biaya ekstra kecil per GigaByte data yang lewat pada bulan tersebut (biasanya hanya bertambah puluhan hingga ratusan ribu rupiah), namun **sistem dijamin tetap hidup (uptime 99.9%)**. Biaya ini jauh lebih murah daripada membayar VPS raksasa seharga jutaan rupiah setiap bulan tanpa henti.
