import 'package:drift/drift.dart';
import '../database.dart';
import '../tables/local_questions.dart';

part 'question_dao.g.dart';

@DriftAccessor(tables: [LocalQuestions])
class QuestionDao extends DatabaseAccessor<AppDatabase>
    with _$QuestionDaoMixin {
  QuestionDao(super.db); // Menggunakan super parameter

  Future<List<LocalQuestion>> getAllQuestions() => select(localQuestions).get();

  Future<void> upsertQuestion(LocalQuestionsCompanion question) {
    return into(localQuestions).insertOnConflictUpdate(question);
  }

  // Fungsi baru: Mengambil soal yang berelasi dengan paket tertentu
  Future<List<LocalQuestion>> getQuestionsForCategory(String categoryId) {
    return (select(
      localQuestions,
    )..where((t) => t.categoryId.equals(categoryId))).get();
  }

  Future<List<LocalQuestion>> getQuestionsForLevel(String levelId) {
    return (select(
      localQuestions,
    )..where((t) => t.levelId.equals(levelId))).get();
  }
}
