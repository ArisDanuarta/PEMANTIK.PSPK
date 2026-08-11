import 'package:drift/drift.dart';
import '../database.dart';
import '../tables/local_sessions.dart';
import '../tables/local_answers.dart';

part 'session_dao.g.dart';

@DriftAccessor(tables: [LocalSessions, LocalAnswers])
class SessionDao extends DatabaseAccessor<AppDatabase> with _$SessionDaoMixin {
  SessionDao(super.db);

  Future<List<LocalSession>> getSessionsByStatus(String syncStatus) {
    return (select(
      localSessions,
    )..where((t) => t.syncStatus.equals(syncStatus))).get();
  }

  Future<List<LocalSession>> getPendingSessionsForStudent(String studentId) {
    return (select(localSessions)..where(
          (t) => t.studentId.equals(studentId) & t.syncStatus.equals('pending'),
        ))
        .get();
  }

  Future<List<LocalSession>> getCompletedSessionsForStudent(String studentId) {
    return (select(localSessions)
          ..where(
            (t) => t.studentId.equals(studentId) & t.status.equals('completed'),
          )
          ..orderBy([
            (t) => OrderingTerm(
              expression: t.completedAt,
              mode: OrderingMode.desc,
            ),
          ]))
        .get();
  }

  Future<int> countPendingSessionsForStudent(String studentId) async {
    final sessions =
        await (select(localSessions)..where(
              (t) =>
                  t.studentId.equals(studentId) &
                  t.syncStatus.equals('pending'),
            ))
            .get();
    return sessions.length;
  }

  Future<List<LocalAnswer>> getPendingAnswersForStudent(
    String studentId,
  ) async {
    final query = select(localAnswers).join([
      innerJoin(
        localSessions,
        localSessions.id.equalsExp(localAnswers.sessionId),
      ),
    ]);
    query.where(
      localSessions.studentId.equals(studentId) &
          localAnswers.syncStatus.equals('pending'),
    );
    final rows = await query.get();
    return rows.map((row) => row.readTable(localAnswers)).toList();
  }

  Future<void> updateSyncStatus(String id, String status) {
    return (update(localSessions)..where((t) => t.id.equals(id))).write(
      LocalSessionsCompanion(syncStatus: Value(status)),
    );
  }

  Future<LocalSession?> getSessionById(String id) {
    return (select(
      localSessions,
    )..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<void> createSession(LocalSessionsCompanion session) {
    return into(localSessions).insert(session);
  }

  Future<void> upsertSession(LocalSessionsCompanion session) {
    return into(localSessions).insertOnConflictUpdate(session);
  }

  Future<void> updateQuestionIndex(String id, int index) {
    return (update(localSessions)..where((t) => t.id.equals(id))).write(
      LocalSessionsCompanion(currentQuestionIndex: Value(index)),
    );
  }

  Future<void> updateCheatStrikes(String id, int strikes) {
    return (update(localSessions)..where((t) => t.id.equals(id))).write(
      LocalSessionsCompanion(cheatStrikes: Value(strikes)),
    );
  }

  // Fungsi baru: Mendapatkan skor tertinggi dari sesi yang selesai untuk suatu level
  Future<int> getHighestCorrectAnswersForLevel(
    String studentId,
    String levelId,
    String phase,
  ) async {
    // Cari semua sesi untuk studentId dan levelId yang sudah 'completed'
    // Cek levelId DAN currentLevelId agar tahan terhadap perubahan saat sync/advance
    // JUGA filter berdasarkan phase agar Tahap A terpisah dari Tahap B
    final sessions =
        await (select(localSessions)..where(
              (t) =>
                  t.studentId.equals(studentId) &
                  (t.levelId.equals(levelId) |
                      (t.levelId.isNull() & t.currentLevelId.equals(levelId))) &
                  t.status.equals('completed') &
                  t.phase.equals(phase),
            ))
            .get();

    if (sessions.isEmpty) return 0;

    int maxCorrect = 0;
    for (final session in sessions) {
      // Hitung jumlah jawaban benar untuk sesi ini
      final correctAnswers =
          await (select(localAnswers)..where(
                (a) =>
                    a.sessionId.equals(session.id) & a.isCorrect.equals(true),
              ))
              .get();

      if (correctAnswers.length > maxCorrect) {
        maxCorrect = correctAnswers.length;
      }
    }

    return maxCorrect;
  }

  // Fungsi baru: Mendapatkan riwayat sesi untuk level tertentu (termasuk status sinkronisasi)
  Future<List<SessionHistoryItem>> getSessionsForLevel(
    String studentId,
    String levelId,
    String phase,
  ) async {
    final sessions =
        await (select(localSessions)
              ..where(
                (t) =>
                    t.studentId.equals(studentId) &
                    (t.levelId.equals(levelId) |
                        (t.levelId.isNull() & t.currentLevelId.equals(levelId))) &
                    t.status.equals('completed') &
                    t.phase.equals(phase),
              )
              ..orderBy([
                (t) => OrderingTerm(
                  expression: t.completedAt,
                  mode: OrderingMode.desc,
                ),
              ]))
            .get();

    final result = <SessionHistoryItem>[];
    for (final session in sessions) {
      final correctAnswers =
          await (select(localAnswers)..where(
                (a) =>
                    a.sessionId.equals(session.id) & a.isCorrect.equals(true),
              ))
              .get();
      result.add(
        SessionHistoryItem(
          session: session,
          correctAnswers: correctAnswers.length,
        ),
      );
    }
    return result;
  }

  Stream<List<LocalSession>> watchCompletedSessionsForStudent(
    String studentId,
  ) {
    return (select(localSessions)
          ..where(
            (t) => t.studentId.equals(studentId) & t.status.equals('completed'),
          )
          ..orderBy([
            (t) => OrderingTerm(
              expression: t.completedAt,
              mode: OrderingMode.desc,
            ),
          ]))
        .watch();
  }

  Future<int> getCompletedSessionsCountForLevel(
    String studentId,
    String levelId,
    String phase,
  ) async {
    final sessions =
        await (select(localSessions)..where(
              (t) =>
                  t.studentId.equals(studentId) &
                  (t.levelId.equals(levelId) |
                      (t.levelId.isNull() & t.currentLevelId.equals(levelId))) &
                  t.status.equals('completed') &
                  t.phase.equals(phase),
            ))
            .get();
    return sessions.length;
  }

  Future<int> getTotalAttemptsCountForLevel(
    String studentId,
    String levelId,
    String phase,
  ) async {
    final sessions =
        await (select(localSessions)..where(
              (t) =>
                  t.studentId.equals(studentId) &
                  (t.levelId.equals(levelId) |
                      (t.levelId.isNull() & t.currentLevelId.equals(levelId))) &
                  t.phase.equals(phase),
            ))
            .get();
    return sessions.length;
  }
}

class SessionHistoryItem {
  final LocalSession session;
  final int correctAnswers;

  SessionHistoryItem({required this.session, required this.correctAnswers});
}
