import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/database/database.dart';
import 'assessment_levels_provider.dart';

class StudentAssessmentHistoryItem {
  final String sessionId;
  final String categoryName;
  final String subjectArea;
  final String phase;
  final DateTime? completedAt;
  final int correctAnswers;
  final int totalQuestions;
  final int? timeSpentSec;
  final String? levelName;
  final String syncStatus;

  StudentAssessmentHistoryItem({
    required this.sessionId,
    required this.categoryName,
    required this.subjectArea,
    required this.phase,
    this.completedAt,
    required this.correctAnswers,
    required this.totalQuestions,
    this.timeSpentSec,
    this.levelName,
    required this.syncStatus,
  });

  String get formattedScore {
    if (totalQuestions <= 0) return '0 / 0';
    return '$correctAnswers / $totalQuestions';
  }

  int get scorePercentage {
    if (totalQuestions <= 0) return 0;
    return ((correctAnswers / totalQuestions) * 100).round();
  }

  String get formattedTimeSpent {
    if (timeSpentSec == null || timeSpentSec! <= 0) return 'Tidak tercatat';
    final minutes = timeSpentSec! ~/ 60;
    final seconds = timeSpentSec! % 60;
    if (minutes > 0) {
      return '$minutes menit $seconds detik';
    }
    return '$seconds detik';
  }
}

final studentHistoryProvider =
    FutureProvider<Map<String, List<StudentAssessmentHistoryItem>>>((
      ref,
    ) async {
      // Pantau perubahan pada sesi selesai agar riwayat otomatis merefresh
      ref.watch(studentCompletedSessionsStreamProvider);

      final storage = secureStorage;
      final studentStr = await storage.read(key: 'student_data');
      if (studentStr == null) return {};

      final student = jsonDecode(studentStr);
      final String? studentId = student['id'] as String?;
      if (studentId == null) return {};

      final db = ref.read(databaseProvider);
      final completedSessions = await db.sessionDao
          .getCompletedSessionsForStudent(studentId);

      final Map<String, List<StudentAssessmentHistoryItem>> groupedHistory = {};

      for (final session in completedSessions) {
        final category = await db.categoryDao.getCategoryById(
          session.categoryId,
        );
        final categoryName = category?.name ?? 'Asesmen';
        final subjectArea = category?.subjectArea ?? 'Umum';
        final phase = session.phase;

        final levelId = session.currentLevelId ?? session.levelId;
        final level =
            levelId != null ? await db.levelDao.getLevelById(levelId) : null;
        final levelName =
            level != null ? 'Level ${level.levelNumber}' : null;

        final answers = await db.answerDao.getAnswersForSession(session.id);
        final correctCount = answers.where((a) => a.isCorrect == true).length;
        final totalQ =
            answers.isNotEmpty ? answers.length : session.currentQuestionIndex;

        int? timeSpent = session.timeSpentSec;
        if ((timeSpent == null || timeSpent == 0) &&
            session.startedAt != null &&
            session.completedAt != null) {
          timeSpent = session.completedAt!
              .difference(session.startedAt!)
              .inSeconds;
        }

        final item = StudentAssessmentHistoryItem(
          sessionId: session.id,
          categoryName: categoryName,
          subjectArea: subjectArea,
          phase: phase,
          completedAt: session.completedAt ?? session.startedAt,
          correctAnswers: correctCount,
          totalQuestions: totalQ,
          timeSpentSec: timeSpent,
          levelName: levelName,
          syncStatus: session.syncStatus,
        );

        groupedHistory.putIfAbsent(phase, () => []).add(item);
      }

      return groupedHistory;
    });
