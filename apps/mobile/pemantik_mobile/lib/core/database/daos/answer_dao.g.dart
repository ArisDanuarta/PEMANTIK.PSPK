// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'answer_dao.dart';

// ignore_for_file: type=lint
mixin _$AnswerDaoMixin on DatabaseAccessor<AppDatabase> {
  $LocalAnswersTable get localAnswers => attachedDatabase.localAnswers;
  AnswerDaoManager get managers => AnswerDaoManager(this);
}

class AnswerDaoManager {
  final _$AnswerDaoMixin _db;
  AnswerDaoManager(this._db);
  $$LocalAnswersTableTableManager get localAnswers =>
      $$LocalAnswersTableTableManager(_db.attachedDatabase, _db.localAnswers);
}
