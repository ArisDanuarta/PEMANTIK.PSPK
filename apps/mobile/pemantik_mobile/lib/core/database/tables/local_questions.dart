import 'package:drift/drift.dart';

class LocalQuestions extends Table {
  TextColumn get id => text()();
  TextColumn get levelId => text()();
  TextColumn get categoryId => text()();
  TextColumn get subjectArea => text()();
  TextColumn get questionType => text()();
  TextColumn get questionText => text().nullable()();
  TextColumn get questionInstruction => text().nullable()();
  TextColumn get questionAudioUrl => text().nullable()();
  TextColumn get questionVideoUrl => text().nullable()();
  TextColumn get questionImageUrl => text().nullable()();
  TextColumn get optionsJson => text().nullable()();
  TextColumn get correctAnswerJson => text()();
  IntColumn get version => integer().withDefault(const Constant(1))();
  IntColumn get orderIndex => integer().withDefault(const Constant(0))();
  IntColumn get timeLimitSec => integer().nullable()();
  DateTimeColumn get cachedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
