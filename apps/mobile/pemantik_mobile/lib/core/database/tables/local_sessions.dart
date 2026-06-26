import 'package:drift/drift.dart';

class LocalSessions extends Table {
  TextColumn get id => text()();
  TextColumn get studentId => text()();
  TextColumn get categoryId => text()();
  TextColumn get schoolId => text()();
  TextColumn get levelId => text().nullable()();
  TextColumn get phase => text().withDefault(const Constant('Tahap 1'))();
  TextColumn get status => text().withDefault(
    const Constant('pending'),
  )(); // pending | in_progress | completed
  IntColumn get attemptNumber => integer().withDefault(const Constant(1))();
  IntColumn get currentQuestionIndex =>
      integer().withDefault(const Constant(0))();
  DateTimeColumn get startedAt => dateTime().nullable()();
  DateTimeColumn get completedAt => dateTime().nullable()();
  IntColumn get timeSpentSec => integer().nullable()();
  TextColumn get syncStatus => text().withDefault(
    const Constant('pending'),
  )(); // pending | syncing | synced | failed
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
