// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'level_dao.dart';

// ignore_for_file: type=lint
mixin _$LevelDaoMixin on DatabaseAccessor<AppDatabase> {
  $LocalLevelsTable get localLevels => attachedDatabase.localLevels;
  LevelDaoManager get managers => LevelDaoManager(this);
}

class LevelDaoManager {
  final _$LevelDaoMixin _db;
  LevelDaoManager(this._db);
  $$LocalLevelsTableTableManager get localLevels =>
      $$LocalLevelsTableTableManager(_db.attachedDatabase, _db.localLevels);
}
