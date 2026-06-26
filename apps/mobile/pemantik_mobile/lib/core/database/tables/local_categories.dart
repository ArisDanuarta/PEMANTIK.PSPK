import 'package:drift/drift.dart';

class LocalCategories extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get subjectArea => text()();
  TextColumn get phase => text().withDefault(const Constant('Tahap 1'))();
  DateTimeColumn get validFrom => dateTime().nullable()();
  DateTimeColumn get validUntil => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
