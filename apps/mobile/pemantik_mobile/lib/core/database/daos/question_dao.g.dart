// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'question_dao.dart';

// ignore_for_file: type=lint
mixin _$QuestionDaoMixin on DatabaseAccessor<AppDatabase> {
  $LocalQuestionsTable get localQuestions => attachedDatabase.localQuestions;
  QuestionDaoManager get managers => QuestionDaoManager(this);
}

class QuestionDaoManager {
  final _$QuestionDaoMixin _db;
  QuestionDaoManager(this._db);
  $$LocalQuestionsTableTableManager get localQuestions =>
      $$LocalQuestionsTableTableManager(
        _db.attachedDatabase,
        _db.localQuestions,
      );
}
