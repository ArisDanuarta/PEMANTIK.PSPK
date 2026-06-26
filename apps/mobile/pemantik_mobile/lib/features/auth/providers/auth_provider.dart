import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import '../../../core/storage/secure_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/supabase/supabase_client.dart';

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

    // FIX 1: Jangan panggil _checkInitialAuth() di sini.
    // Pengecekan token awal sebaiknya dilakukan di SplashScreen atau
    // router guard, bukan di provider login. Ini mencegah race condition
    // di mana listener di LoginPage langsung navigasi ke /home saat
    // provider pertama kali dibuat.
    //
    // Kalau kamu butuh auto-login, panggil checkInitialAuth() secara
    // eksplisit dari widget yang tepat (misal SplashPage), bukan di build().

    return AuthState();
  }

  // FIX 2: Jadikan public agar bisa dipanggil dari SplashPage/RouterGuard
  // Contoh penggunaan di SplashPage:
  //   final isAuth = await ref.read(authProvider.notifier).checkInitialAuth();
  //   if (isAuth) Navigator.pushReplacementNamed(context, '/home');
  //   else Navigator.pushReplacementNamed(context, '/login');
  Future<bool> checkInitialAuth() async {
    try {
      final token = await _storage.read(key: 'auth_token');
      if (!_mounted) return false;
      if (token != null) {
        state = AuthState(isAuthenticated: true);
        return true;
      }
    } catch (e) {
      log('=== ERROR checkInitialAuth: $e ===');
    }
    return false;
  }

  Future<void> login(String username, String pin) async {
    if (!_mounted) return;
    state = AuthState(isLoading: true);

    try {
      // FIX 3: Tambahkan timeout 15 detik agar UI tidak hang selamanya
      // kalau Supabase Edge Function lambat atau cold start
      final response = await SupabaseConfig.client.functions
          .invoke(
            'authenticate-student',
            body: {'username': username, 'pin': pin},
          )
          .timeout(
            const Duration(seconds: 15),
            onTimeout: () {
              throw TimeoutException(
                'Koneksi timeout. Coba lagi beberapa saat.',
              );
            },
          );

      if (!_mounted) return;

      if (response.status == 200) {
        final data = response.data;

        // FIX 4: Validasi response data sebelum dipakai agar tidak crash
        // kalau format response dari server berubah
        final token = data['token'];
        final student = data['student'];

        if (token == null || student == null) {
          state = AuthState(
            error: 'Respons server tidak valid. Hubungi administrator.',
          );
          return;
        }

        await _storage.write(key: 'auth_token', value: token.toString());
        await _storage.write(
          key: 'student_data',
          value: jsonEncode(student),
        );

        if (!_mounted) return;
        state = AuthState(isAuthenticated: true);
      } else {
        // FIX 5: Handle kasus response.data null agar tidak crash
        final errorMsg = response.data?['error'] ?? 'Login gagal. Periksa username dan PIN.';
        if (!_mounted) return;
        state = AuthState(error: errorMsg);
      }
    } on TimeoutException catch (e) {
      if (!_mounted) return;
      log('=== TIMEOUT LOGIN: $e ===');
      state = AuthState(
        error: 'Koneksi timeout. Pastikan internet stabil lalu coba lagi.',
      );
    } catch (e) {
      if (!_mounted) return;
      log('=== ERROR LOGIN: $e ===');
      state = AuthState(
        error: 'Terjadi kesalahan jaringan. Pastikan perangkat terhubung internet.',
      );
    }
  }

  Future<void> logout() async {
    try {
      await _storage.deleteAll();
    } catch (e) {
      log('=== ERROR LOGOUT: $e ===');
    } finally {
      if (_mounted) {
        state = AuthState(isAuthenticated: false);
      }
    }
  }
}