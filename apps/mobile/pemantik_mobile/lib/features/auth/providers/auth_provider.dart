import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import '../../../core/storage/secure_storage.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/sync/sync_service.dart';
import '../../../core/database/database.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../assessment/providers/assessment_history_provider.dart';
import '../../assessment/providers/assessment_levels_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_provider.g.dart';

class AuthState {
  final bool isLoading;
  final String? error;
  final bool isAuthenticated;

  AuthState({this.isLoading = false, this.error, this.isAuthenticated = false});
}

@Riverpod(keepAlive: true)
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
  Future<bool> checkInitialAuth() async {
    try {
      final token = await _storage.read(key: SupabaseConfig.studentJwtKey);
      final studentData = await _storage.read(key: 'student_data');

      if (!_mounted) return false;

      if (token != null && studentData != null) {
        log('=== [Auth] Session ditemukan, siswa sudah login ===');
        state = AuthState(isAuthenticated: true);
        ref.read(syncServiceProvider).uploadCompletedSessions();
        return true;
      }
    } catch (e) {
      log('=== [Auth] ERROR checkInitialAuth: $e ===');
    }
    return false;
  }

  /// Login siswa dengan username dan PIN.
  Future<void> login(String username, String pin) async {
    if (!_mounted) return;
    state = AuthState(isLoading: true);

    try {
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

        final token = data['token'];
        final student = data['student'];

        if (token == null || student == null) {
          state = AuthState(
            error: 'Respons server tidak valid. Hubungi administrator.',
          );
          return;
        }

        await _storage.write(
          key: SupabaseConfig.studentJwtKey,
          value: token.toString(),
        );

        final studentMap = Map<String, dynamic>.from(student as Map);
        await _storage.write(key: 'student_data', value: jsonEncode(studentMap));

        final parts = token.toString().split('.');
        if (parts.length == 3) {
          log('=== [Auth] Login berhasil. Token format JWT valid (3 parts) ===');
        } else {
          log('=== [Auth] PERINGATAN: Token bukan format JWT valid! Parts: ${parts.length} ===');
        }

        if (!_mounted) return;

        // PENTING: dorong data langsung ke CurrentStudent notifier (realtime),
        // ganti invalidate() supaya widget yang sudah aktif langsung ter-update
        // tanpa nunggu refetch dari storage.
        ref.read(currentStudentProvider.notifier).setData(studentMap);

        // Provider lain masih aman pakai invalidate karena memang harus
        // full refetch data siswa yang baru login (bukan sekadar push data).
        ref.invalidate(availableAssessmentsProvider);
        ref.invalidate(studentHistoryProvider);
        ref.invalidate(studentCompletedSessionsStreamProvider);
        ref.invalidate(assessmentLevelsProvider);

        state = AuthState(isAuthenticated: true);
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

      String errorMsg = 'Terjadi kesalahan jaringan. Pastikan perangkat terhubung internet.';

      if (e.toString().contains('FunctionException') || e.toString().contains('error')) {
        try {
          final errorStr = e.toString();
          if (errorStr.contains('Nama pengguna tidak ditemukan') || errorStr.contains('tidak aktif')) {
            errorMsg = 'Username tidak terdaftar atau akun dinonaktifkan.';
          } else if (errorStr.contains('PIN yang dimasukkan salah')) {
            errorMsg = 'PIN salah. Silakan coba lagi.';
          } else if (errorStr.contains('Username dan PIN wajib diisi')) {
            errorMsg = 'Mohon lengkapi username dan PIN.';
          } else {
            errorMsg = 'Login ditolak oleh server. Periksa kembali data Anda.';
          }
        } catch (_) {}
      }

      state = AuthState(error: errorMsg);
    }
  }

  /// Mengubah data profil siswa via Edge Function (bypass RLS), lalu
  /// langsung dorong hasilnya ke CurrentStudent notifier (realtime update UI).
  Future<bool> updateStudentProfile(Map<String, dynamic> newData) async {
    state = AuthState(isLoading: true);
    try {
      final studentStr = await _storage.read(key: 'student_data');
      if (studentStr == null) throw Exception('Data siswa lokal tidak ditemukan');

      final Map<String, dynamic> currentStudent = jsonDecode(studentStr);
      final studentId = currentStudent['id'] as String?;

      if (studentId == null) throw Exception('ID Siswa tidak ditemukan');

      final jwt = await _storage.read(key: SupabaseConfig.studentJwtKey);
      if (jwt == null) throw Exception('JWT tidak ditemukan, silakan login ulang');

      final response = await SupabaseConfig.client.functions.invoke(
        'refresh-student-profile',
        headers: {'Authorization': 'Bearer $jwt'},
        body: newData,
      );

      Map<String, dynamic> updated;

      if (response.status == 200 && response.data?['student'] != null) {
        // Data terbaru dari server (sudah termasuk relasi father_occupation dll)
        final freshStudent = Map<String, dynamic>.from(response.data['student'] as Map);
        updated = {...currentStudent, ...freshStudent};
        await _storage.write(key: 'student_data', value: jsonEncode(updated));
        log('[Auth] Profil diperbarui & cache disinkron dari server ✓');
      } else {
        // Fallback: simpan lokal saja jika edge function gagal.
        // Reset relasi nested karena id-nya berubah tapi nama nested-nya belum ke-refresh.
        updated = {
          ...currentStudent,
          ...newData,
          'father_occupation': null,
          'mother_occupation': null,
          'father_education': null,
          'mother_education': null,
        };
        await _storage.write(key: 'student_data', value: jsonEncode(updated));
        log('[Auth] Profil disimpan lokal (fallback). Status: ${response.status}');
      }

      if (!_mounted) return true;

      // INI KUNCI FIX-NYA: push langsung ke state notifier, bukan invalidate.
      // ProfilePage yang watch currentStudentProvider akan langsung rebuild
      // dengan data baru, walaupun sedang tidak aktif di navigation stack.
      ref.read(currentStudentProvider.notifier).setData(updated);

      if (_mounted) {
        state = AuthState(isAuthenticated: true);
      }
      return true;
    } catch (e) {
      log('=== [Auth] ERROR UPDATE PROFILE: $e ===');
      if (_mounted) {
        state = AuthState(error: 'Gagal memperbarui profil: $e');
      }
      return false;
    }
  }

  /// Logout: hapus semua data sesi dari SecureStorage.
  Future<void> logout() async {
    try {
      await _storage.deleteAll();

      final db = ref.read(databaseProvider);
      await db.clearAllData();

      // Kosongkan state notifier secara langsung (realtime), plus invalidate
      // provider lain yang memang harus full reset ke kondisi awal.
      ref.read(currentStudentProvider.notifier).clear();
      ref.invalidate(availableAssessmentsProvider);
      ref.invalidate(studentHistoryProvider);
      ref.invalidate(studentCompletedSessionsStreamProvider);
      ref.invalidate(assessmentLevelsProvider);

      log('=== [Auth] Logout berhasil. Semua data sesi & database dihapus. ===');
    } catch (e) {
      log('=== [Auth] ERROR LOGOUT: $e ===');
    } finally {
      if (_mounted) {
        state = AuthState(isAuthenticated: false);
      }
    }
  }
}