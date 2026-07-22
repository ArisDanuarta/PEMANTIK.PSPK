# MATRIKS LINIMASA FITUR BERDASARKAN HALAMAN / MODUL (ALL ROLES)

Dokumen ini memetakan seluruh fitur sistem Pemantik dari Aplikasi Web hingga Mobile, dipecah **berdasarkan halaman/fitur**, bukan dikelompokkan berdasarkan role.

Tabel di bawah ini menggunakan format ekuivalen dengan Excel. Tanda 🟩 menunjukkan bilah waktu (progress bar) kapan fitur tersebut dikerjakan berdasarkan riwayat kode sistem (Juni - Juli 2026). Penjelasan disajikan dalam bahasa sehari-hari yang mudah dipahami.

<br/>

<div style="overflow-x: auto;">
  <table border="1" style="border-collapse: collapse; text-align: center; width: 100%; min-width: 1000px;">
    <thead style="background-color: #f3f4f6;">
      <tr>
        <th rowspan="2" style="padding: 10px;">Kategori & Fitur</th>
        <th rowspan="2" style="padding: 10px;">Role (Aktor)</th>
        <th colspan="4" style="padding: 10px;">Juni</th>
        <th colspan="4" style="padding: 10px;">Juli</th>
        <th colspan="4" style="padding: 10px;">Agustus</th>
        <th rowspan="2" style="padding: 10px; width: 30%;">Penjelasan Singkat</th>
      </tr>
      <tr>
        <th>w1</th><th>w2</th><th>w3</th><th>w4</th>
        <th>w1</th><th>w2</th><th>w3</th><th>w4</th>
        <th>w1</th><th>w2</th><th>w3</th><th>w4</th>
      </tr>
    </thead>
    <tbody>
      <!-- AUTENTIKASI -->
      <tr style="background-color: #f9fafb;">
        <td colspan="15" align="left" style="padding: 5px 10px;"><strong>1. Autentikasi & Akses Masuk</strong></td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Login Web Portal</td>
        <td>Super Admin, Admin Soal, Komunitas, Sekolah, Guru</td>
        <td></td><td>🟩</td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Pintu masuk sistem menggunakan Email dan Kata Sandi dengan keamanan terpusat.</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Login Aplikasi Mobile</td>
        <td>Anak</td>
        <td></td><td>🟩</td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Siswa masuk ke aplikasi di HP/Tablet cukup menggunakan Username/NISN dan PIN 6 angka.</td>
      </tr>

      <!-- DASHBOARD -->
      <tr style="background-color: #f9fafb;">
        <td colspan="15" align="left" style="padding: 5px 10px;"><strong>2. Dashboard (Beranda Utama)</strong></td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Beranda Super Admin</td>
        <td>Super Admin</td>
        <td></td><td></td><td></td><td>🟩</td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Pusat kendali melihat ringkasan total sekolah, partisipasi ujian se-Indonesia, dan statistik umum.</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Beranda Admin Soal</td>
        <td>Admin Soal</td>
        <td></td><td></td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Halaman untuk memantau berapa banyak soal yang sudah dibuat dan aktif digunakan.</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Beranda Komunitas</td>
        <td>Komunitas</td>
        <td></td><td></td><td></td><td>🟩</td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Melihat status kemajuan (sudah ujian atau belum) dari sekolah-sekolah di bawah binaan komunitas tersebut.</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Beranda Sekolah</td>
        <td>Sekolah</td>
        <td></td><td></td><td></td><td>🟩</td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Kepala sekolah memantau alur tahapan ujian sekolahnya (misal: "Tahap 3: Sedang Ujian").</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Beranda Guru</td>
        <td>Guru</td>
        <td></td><td></td><td></td><td>🟩</td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Guru memantau grafik profil murid di kelasnya dan melihat hasil nilai murid yang baru selesai ujian.</td>
      </tr>

      <!-- MANAJEMEN PENGGUNA -->
      <tr style="background-color: #f9fafb;">
        <td colspan="15" align="left" style="padding: 5px 10px;"><strong>3. Manajemen Data Pengguna & Master Data</strong></td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Kelola Data Komunitas</td>
        <td>Super Admin</td>
        <td></td><td></td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Menambah, mengedit, atau menonaktifkan akun mitra/organisasi penggerak.</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Kelola Data Sekolah</td>
        <td>Super Admin, Komunitas</td>
        <td></td><td></td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Mendaftarkan sekolah baru dan melihat daftar lengkap sekolah beserta NPSN dan alamatnya.</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Kelola Guru & Kelas</td>
        <td>Super Admin, Komunitas, Sekolah</td>
        <td></td><td></td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Mendaftarkan akun untuk guru dan membuat kelompok/rombongan belajar (kelas).</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Kelola Data Siswa</td>
        <td>Super Admin, Komunitas, Sekolah</td>
        <td></td><td></td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Mendaftarkan siswa dan memasukkan mereka ke kelas yang diajar oleh guru tertentu.</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Bantuan Reset Sandi</td>
        <td>Guru</td>
        <td></td><td></td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Jika anak lupa PIN saat ujian, Guru punya tombol praktis untuk mereset sandi anak kembali ke standar (123456).</td>
      </tr>

      <!-- DAPODIK -->
      <tr style="background-color: #f9fafb;">
        <td colspan="15" align="left" style="padding: 5px 10px;"><strong>4. Integrasi Sistem Pemerintah</strong></td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Tarik Data Dapodik</td>
        <td>Super Admin, Komunitas, Sekolah</td>
        <td></td><td></td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Daripada ketik manual, pengguna bisa menarik data guru, siswa, dan kelas secara instan dari server Dapodik.</td>
      </tr>

      <!-- UJIAN & BANK SOAL -->
      <tr style="background-color: #f9fafb;">
        <td colspan="15" align="left" style="padding: 5px 10px;"><strong>5. Ujian & Bank Soal</strong></td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Pembuatan Bank Soal</td>
        <td>Admin Soal, Super Admin</td>
        <td></td><td></td><td>🟩</td><td>🟩</td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Membuat berbagai tipe pertanyaan (pilihan ganda, rekam suara anak, tarik garis) dan mengaturnya ke dalam paket level (Mudah ke Susah).</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Jadwal Akses Ujian</td>
        <td>Super Admin, Komunitas, Sekolah</td>
        <td></td><td></td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Membagikan jadwal "kunci" ujian ke sekolah agar murid bisa mulai mengunduh dan mengerjakan paket soal tersebut.</td>
      </tr>

      <!-- APLIKASI MOBILE ANAK -->
      <tr style="background-color: #f9fafb;">
        <td colspan="15" align="left" style="padding: 5px 10px;"><strong>6. Pengalaman Aplikasi Mobile (Pengerjaan Ujian)</strong></td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Unduh Soal Mode Offline</td>
        <td>Anak</td>
        <td></td><td></td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Sistem "Sync Down" di mana HP siswa mengunduh semua pertanyaan dan gambar saat ada sinyal, agar ujian bisa dilanjut tanpa internet.</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Mesin Penentu Lulus/Naik Level (Auto Pilot)</td>
        <td>Anak</td>
        <td></td><td></td><td></td><td>🟩</td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Saat internet kembali nyala, aplikasi mengirim jawaban. Sistem server langsung menghitung nilai dan otomatis memberi tahu apakah anak naik level atau gagal.</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Perekaman Jejak Jawaban</td>
        <td>Anak</td>
        <td></td><td></td><td></td><td></td>
        <td></td><td>🟩</td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Setiap ketukan, pilihan ganda, dan suara yang direkam anak dikirim secara detail untuk dilihat oleh sistem dan guru.</td>
      </tr>

      <!-- PELAPORAN & INTERVENSI -->
      <tr style="background-color: #f9fafb;">
        <td colspan="15" align="left" style="padding: 5px 10px;"><strong>7. Pelaporan, Analisis, & Evaluasi</strong></td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Laporan Nilai & Distribusi SES</td>
        <td>Super Admin, Komunitas, Sekolah</td>
        <td></td><td></td><td></td><td>🟩</td>
        <td>🟩</td><td>🟩</td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Tabel rekapitulasi nilai akhir seluruh siswa, digabungkan dengan grafik demografi dan Status Sosial Ekonomi (SES) orang tuanya.</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Pelaporan Intervensi Guru</td>
        <td>Guru</td>
        <td></td><td></td><td></td><td></td>
        <td>🟩</td><td>🟩</td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Setelah ujian selesai, Guru diwajibkan mengetik cerita/evaluasi tentang bagaimana keadaan kelasnya dan apa rencana perbaikannya.</td>
      </tr>

      <!-- APPROVAL (PERSETUJUAN) -->
      <tr style="background-color: #f9fafb;">
        <td colspan="15" align="left" style="padding: 5px 10px;"><strong>8. Alur Persetujuan Bertingkat (Approval)</strong></td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Validasi Intervensi Guru</td>
        <td>Sekolah, Komunitas</td>
        <td></td><td></td><td></td><td></td>
        <td>🟩</td><td>🟩</td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Kepala Sekolah dan Komunitas membaca laporan evaluasi yang dibuat Guru. Jika dirasa cukup, mereka menekan tombol "Setuju".</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Penutupan Ujian Sekolah</td>
        <td>Super Admin</td>
        <td></td><td></td><td></td><td></td>
        <td></td><td>🟩</td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Super Admin menekan tombol final untuk menyatakan bahwa satu sekolah tersebut sudah tuntas menjalankan program secara keseluruhan.</td>
      </tr>

      <!-- PENGATURAN -->
      <tr style="background-color: #f9fafb;">
        <td colspan="15" align="left" style="padding: 5px 10px;"><strong>9. Keamanan & Pengaturan Lanjut</strong></td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Log Aktivitas Sistem</td>
        <td>Super Admin</td>
        <td></td><td>🟩</td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Buku catatan otomatis untuk melacak pergerakan keamanan (siapa yang login, siapa yang menghapus data, dsb).</td>
      </tr>
      <tr>
        <td align="left" style="padding: 8px;">Pengaturan Global</td>
        <td>Super Admin</td>
        <td></td><td></td><td>🟩</td><td></td>
        <td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td>
        <td align="left" style="padding: 8px;">Halaman untuk mengatur konfigurasi dasar, seperti menghidupkan/mematikan mode "Pemeliharaan (Maintenance)" pada server.</td>
      </tr>

    </tbody>
  </table>
</div>
