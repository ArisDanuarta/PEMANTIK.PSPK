import 'package:drift/drift.dart';
import '../database.dart';
import '../tables/local_answers.dart';

part 'answer_dao.g.dart';

@DriftAccessor(tables: [LocalAnswers])
class AnswerDao extends DatabaseAccessor<AppDatabase> with _$AnswerDaoMixin {
  AnswerDao(super.db); // Menggunakan super parameter

  Future<void> insertAnswer(LocalAnswersCompanion answer) {
    return into(localAnswers).insert(answer);
  }

  Future<void> upsertAnswer(LocalAnswersCompanion answer) {
    return into(localAnswers).insertOnConflictUpdate(answer);
  }

  Future<List<LocalAnswer>> getAnswersByStatus(String syncStatus) {
    return (select(
      localAnswers,
    )..where((t) => t.syncStatus.equals(syncStatus))).get();
  }

  Future<List<LocalAnswer>> getAnswersForSession(String sessionId) {
    return (select(
      localAnswers,
    )..where((t) => t.sessionId.equals(sessionId))).get();
  }

  Future<void> updateSyncStatus(String id, String status) {
    return (update(localAnswers)..where((t) => t.id.equals(id))).write(
      LocalAnswersCompanion(syncStatus: Value(status)),
    );
  }

  Future<void> updateRecordingUrl(
    String id, {
    required String url,
    required String syncStatus,
  }) {
    return (update(localAnswers)..where((t) => t.id.equals(id))).write(
      LocalAnswersCompanion(
        recordingUrl: Value(url),
        recordingLocalPath: const Value(null),
        syncStatus: Value(syncStatus),
      ),
    );
  }

  Future<void> markFailedSync(String id, {required String reason}) {
    return (update(localAnswers)..where((t) => t.id.equals(id))).write(
      LocalAnswersCompanion(
        syncStatus: const Value('failed_sync'),
        failReason: Value(reason),
      ),
    );
  }
}
