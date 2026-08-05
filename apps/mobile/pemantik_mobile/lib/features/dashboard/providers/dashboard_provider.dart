import 'dart:convert';
import 'dart:developer';
import 'package:flutter/foundation.dart';
import '../../../core/sync/media_download_service.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/database/database.dart';
import '../../../core/sync/sync_service.dart';

part 'dashboard_provider.g.dart';

/// Provider untuk data profil siswa yang sedang login.
///
/// PENTING: ini sengaja dibuat sebagai Notifier (bukan function provider biasa)
/// supaya state-nya bisa di-update LANGSUNG dari luar (misal setelah edit
/// profil berhasil), tanpa harus invalidate() + menunggu refetch dari storage.
/// Dengan invalidate() biasa, widget yang sedang tidak "aktif" di navigation
/// stack (misal ProfilePage yang tertutup EditProfilePage) kadang tidak
/// langsung ter-render ulang sampai ada trigger rebuild lain (contoh: logout
/// lalu login lagi). Dengan setData() di bawah, perubahan langsung
/// ter-broadcast ke semua widget yang ref.watch(currentStudentProvider).
@Riverpod(keepAlive: true)
class CurrentStudent extends _$CurrentStudent {
  @override
  Future<Map<String, dynamic>?> build() async {
    final storage = secureStorage;
    final dataStr = await storage.read(key: 'student_data');
    if (dataStr == null) return null;
    return Map<String, dynamic>.from(jsonDecode(dataStr));
  }

  void setData(Map<String, dynamic> data) {
    debugPrint('=== [CurrentStudent] setData dipanggil: ${data['full_name']} ===');
    state = AsyncData(data);
  }

  void clear() {
    state = const AsyncData(null);
  }

  Future<void> reloadFromStorage() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final storage = secureStorage;
      final dataStr = await storage.read(key: 'student_data');
      if (dataStr == null) return null;
      return Map<String, dynamic>.from(jsonDecode(dataStr));
    });
  }
}

class AssessmentCategory {
  final String id;
  final String name;
  final String subjectArea;
  final String phase;
  final DateTime? validFrom;
  final DateTime? validUntil;
  final int totalLevels;

  AssessmentCategory({
    required this.id,
    required this.name,
    required this.subjectArea,
    required this.phase,
    this.validFrom,
    this.validUntil,
    this.totalLevels = 0,
  });

  factory AssessmentCategory.fromLocal(LocalCategory local, {int totalLevels = 0}) {
    return AssessmentCategory(
      id: local.id,
      name: local.name,
      subjectArea: local.subjectArea,
      phase: local.phase,
      validFrom: local.validFrom,
      validUntil: local.validUntil,
      totalLevels: totalLevels,
    );
  }

  bool get isExpired {
    if (validUntil == null) return false;
    // Expired jika batas valid_until sudah lewat dari hari ini
    return DateTime.now().isAfter(validUntil!);
  }

  bool get isComingSoon {
    if (validFrom == null) return false;
    // Belum mulai jika valid_from masih di masa depan
    return DateTime.now().isBefore(validFrom!);
  }

  bool get isActive {
    return !isExpired && !isComingSoon;
  }
}

class PackageProgress {
  final String categoryId;
  final String categoryName;
  final String subjectArea;
  final int completed;
  final int total;

  PackageProgress({
    required this.categoryId,
    required this.categoryName,
    required this.subjectArea,
    required this.completed,
    required this.total,
  });
}

// Kembalikan data Aktif, Riwayat, dan Progres
class DashboardData {
  final Map<String, List<AssessmentCategory>> activeByPhase;
  final Map<String, List<AssessmentCategory>> historyByPhase;
  final List<PackageProgress> learningProgress;

  DashboardData({
    required this.activeByPhase,
    required this.historyByPhase,
    required this.learningProgress,
  });
}

@riverpod
Future<DashboardData> availableAssessments(Ref ref) async {
  // Jalankan sinkronisasi secara background tanpa memblokir UI
  final syncService = ref.read(syncServiceProvider);
  syncService
      .syncCategoriesAndQuestions()
      .then((_) => syncService.syncPastSessions())
      .then((_) {
        // Mulai download aset media setelah soal selesai tersinkronisasi
        ref.read(mediaDownloadServiceProvider.notifier).downloadAllMedia();
      })
      .catchError((e) { log('Sync error: $e'); });

  // Langsung ambil data yang ada di database lokal agar cepat
  final db = ref.read(databaseProvider);
  final locals = await db.categoryDao.getAllCategories();
  final allCategories = <AssessmentCategory>[];
  for (final local in locals) {
    final levels = await db.levelDao.getLevelsByCategory(local.id);
    allCategories.add(AssessmentCategory.fromLocal(local, totalLevels: levels.length));
  }

  final activeByPhase = <String, List<AssessmentCategory>>{};
  final historyByPhase = <String, List<AssessmentCategory>>{};
  final learningProgress = <PackageProgress>[];

  // Get current student ID
  final student = await ref.watch(currentStudentProvider.future);
  final studentId = student?['id'] as String?;

  for (final cat in allCategories) {
    if (cat.isExpired) {
      historyByPhase.putIfAbsent(cat.phase, () => []).add(cat);
    } else {
      activeByPhase.putIfAbsent(cat.phase, () => []).add(cat);

      // Hitung progress untuk kategori aktif ini jika studentId ada dan belum masa tenggang awal
      if (studentId != null && !cat.isComingSoon) {
        final levels = await db.levelDao.getLevelsByCategory(cat.id);
        int completedLevels = 0;

        for (final level in levels) {
          final count = await db.sessionDao.getCompletedSessionsCountForLevel(
            studentId,
            level.id,
            cat.phase,
          );
          if (count > 0) completedLevels++;
        }

        learningProgress.add(PackageProgress(
          categoryId: cat.id,
          categoryName: cat.name,
          subjectArea: cat.subjectArea,
          completed: completedLevels,
          total: levels.length,
        ));
      }
    }
  }

  return DashboardData(
    activeByPhase: activeByPhase,
    historyByPhase: historyByPhase,
    learningProgress: learningProgress,
  );
}