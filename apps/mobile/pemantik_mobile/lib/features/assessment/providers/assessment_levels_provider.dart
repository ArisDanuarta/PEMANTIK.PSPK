import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/database/database.dart';

class LevelInfo {
  final LocalLevel level;
  final bool isUnlocked;
  final bool isPassed;
  final int highestScore;
  final int totalQuestions;

  LevelInfo({
    required this.level,
    required this.isUnlocked,
    required this.isPassed,
    required this.highestScore,
    required this.totalQuestions,
  });
}

final assessmentLevelsProvider = StreamProvider.family<List<LevelInfo>, String>(
  (ref, categoryId) async* {
    final db = ref.read(databaseProvider);

    // Dengarkan perubahan pada tabel localLevels
    final levelsStream = db.levelDao.watchLevelsByCategory(categoryId);

    await for (final levels in levelsStream) {
      if (levels.isEmpty) {
        yield [];
        continue;
      }

      final studentStr = await secureStorage.read(
        key: 'student_data',
      );
      if (studentStr == null) throw Exception('Siswa belum login');
      final student = jsonDecode(studentStr);
      final studentId = student['id'] as String;

      final result = <LevelInfo>[];
      bool nextLevelUnlocked =
          true; // Level 1 (or first level in sorted list) always unlocked

      for (final level in levels) {
        // Cari skor tertinggi dari local_answers
        final highestCorrectAnswers = await db.sessionDao
            .getHighestCorrectAnswersForLevel(studentId, level.id);
        final isPassed = highestCorrectAnswers >= level.passingThreshold;

        // Cari jumlah total soal untuk level ini
        final questions = await db.questionDao.getQuestionsForLevel(level.id);

        result.add(
          LevelInfo(
            level: level,
            isUnlocked: nextLevelUnlocked,
            isPassed: isPassed,
            highestScore: highestCorrectAnswers,
            totalQuestions: questions.length,
          ),
        );

        // Level berikutnya hanya terbuka jika level saat ini LULUS
        nextLevelUnlocked = isPassed;
      }

      yield result;
    }
  },
);
