import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/database/database.dart';
import '../../../core/sync/sync_service.dart';
import 'package:drift/drift.dart' hide JsonKey;

class LevelInfo {
  final LocalLevel level;
  final bool isUnlocked;
  final bool isPassed;
  final bool isFailed;
  final int highestScore;
  final int totalQuestions;
  final bool isForcedExit;

  LevelInfo({
    required this.level,
    required this.isUnlocked,
    required this.isPassed,
    required this.isFailed,
    required this.highestScore,
    required this.totalQuestions,
    required this.isForcedExit,
  });
}

final studentCompletedSessionsStreamProvider =
    StreamProvider<List<LocalSession>>((ref) async* {
      final db = ref.read(databaseProvider);
      final studentStr = await secureStorage.read(key: 'student_data');
      if (studentStr == null) {
        yield [];
        return;
      }
      final student = jsonDecode(studentStr);
      final studentId = student['id'] as String;
      yield* db.sessionDao.watchCompletedSessionsForStudent(studentId);
    });

final assessmentLevelsProvider = StreamProvider.family<List<LevelInfo>, String>((
  ref,
  categoryId,
) async* {
  // Pantau perubahan pada sesi yang selesai agar UI otomatis merefresh status unlock/pass saat ujian selesai
  ref.watch(studentCompletedSessionsStreamProvider);

  final db = ref.read(databaseProvider);

  // Dengarkan perubahan pada tabel localLevels
  final levelsStream = db.levelDao.watchLevelsByCategory(categoryId);

  await for (final levels in levelsStream) {
    if (levels.isEmpty) {
      yield [];
      continue;
    }

    final studentStr = await secureStorage.read(key: 'student_data');
    if (studentStr == null) throw Exception('Anak belum login');
    final student = jsonDecode(studentStr);
    final studentId = student['id'] as String;

    final category = await db.categoryDao.getCategoryById(categoryId);
    final String currentPhase = category?.phase ?? 'Tahap 1';

    final result = <LevelInfo>[];
    bool nextLevelUnlocked =
        true; // Level 1 (or first level in sorted list) always unlocked

    // ✅ FIX #7: Jika lokal tidak punya sesi sama sekali untuk student ini,
    //    kemungkinan besar user baru install ulang / ganti device.
    //    Tarik data dari Supabase terlebih dahulu agar progres tidak hilang.
    //    Ini hanya dijalankan sekali saat levels list pertama kali dimuat.
    final allLocalSessions = await (db.select(db.localSessions)
          ..where((t) => t.studentId.equals(studentId)))
        .get();
    if (allLocalSessions.isEmpty) {
      try {
        // Gunakan syncServiceProvider untuk pull data dari Supabase
        // Catatan: ref.read di dalam async* generator aman karena ini bukan build()
        await ref.read(syncServiceProvider).syncPastSessions();
        // Setelah sync, levelsStream akan emit data baru otomatis,
        // sehingga loop for-await akan menerima data terbaru.
      } catch (syncErr) {
        // Jika gagal sync (offline/error), lanjut dengan data lokal yang ada (kosong)
      }
    }

    for (final level in levels) {
      // Cari skor tertinggi dari local_answers
      final highestCorrectAnswers = await db.sessionDao
          .getHighestCorrectAnswersForLevel(studentId, level.id, currentPhase);
      final isPassed = highestCorrectAnswers >= level.passingThreshold;

      // Cari jumlah sesi yang selesai
      final attemptsCount = await db.sessionDao
          .getCompletedSessionsCountForLevel(studentId, level.id, currentPhase);
      final isFailed = attemptsCount > 0 && !isPassed;

      // Cari jumlah total soal untuk level ini
      final questions = await db.questionDao.getQuestionsForLevel(level.id);

      // Cek apakah sesi terakhir merupakan forced exit (timeSpentSec == -1)
      bool isForcedExit = false;
      if (isFailed) {
        final latestSession = await (db.select(db.localSessions)
              ..where((t) =>
                  t.studentId.equals(studentId) &
                  (t.levelId.equals(level.id) | t.currentLevelId.equals(level.id)) &
                  t.phase.equals(currentPhase) &
                  t.status.equals('completed'))
              ..orderBy([
                (t) => OrderingTerm(expression: t.completedAt, mode: OrderingMode.desc)
              ])
              ..limit(1))
            .getSingleOrNull();
        if (latestSession != null && latestSession.timeSpentSec == -1) {
          isForcedExit = true;
        }
      }

      result.add(
        LevelInfo(
          level: level,
          isUnlocked:
              nextLevelUnlocked &&
              !isFailed, // Jika gagal, anggap terkunci agar tidak bisa di-tap
          isPassed: isPassed,
          isFailed: isFailed,
          highestScore: highestCorrectAnswers,
          totalQuestions: questions.length,
          isForcedExit: isForcedExit,
        ),
      );

      // Level berikutnya hanya terbuka jika level saat ini LULUS
      nextLevelUnlocked = isPassed;
    }

    yield result;
  }
});
