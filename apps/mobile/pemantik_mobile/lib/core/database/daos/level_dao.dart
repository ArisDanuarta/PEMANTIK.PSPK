import 'package:drift/drift.dart';
import '../database.dart';
import '../tables/local_levels.dart';

part 'level_dao.g.dart';

@DriftAccessor(tables: [LocalLevels])
class LevelDao extends DatabaseAccessor<AppDatabase> with _$LevelDaoMixin {
  LevelDao(super.db);

  Future<void> upsertLevel(LocalLevelsCompanion level) {
    return into(localLevels).insertOnConflictUpdate(level);
  }

  Future<List<LocalLevel>> getLevelsByCategory(String categoryId) {
    return (select(localLevels)
          ..where((l) => l.categoryId.equals(categoryId))
          ..orderBy([
            (l) =>
                OrderingTerm(expression: l.levelNumber, mode: OrderingMode.asc),
          ]))
        .get();
  }

  Stream<List<LocalLevel>> watchLevelsByCategory(String categoryId) {
    return (select(localLevels)
          ..where((l) => l.categoryId.equals(categoryId))
          ..orderBy([
            (l) =>
                OrderingTerm(expression: l.levelNumber, mode: OrderingMode.asc),
          ]))
        .watch();
  }

  Future<LocalLevel?> getLevelById(String id) {
    return (select(
      localLevels,
    )..where((l) => l.id.equals(id))).getSingleOrNull();
  }

  /// Mengembalikan level berikutnya (berdasarkan levelNumber) dalam kategori yang sama.
  Future<LocalLevel?> getNextLevel(String currentLevelId) async {
    final current = await getLevelById(currentLevelId);
    if (current == null) return null;
    return (select(localLevels)
          ..where((l) =>
              l.categoryId.equals(current.categoryId) &
              l.levelNumber.isBiggerThanValue(current.levelNumber))
          ..orderBy([
            (l) => OrderingTerm(expression: l.levelNumber, mode: OrderingMode.asc),
          ])
          ..limit(1))
        .getSingleOrNull();
  }

  Future<void> clearLevels() {
    return delete(localLevels).go();
  }
}
