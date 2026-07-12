import 'package:drift/drift.dart';

class LocalLevels extends Table {
  TextColumn get id => text()();
  TextColumn get categoryId => text()();
  IntColumn get levelNumber => integer()();
  IntColumn get timeLimitSec => integer().nullable()();
  IntColumn get passingThreshold => integer().withDefault(const Constant(0))();
  TextColumn get accessCode => text().nullable()();
  TextColumn get learningObjective => text().nullable()();
  TextColumn get successMessage => text().nullable()();
  TextColumn get failureMessage => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
