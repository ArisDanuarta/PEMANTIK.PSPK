import 'dart:convert';
import 'dart:developer';
import '../../../core/sync/media_download_service.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/database/database.dart';
import '../../../core/sync/sync_service.dart';

part 'dashboard_provider.g.dart';

@riverpod
Future<Map<String, dynamic>?> currentStudent(Ref ref) async {
  final storage = secureStorage;
  final dataStr = await storage.read(key: 'student_data');
  if (dataStr != null) {
    return jsonDecode(dataStr);
  }
  return null;
}

class AssessmentCategory {
  final String id;
  final String name;
  final String subjectArea;
  final String phase;
  final DateTime? validFrom;
  final DateTime? validUntil;

  AssessmentCategory({
    required this.id,
    required this.name,
    required this.subjectArea,
    required this.phase,
    this.validFrom,
    this.validUntil,
  });

  factory AssessmentCategory.fromLocal(LocalCategory local) {
    return AssessmentCategory(
      id: local.id,
      name: local.name,
      subjectArea: local.subjectArea,
      phase: local.phase,
      validFrom: local.validFrom,
      validUntil: local.validUntil,
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

// Kembalikan dua list: Aktif dan Riwayat
class DashboardData {
  final Map<String, List<AssessmentCategory>> activeByPhase;
  final Map<String, List<AssessmentCategory>> historyByPhase;

  DashboardData({required this.activeByPhase, required this.historyByPhase});
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
  final allCategories = locals
      .map((l) => AssessmentCategory.fromLocal(l))
      .toList();

  final activeByPhase = <String, List<AssessmentCategory>>{};
  final historyByPhase = <String, List<AssessmentCategory>>{};

  for (final cat in allCategories) {
    // Kita anggap expired/riwayat adalah ujian yang sudah tidak valid
    if (cat.isExpired) {
      historyByPhase.putIfAbsent(cat.phase, () => []).add(cat);
    } else {
      activeByPhase.putIfAbsent(cat.phase, () => []).add(cat);
    }
  }

  return DashboardData(
    activeByPhase: activeByPhase,
    historyByPhase: historyByPhase,
  );
}
