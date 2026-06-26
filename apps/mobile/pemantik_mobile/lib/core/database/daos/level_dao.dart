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

  Future<void> clearLevels() {
    return delete(localLevels).go();
  }
}
