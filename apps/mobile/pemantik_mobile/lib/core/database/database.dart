import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

import 'tables/local_categories.dart';
import 'tables/local_levels.dart';
import 'tables/local_questions.dart';
import 'tables/local_sessions.dart';
import 'tables/local_answers.dart';

import 'daos/category_dao.dart';
import 'daos/level_dao.dart';
import 'daos/question_dao.dart';
import 'daos/session_dao.dart';
import 'daos/answer_dao.dart';

part 'database.g.dart';

@DriftDatabase(
  tables: [
    LocalCategories,
    LocalLevels,
    LocalQuestions,
    LocalSessions,
    LocalAnswers,
  ],
  daos: [CategoryDao, LevelDao, QuestionDao, SessionDao, AnswerDao],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 13;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (Migrator m) async {
      await m.createAll();
    },
    onUpgrade: (m, from, to) async {
      if (from < 2) {
        await m.addColumn(localAnswers, localAnswers.questionVersion);
        await m.addColumn(localAnswers, localAnswers.failReason);
      }
      if (from < 3) {
        await m.addColumn(localQuestions, localQuestions.timeLimitSec);
      }
      if (from < 5) {
        await m.createTable(localCategories);
      }
      if (from < 6) {
        await m.deleteTable(localQuestions.actualTableName);
        await m.deleteTable(localSessions.actualTableName);
        await m.deleteTable(localAnswers.actualTableName);

        await m.createTable(localQuestions);
        await m.createTable(localSessions);
        await m.createTable(localAnswers);
      }
      if (from < 7) {
        await m.createTable(localLevels);
      }
      if (from < 8) {
        await m.deleteTable(localLevels.actualTableName);
        await m.createTable(localLevels);
      }
      if (from < 9) {
        await m.addColumn(localCategories, localCategories.validFrom);
      }
      if (from < 10) {
        // Minggu 2: tambah access_id dan current_level_id untuk tracking sesi
        await m.addColumn(localSessions, localSessions.accessId);
        await m.addColumn(localSessions, localSessions.currentLevelId);
      }
      if (from < 11) {
        // Minggu 2: tambah access_id ke local_categories untuk offline session creation
        await m.addColumn(localCategories, localCategories.accessId);
      }
      if (from < 12) {
        // Tambah field capaian belajar dan pesan kelulusan ke level
        await m.addColumn(localLevels, localLevels.learningObjective);
        await m.addColumn(localLevels, localLevels.successMessage);
        await m.addColumn(localLevels, localLevels.failureMessage);
      }
      if (from < 13) {
        // Tambah cheat_strikes ke local_sessions (kolom yang sebelumnya tidak di-migrate)
        // Gunakan try-catch karena mungkin beberapa device sudah punya kolom ini
        try {
          await m.addColumn(localSessions, localSessions.cheatStrikes);
        } catch (_) {
          // Kolom sudah ada di device ini, tidak perlu migrasi
        }
      }
    },
  );

  /// Menghapus seluruh data dari semua tabel lokal.
  /// Sangat berguna untuk memastikan tidak ada kebocoran data saat pindah akun.
  Future<void> clearAllData() async {
    await transaction(() async {
      for (final table in allTables) {
        await delete(table).go();
      }
    });
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'pemantik_offline.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}

final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});
