import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Kunci storage yang konsisten dipakai di seluruh app
// ─────────────────────────────────────────────────────────────────────────────
const _kStudentJwtKey = 'student_jwt';

// Singleton secure storage khusus untuk token (hindari shared instance circular)
const _tokenStorage = FlutterSecureStorage();

class SupabaseConfig {
  static const String supabaseUrl = 'https://bhrqorbjdmlewwmlajfg.supabase.co';
  static const String supabaseAnonKey =
      'sb_publishable_SzhpIVvCr63y2FuU4fAAHg_pUw-rB7u';

  /// Kunci storage untuk JWT siswa - gunakan konstanta ini di seluruh app
  /// agar tidak ada typo key yang menyebabkan token tidak terbaca.
  static const String studentJwtKey = _kStudentJwtKey;

  /// Initialize Supabase dengan accessToken callback.
  ///
  /// Cara kerja:
  /// - Setiap kali Supabase client membuat HTTP request ke Supabase,
  ///   ia akan memanggil fungsi [accessToken] ini untuk mendapatkan token terbaru.
  /// - Kita kembalikan JWT siswa dari SecureStorage.
  /// - Jika belum login (token null), kembalikan null → request jalan sebagai anon.
  /// - Jika sudah login, JWT siswa disertakan sebagai Authorization header otomatis
  ///   di SEMUA request (from, rpc, storage, functions) tanpa perlu kode tambahan.
  ///
  /// Keunggulan untuk persistent session:
  /// - Token dibaca fresh dari SecureStorage setiap request → jika token diperbarui,
  ///   semua request langsung pakai token baru tanpa perlu restart app.
  /// - Tidak perlu re-initialize Supabase setelah login.
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      publishableKey: supabaseAnonKey,
      accessToken: () async {
        // Baca token siswa dari SecureStorage saat diperlukan
        final token = await _tokenStorage.read(key: _kStudentJwtKey);
        return token; // null jika belum login → fallback ke anon key
      },
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}
