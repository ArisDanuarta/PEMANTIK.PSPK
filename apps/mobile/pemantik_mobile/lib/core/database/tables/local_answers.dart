import 'package:drift/drift.dart';

class LocalAnswers extends Table {
  TextColumn get id => text()();
  TextColumn get sessionId => text()();
  TextColumn get questionId => text()();
  TextColumn get answerData => text()(); // Berisi JSON
  TextColumn get recordingLocalPath =>
      text().nullable()(); // Path sebelum diunggah
  TextColumn get recordingUrl =>
      text().nullable()(); // URL setelah diunggah ke Storage
  BoolColumn get isCorrect => boolean().nullable()();
  RealColumn get score => real().nullable()();
  IntColumn get timeSpentSec => integer().nullable()();
  TextColumn get status => text().withDefault(const Constant('answered'))();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  TextColumn get failReason => text().nullable()();
  TextColumn get questionVersion => text().nullable()();
  DateTimeColumn get answeredAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
