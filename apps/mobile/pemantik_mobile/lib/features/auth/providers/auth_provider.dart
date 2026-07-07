import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import '../../../core/storage/secure_storage.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/sync/sync_service.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_provider.g.dart';

class AuthState {
  final bool isLoading;
  final String? error;
  final bool isAuthenticated;

  AuthState({
    this.isLoading = false,
    this.error,
    this.isAuthenticated = false,
  });
}

@riverpod
class Auth extends _$Auth {
  final _storage = secureStorage;
  bool _mounted = true;

  @override
  AuthState build() {
    _mounted = true;
    ref.onDispose(() {
      _mounted = false;
    });

    // Pengecekan token awal dilakukan di SplashScreen via checkInitialAuth(),
    // bukan di sini, untuk menghindari race condition dengan router.
    return AuthState();
  }

  /// Cek apakah siswa sudah login sebelumnya (dipanggil dari SplashPage).
  ///
  /// Validasi yang dilakukan:
  /// 1. Baca 'student_jwt' dari SecureStorage
  /// 2. Baca 'student_data' (data profil siswa) dari SecureStorage
  /// 3. Kedua data harus ada agar dianggap valid
  ///
  /// JWT diverifikasi tidak perlu decode di Flutter — RLS Supabase yang akan
  /// memvalidasi signature-nya saat request pertama.
  Future<bool> checkInitialAuth() async {
    try {
      // Gunakan kunci yang sama dengan yang dipakai saat login
      final token = await _storage.read(key: SupabaseConfig.studentJwtKey);
      final studentData = await _storage.read(key: 'student_data');

      if (!_mounted) return false;

      if (token != null && studentData != null) {
        // Kedua data ada → siswa dianggap sudah login
        // Token sudah otomatis dipakai oleh accessToken callback di SupabaseConfig
        log('=== [Auth] Session ditemukan, siswa sudah login ===');
        state = AuthState(isAuthenticated: true);
        // Memicu sync background untuk memastikan data offline langsung terupload saat app dibuka online
        ref.read(syncServiceProvider).uploadCompletedSessions();
        return true;
      }
    } catch (e) {
      log('=== [Auth] ERROR checkInitialAuth: $e ===');
    }
    return false;
  }

  /// Login siswa dengan username dan PIN.
  ///
  /// Flow:
  /// 1. Panggil Edge Function 'authenticate-student'
  /// 2. Edge Function return JWT valid (HS256) + data siswa
  /// 3. Simpan JWT ke SecureStorage dengan kunci 'student_jwt'
  ///    (kunci ini sudah dikonfigurasi sebagai accessToken callback di Supabase)
  /// 4. Simpan data profil siswa ke 'student_data'
  /// 5. Semua request Supabase selanjutnya otomatis pakai JWT ini
  Future<void> login(String username, String pin) async {
    if (!_mounted) return;
    state = AuthState(isLoading: true);

    try {
      // Panggil Edge Function dengan timeout 20 detik (cold start bisa lama)
      final response = await SupabaseConfig.client.functions
          .invoke(
            'authenticate-student',
            body: {'username': username, 'pin': pin},
          )
          .timeout(
            const Duration(seconds: 20),
            onTimeout: () {
              throw TimeoutException(
                'Koneksi timeout. Coba lagi beberapa saat.',
              );
            },
          );

      if (!_mounted) return;

      if (response.status == 200) {
        final data = response.data;

        // Validasi format response sebelum disimpan
        final token = data['token'];
        final student = data['student'];

        if (token == null || student == null) {
          state = AuthState(
            error: 'Respons server tidak valid. Hubungi administrator.',
          );
          return;
        }

        // ── SIMPAN TOKEN JWT VALID KE SECURE STORAGE ──────────────────────
        // Kunci 'student_jwt' = kunci yang dipakai accessToken callback
        // di SupabaseConfig.initialize() → otomatis dipakai semua request
        await _storage.write(
          key: SupabaseConfig.studentJwtKey, // = 'student_jwt'
          value: token.toString(),
        );

        // Simpan data profil siswa untuk kebutuhan UI & offline
        await _storage.write(
          key: 'student_data',
          value: jsonEncode(student),
        );

        // Log untuk debugging — cek format JWT (harus 3 bagian dipisah titik)
        final parts = token.toString().split('.');
        if (parts.length == 3) {
          log('=== [Auth] Login berhasil. Token format JWT valid (3 parts) ===');
        } else {
          log('=== [Auth] PERINGATAN: Token bukan format JWT valid! Parts: ${parts.length} ===');
        }

        if (!_mounted) return;
        state = AuthState(isAuthenticated: true);
        // Memicu sinkronisasi background untuk mengupload sesi offline milik siswa yang baru login
        ref.read(syncServiceProvider).uploadCompletedSessions();
      } else {
        final errorMsg =
            response.data?['error'] ?? 'Login gagal. Periksa username dan PIN.';
        if (!_mounted) return;
        state = AuthState(error: errorMsg);
      }
    } on TimeoutException catch (e) {
      if (!_mounted) return;
      log('=== [Auth] TIMEOUT LOGIN: $e ===');
      state = AuthState(
        error: 'Koneksi timeout. Pastikan internet stabil lalu coba lagi.',
      );
    } catch (e) {
      if (!_mounted) return;
      log('=== [Auth] ERROR LOGIN: $e ===');
      state = AuthState(
        error: 'Terjadi kesalahan jaringan. Pastikan perangkat terhubung internet.',
      );
    }
  }

  /// Logout: hapus semua data sesi dari SecureStorage.
  ///
  /// Setelah ini dipanggil, accessToken callback akan return null,
  /// sehingga request Supabase kembali ke mode anon.
  Future<void> logout() async {
    try {
      await _storage.deleteAll();
      log('=== [Auth] Logout berhasil. Semua data sesi dihapus. ===');
    } catch (e) {
      log('=== [Auth] ERROR LOGOUT: $e ===');
    } finally {
      if (_mounted) {
        state = AuthState(isAuthenticated: false);
      }
    }
  }
}