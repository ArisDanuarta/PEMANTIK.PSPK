import 'package:drift/drift.dart';
import '../database.dart';
import '../tables/local_categories.dart';

part 'category_dao.g.dart';

@DriftAccessor(tables: [LocalCategories])
class CategoryDao extends DatabaseAccessor<AppDatabase>
    with _$CategoryDaoMixin {
  CategoryDao(super.db);

  Future<List<LocalCategory>> getAllCategories() =>
      select(localCategories).get();

  Future<LocalCategory?> getCategoryById(String id) =>
      (select(localCategories)..where((t) => t.id.equals(id)))
          .getSingleOrNull();

  Future<void> upsertCategory(LocalCategoriesCompanion category) {
    return into(localCategories).insertOnConflictUpdate(category);
  }
}
