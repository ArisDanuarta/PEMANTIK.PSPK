// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'session_dao.dart';

// ignore_for_file: type=lint
mixin _$SessionDaoMixin on DatabaseAccessor<AppDatabase> {
  $LocalSessionsTable get localSessions => attachedDatabase.localSessions;
  $LocalAnswersTable get localAnswers => attachedDatabase.localAnswers;
  SessionDaoManager get managers => SessionDaoManager(this);
}

class SessionDaoManager {
  final _$SessionDaoMixin _db;
  SessionDaoManager(this._db);
  $$LocalSessionsTableTableManager get localSessions =>
      $$LocalSessionsTableTableManager(_db.attachedDatabase, _db.localSessions);
  $$LocalAnswersTableTableManager get localAnswers =>
      $$LocalAnswersTableTableManager(_db.attachedDatabase, _db.localAnswers);
}
