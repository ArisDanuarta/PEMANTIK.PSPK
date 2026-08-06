import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/storage/secure_storage.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'core/theme/app_theme.dart';
import 'core/supabase/supabase_client.dart';
import 'core/router/app_router.dart';
import 'core/sync/sync_service.dart';
import 'core/update/update_service.dart';

import 'package:permission_handler/permission_handler.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseConfig.initialize();
  runApp(const ProviderScope(child: PemantikApp()));
}

class PemantikApp extends ConsumerStatefulWidget {
  const PemantikApp({super.key});

  @override
  ConsumerState<PemantikApp> createState() => _PemantikAppState();
}

class _PemantikAppState extends ConsumerState<PemantikApp> {
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  List<ConnectivityResult> _lastStatus = [ConnectivityResult.none];

  // FIX 1: Flag - hanya izinkan sync setelah user sudah terautentikasi.
  // Sync sebelum login menyebabkan hang karena tidak ada student_data
  // di secure storage, SyncService lalu query Supabase tanpa konteks
  // dan hang di sana sebelum LoginPage sempat tampil.
  bool _isAuthenticated = false;

  @override
  void initState() {
    super.initState();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((result) {
      final wasOffline =
          _lastStatus.every((r) => r == ConnectivityResult.none);
      final isNowOnline = result.any((r) => r != ConnectivityResult.none);

      // FIX 2: Guard - hanya sync kalau sudah login
      if (wasOffline && isNowOnline && _isAuthenticated) {
        // ✅ FIX #8: Saat kembali online, jalankan FULL sync:
        //    - uploadCompletedSessions: kirim jawaban pending ke server
        //    - syncCategoriesAndQuestions: tarik soal/akses terbaru dari admin
        //    Sebelumnya hanya upload, sehingga perubahan soal dari admin
        //    tidak diterima sampai app di-restart.
        final sync = ref.read(syncServiceProvider);
        sync.uploadCompletedSessions();
        sync.syncCategoriesAndQuestions();
      }
      _lastStatus = result;
    });
  }

  // Dipanggil oleh _AppEntry setelah auth check selesai
  void _setAuthenticated(bool value) {
    _isAuthenticated = value;
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pemantik Asesmen',
      theme: AppTheme.lightTheme,
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return Container(
          color: const Color(0xFFF1F3F5),
          alignment: Alignment.center,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: ClipRect(
              child: child ?? const SizedBox.shrink(),
            ),
          ),
        );
      },
      // FIX 3: Ganti initialRoute + onGenerateRoute dengan home + onGenerateRoute.
      // initialRoute bukan '/' dengan onGenerateRoute menyebabkan Flutter push
      // '/' dulu (tidak ada di router) → blank white screen.
      home: _AppEntry(onAuthResolved: _setAuthenticated),
      onGenerateRoute: AppRouter.generateRoute,
    );
  }
}

class _AppEntry extends ConsumerStatefulWidget {
  final void Function(bool isAuthenticated) onAuthResolved;

  const _AppEntry({required this.onAuthResolved});

  @override
  ConsumerState<_AppEntry> createState() => _AppEntryState();
}

class _AppEntryState extends ConsumerState<_AppEntry> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    // 0. Minta semua izin yang diperlukan aplikasi di awal agar dialog izin
    // sistem operasi tidak memicu anti-cheat (AppLifecycleState.inactive) saat ujian.
    try {
      await [
        Permission.microphone,
        Permission.speech,
      ].request();
    } catch (e) {
      debugPrint('Permission request error: $e');
    }

    // 1. Cek pembaruan aplikasi
    final updateService = ref.read(updateServiceProvider);
    final update = await updateService.checkForUpdates();
    if (update != null) {
      if (!mounted) return;
      await updateService.showUpdateDialog(context, update);
      // Jika pembaruan diwajibkan, hentikan inisialisasi agar pengguna tidak bisa melewati layar loading
      if (update.isMandatory) return;
    }

    // 2. Jika aman, lanjut cek auth
    String? token;
    String? hasSeenOnboarding;

    try {
      // FIX: Tambahkan timeout agar jika platform channel Android nge-hang
      // (karena bug keystore/migration FlutterSecureStorage), aplikasi tidak ikut hang
      // selamanya di layar loading.
      token = await secureStorage.read(key: 'auth_token').timeout(const Duration(seconds: 2));
      hasSeenOnboarding = await secureStorage.read(key: 'has_seen_onboarding').timeout(const Duration(seconds: 1));
    } catch (e) {
      debugPrint('Error reading secure storage: $e');
      try {
        await secureStorage.deleteAll().timeout(const Duration(seconds: 1));
      } catch (_) {}
      token = null;
    }

    if (!mounted) return;

    if (token != null) {
      // Ada sesi aktif → beritahu parent sync boleh jalan, lalu ke Home
      widget.onAuthResolved(true);
      Navigator.of(context).pushReplacementNamed(AppRouter.home);
    } else {
      // Belum login → sync tidak boleh jalan
      widget.onAuthResolved(false);
      
      // Jika belum pernah melihat onboarding, arahkan ke onboarding.
      if (hasSeenOnboarding != 'true') {
        Navigator.of(context).pushReplacementNamed(AppRouter.onboarding);
      } else {
        Navigator.of(context).pushReplacementNamed(AppRouter.login);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Loading spinner sementara cek token di secure storage
    return const Scaffold(
      backgroundColor: Color(0xFFF5F5F5),
      body: Center(
        child: CircularProgressIndicator(
          color: Color(0xFFFFD700),
        ),
      ),
    );
  }
}