/**
 * config.js
 * -----------------------------------------------------------------------
 * Semua ASUMSI dan MAPPING migrasi dikumpulkan di sini supaya gampang
 * direview/diubah tanpa harus bongkar logic di file lain.
 *
 * Kalau ada yang salah, tinggal edit file ini saja lalu jalankan ulang
 * dengan --dry-run untuk cek hasilnya dulu sebelum insert ke Supabase.
 * -----------------------------------------------------------------------
 */

module.exports = {
  // -----------------------------------------------------------------
  // 1. Urutan posisi "Answer N" -> topik Numerasi (TERVERIFIKASI by
  //    content-matching soal.xlsx vs Export_Daftar_Soal_Pemantik,
  //    konsisten di level 1-4). Index array = posisi Answer (0-based).
  // -----------------------------------------------------------------
  NUMERASI_TOPIC_ORDER: [
    'Bilangan_Operasi', // Answer 1
    'Aljabar',          // Answer 2
    'Geometri',         // Answer 3
    'Pengukuran',       // Answer 4
    'Data_Peluang',     // Answer 5
  ],

  // -----------------------------------------------------------------
  // 2. Kategori soal lama -> kode prefix baru + nama Paket Soal di DB.
  //    "Paket Literasi Uji Coba" (TES-LIT-*) SENGAJA tidak dipakai
  //    (masih draft, per konfirmasi Aris).
  // -----------------------------------------------------------------
  CATEGORY_MAP: {
    Literasi: { prefix: 'LIT', paketNama: 'Paket Literasi', subjectArea: 'literasi' },
    Numerasi: { prefix: 'NUM', paketNama: 'Paket Numerasi', subjectArea: 'numerasi' },
  },

  // -----------------------------------------------------------------
  // 3. Mapping teks SES lama -> label ses_class di DB baru.
  //    !! CEK LAGI: samakan persis dengan value enum `ses_class` yang
  //    ada di database (SELECT enum_range(NULL::ses_class_enum_name)).
  //    Saya tulis best-guess snake_case di sini.
  // -----------------------------------------------------------------
  SES_CLASS_MAP: {
    'Bawah': 'bawah',
    'Menengah Bawah': 'menengah_bawah',
    'Menengah': 'menengah',
    'Menengah Atas': 'menengah_atas',
    'Atas': 'atas',
  },

  // Skor representatif per kelas SES, dipakai untuk kolom students.ses_score
  // (integer). Sesuaikan dengan ses_thresholds yang berlaku di production.
  SES_SCORE_MAP: {
    'Bawah': 10,
    'Menengah Bawah': 30,
    'Menengah': 50,
    'Menengah Atas': 70,
    'Atas': 90,
  },

  // -----------------------------------------------------------------
  // 4. Default academic_year untuk tabel `classes` (tidak ada di data
  //    lama). Dipakai kalau tidak bisa diturunkan dari created_at.
  // -----------------------------------------------------------------
  DEFAULT_ACADEMIC_YEAR: '2025/2026',

  // -----------------------------------------------------------------
  // 5. Sandbox dulu sebelum production: komunitas/sekolah/siswa yang
  //    dibuat script ini akan ditandai `is_sandbox = true` di tabel
  //    `communities` (kolom ini sudah ada di schema). Kalau hasil review
  //    sudah oke, tinggal update is_sandbox jadi false di DB (atau
  //    jalankan ulang dengan SANDBOX_MODE: false untuk batch berikutnya).
  // -----------------------------------------------------------------
  SANDBOX_MODE: true,

  // -----------------------------------------------------------------
  // 6. Ukuran batch insert supaya tidak overload Supabase.
  // -----------------------------------------------------------------
  BATCH_SIZE: 500,

  // -----------------------------------------------------------------
  // 7. Default PIN untuk siswa hasil migrasi (akan di-hash bcrypt).
  //    Sebaiknya diganti / dipaksa reset di app setelah import.
  // -----------------------------------------------------------------
  DEFAULT_STUDENT_PIN: '123456',
};
