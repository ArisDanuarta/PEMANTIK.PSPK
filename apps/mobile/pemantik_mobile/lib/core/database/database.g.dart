// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'database.dart';

// ignore_for_file: type=lint
class $LocalCategoriesTable extends LocalCategories
    with TableInfo<$LocalCategoriesTable, LocalCategory> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalCategoriesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _subjectAreaMeta = const VerificationMeta(
    'subjectArea',
  );
  @override
  late final GeneratedColumn<String> subjectArea = GeneratedColumn<String>(
    'subject_area',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _phaseMeta = const VerificationMeta('phase');
  @override
  late final GeneratedColumn<String> phase = GeneratedColumn<String>(
    'phase',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('Tahap 1'),
  );
  static const VerificationMeta _validFromMeta = const VerificationMeta(
    'validFrom',
  );
  @override
  late final GeneratedColumn<DateTime> validFrom = GeneratedColumn<DateTime>(
    'valid_from',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _validUntilMeta = const VerificationMeta(
    'validUntil',
  );
  @override
  late final GeneratedColumn<DateTime> validUntil = GeneratedColumn<DateTime>(
    'valid_until',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    name,
    subjectArea,
    phase,
    validFrom,
    validUntil,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_categories';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalCategory> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('subject_area')) {
      context.handle(
        _subjectAreaMeta,
        subjectArea.isAcceptableOrUnknown(
          data['subject_area']!,
          _subjectAreaMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_subjectAreaMeta);
    }
    if (data.containsKey('phase')) {
      context.handle(
        _phaseMeta,
        phase.isAcceptableOrUnknown(data['phase']!, _phaseMeta),
      );
    }
    if (data.containsKey('valid_from')) {
      context.handle(
        _validFromMeta,
        validFrom.isAcceptableOrUnknown(data['valid_from']!, _validFromMeta),
      );
    }
    if (data.containsKey('valid_until')) {
      context.handle(
        _validUntilMeta,
        validUntil.isAcceptableOrUnknown(data['valid_until']!, _validUntilMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalCategory map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalCategory(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      subjectArea: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}subject_area'],
      )!,
      phase: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}phase'],
      )!,
      validFrom: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}valid_from'],
      ),
      validUntil: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}valid_until'],
      ),
    );
  }

  @override
  $LocalCategoriesTable createAlias(String alias) {
    return $LocalCategoriesTable(attachedDatabase, alias);
  }
}

class LocalCategory extends DataClass implements Insertable<LocalCategory> {
  final String id;
  final String name;
  final String subjectArea;
  final String phase;
  final DateTime? validFrom;
  final DateTime? validUntil;
  const LocalCategory({
    required this.id,
    required this.name,
    required this.subjectArea,
    required this.phase,
    this.validFrom,
    this.validUntil,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    map['subject_area'] = Variable<String>(subjectArea);
    map['phase'] = Variable<String>(phase);
    if (!nullToAbsent || validFrom != null) {
      map['valid_from'] = Variable<DateTime>(validFrom);
    }
    if (!nullToAbsent || validUntil != null) {
      map['valid_until'] = Variable<DateTime>(validUntil);
    }
    return map;
  }

  LocalCategoriesCompanion toCompanion(bool nullToAbsent) {
    return LocalCategoriesCompanion(
      id: Value(id),
      name: Value(name),
      subjectArea: Value(subjectArea),
      phase: Value(phase),
      validFrom: validFrom == null && nullToAbsent
          ? const Value.absent()
          : Value(validFrom),
      validUntil: validUntil == null && nullToAbsent
          ? const Value.absent()
          : Value(validUntil),
    );
  }

  factory LocalCategory.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalCategory(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      subjectArea: serializer.fromJson<String>(json['subjectArea']),
      phase: serializer.fromJson<String>(json['phase']),
      validFrom: serializer.fromJson<DateTime?>(json['validFrom']),
      validUntil: serializer.fromJson<DateTime?>(json['validUntil']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'subjectArea': serializer.toJson<String>(subjectArea),
      'phase': serializer.toJson<String>(phase),
      'validFrom': serializer.toJson<DateTime?>(validFrom),
      'validUntil': serializer.toJson<DateTime?>(validUntil),
    };
  }

  LocalCategory copyWith({
    String? id,
    String? name,
    String? subjectArea,
    String? phase,
    Value<DateTime?> validFrom = const Value.absent(),
    Value<DateTime?> validUntil = const Value.absent(),
  }) => LocalCategory(
    id: id ?? this.id,
    name: name ?? this.name,
    subjectArea: subjectArea ?? this.subjectArea,
    phase: phase ?? this.phase,
    validFrom: validFrom.present ? validFrom.value : this.validFrom,
    validUntil: validUntil.present ? validUntil.value : this.validUntil,
  );
  LocalCategory copyWithCompanion(LocalCategoriesCompanion data) {
    return LocalCategory(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      subjectArea: data.subjectArea.present
          ? data.subjectArea.value
          : this.subjectArea,
      phase: data.phase.present ? data.phase.value : this.phase,
      validFrom: data.validFrom.present ? data.validFrom.value : this.validFrom,
      validUntil: data.validUntil.present
          ? data.validUntil.value
          : this.validUntil,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalCategory(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('subjectArea: $subjectArea, ')
          ..write('phase: $phase, ')
          ..write('validFrom: $validFrom, ')
          ..write('validUntil: $validUntil')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, name, subjectArea, phase, validFrom, validUntil);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalCategory &&
          other.id == this.id &&
          other.name == this.name &&
          other.subjectArea == this.subjectArea &&
          other.phase == this.phase &&
          other.validFrom == this.validFrom &&
          other.validUntil == this.validUntil);
}

class LocalCategoriesCompanion extends UpdateCompanion<LocalCategory> {
  final Value<String> id;
  final Value<String> name;
  final Value<String> subjectArea;
  final Value<String> phase;
  final Value<DateTime?> validFrom;
  final Value<DateTime?> validUntil;
  final Value<int> rowid;
  const LocalCategoriesCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.subjectArea = const Value.absent(),
    this.phase = const Value.absent(),
    this.validFrom = const Value.absent(),
    this.validUntil = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalCategoriesCompanion.insert({
    required String id,
    required String name,
    required String subjectArea,
    this.phase = const Value.absent(),
    this.validFrom = const Value.absent(),
    this.validUntil = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       subjectArea = Value(subjectArea);
  static Insertable<LocalCategory> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? subjectArea,
    Expression<String>? phase,
    Expression<DateTime>? validFrom,
    Expression<DateTime>? validUntil,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (subjectArea != null) 'subject_area': subjectArea,
      if (phase != null) 'phase': phase,
      if (validFrom != null) 'valid_from': validFrom,
      if (validUntil != null) 'valid_until': validUntil,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalCategoriesCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String>? subjectArea,
    Value<String>? phase,
    Value<DateTime?>? validFrom,
    Value<DateTime?>? validUntil,
    Value<int>? rowid,
  }) {
    return LocalCategoriesCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      subjectArea: subjectArea ?? this.subjectArea,
      phase: phase ?? this.phase,
      validFrom: validFrom ?? this.validFrom,
      validUntil: validUntil ?? this.validUntil,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (subjectArea.present) {
      map['subject_area'] = Variable<String>(subjectArea.value);
    }
    if (phase.present) {
      map['phase'] = Variable<String>(phase.value);
    }
    if (validFrom.present) {
      map['valid_from'] = Variable<DateTime>(validFrom.value);
    }
    if (validUntil.present) {
      map['valid_until'] = Variable<DateTime>(validUntil.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalCategoriesCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('subjectArea: $subjectArea, ')
          ..write('phase: $phase, ')
          ..write('validFrom: $validFrom, ')
          ..write('validUntil: $validUntil, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalLevelsTable extends LocalLevels
    with TableInfo<$LocalLevelsTable, LocalLevel> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalLevelsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _categoryIdMeta = const VerificationMeta(
    'categoryId',
  );
  @override
  late final GeneratedColumn<String> categoryId = GeneratedColumn<String>(
    'category_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _levelNumberMeta = const VerificationMeta(
    'levelNumber',
  );
  @override
  late final GeneratedColumn<int> levelNumber = GeneratedColumn<int>(
    'level_number',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _timeLimitSecMeta = const VerificationMeta(
    'timeLimitSec',
  );
  @override
  late final GeneratedColumn<int> timeLimitSec = GeneratedColumn<int>(
    'time_limit_sec',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _passingThresholdMeta = const VerificationMeta(
    'passingThreshold',
  );
  @override
  late final GeneratedColumn<int> passingThreshold = GeneratedColumn<int>(
    'passing_threshold',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _accessCodeMeta = const VerificationMeta(
    'accessCode',
  );
  @override
  late final GeneratedColumn<String> accessCode = GeneratedColumn<String>(
    'access_code',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    categoryId,
    levelNumber,
    timeLimitSec,
    passingThreshold,
    accessCode,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_levels';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalLevel> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('category_id')) {
      context.handle(
        _categoryIdMeta,
        categoryId.isAcceptableOrUnknown(data['category_id']!, _categoryIdMeta),
      );
    } else if (isInserting) {
      context.missing(_categoryIdMeta);
    }
    if (data.containsKey('level_number')) {
      context.handle(
        _levelNumberMeta,
        levelNumber.isAcceptableOrUnknown(
          data['level_number']!,
          _levelNumberMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_levelNumberMeta);
    }
    if (data.containsKey('time_limit_sec')) {
      context.handle(
        _timeLimitSecMeta,
        timeLimitSec.isAcceptableOrUnknown(
          data['time_limit_sec']!,
          _timeLimitSecMeta,
        ),
      );
    }
    if (data.containsKey('passing_threshold')) {
      context.handle(
        _passingThresholdMeta,
        passingThreshold.isAcceptableOrUnknown(
          data['passing_threshold']!,
          _passingThresholdMeta,
        ),
      );
    }
    if (data.containsKey('access_code')) {
      context.handle(
        _accessCodeMeta,
        accessCode.isAcceptableOrUnknown(data['access_code']!, _accessCodeMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalLevel map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalLevel(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      categoryId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category_id'],
      )!,
      levelNumber: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}level_number'],
      )!,
      timeLimitSec: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}time_limit_sec'],
      ),
      passingThreshold: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}passing_threshold'],
      )!,
      accessCode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}access_code'],
      ),
    );
  }

  @override
  $LocalLevelsTable createAlias(String alias) {
    return $LocalLevelsTable(attachedDatabase, alias);
  }
}

class LocalLevel extends DataClass implements Insertable<LocalLevel> {
  final String id;
  final String categoryId;
  final int levelNumber;
  final int? timeLimitSec;
  final int passingThreshold;
  final String? accessCode;
  const LocalLevel({
    required this.id,
    required this.categoryId,
    required this.levelNumber,
    this.timeLimitSec,
    required this.passingThreshold,
    this.accessCode,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['category_id'] = Variable<String>(categoryId);
    map['level_number'] = Variable<int>(levelNumber);
    if (!nullToAbsent || timeLimitSec != null) {
      map['time_limit_sec'] = Variable<int>(timeLimitSec);
    }
    map['passing_threshold'] = Variable<int>(passingThreshold);
    if (!nullToAbsent || accessCode != null) {
      map['access_code'] = Variable<String>(accessCode);
    }
    return map;
  }

  LocalLevelsCompanion toCompanion(bool nullToAbsent) {
    return LocalLevelsCompanion(
      id: Value(id),
      categoryId: Value(categoryId),
      levelNumber: Value(levelNumber),
      timeLimitSec: timeLimitSec == null && nullToAbsent
          ? const Value.absent()
          : Value(timeLimitSec),
      passingThreshold: Value(passingThreshold),
      accessCode: accessCode == null && nullToAbsent
          ? const Value.absent()
          : Value(accessCode),
    );
  }

  factory LocalLevel.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalLevel(
      id: serializer.fromJson<String>(json['id']),
      categoryId: serializer.fromJson<String>(json['categoryId']),
      levelNumber: serializer.fromJson<int>(json['levelNumber']),
      timeLimitSec: serializer.fromJson<int?>(json['timeLimitSec']),
      passingThreshold: serializer.fromJson<int>(json['passingThreshold']),
      accessCode: serializer.fromJson<String?>(json['accessCode']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'categoryId': serializer.toJson<String>(categoryId),
      'levelNumber': serializer.toJson<int>(levelNumber),
      'timeLimitSec': serializer.toJson<int?>(timeLimitSec),
      'passingThreshold': serializer.toJson<int>(passingThreshold),
      'accessCode': serializer.toJson<String?>(accessCode),
    };
  }

  LocalLevel copyWith({
    String? id,
    String? categoryId,
    int? levelNumber,
    Value<int?> timeLimitSec = const Value.absent(),
    int? passingThreshold,
    Value<String?> accessCode = const Value.absent(),
  }) => LocalLevel(
    id: id ?? this.id,
    categoryId: categoryId ?? this.categoryId,
    levelNumber: levelNumber ?? this.levelNumber,
    timeLimitSec: timeLimitSec.present ? timeLimitSec.value : this.timeLimitSec,
    passingThreshold: passingThreshold ?? this.passingThreshold,
    accessCode: accessCode.present ? accessCode.value : this.accessCode,
  );
  LocalLevel copyWithCompanion(LocalLevelsCompanion data) {
    return LocalLevel(
      id: data.id.present ? data.id.value : this.id,
      categoryId: data.categoryId.present
          ? data.categoryId.value
          : this.categoryId,
      levelNumber: data.levelNumber.present
          ? data.levelNumber.value
          : this.levelNumber,
      timeLimitSec: data.timeLimitSec.present
          ? data.timeLimitSec.value
          : this.timeLimitSec,
      passingThreshold: data.passingThreshold.present
          ? data.passingThreshold.value
          : this.passingThreshold,
      accessCode: data.accessCode.present
          ? data.accessCode.value
          : this.accessCode,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalLevel(')
          ..write('id: $id, ')
          ..write('categoryId: $categoryId, ')
          ..write('levelNumber: $levelNumber, ')
          ..write('timeLimitSec: $timeLimitSec, ')
          ..write('passingThreshold: $passingThreshold, ')
          ..write('accessCode: $accessCode')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    categoryId,
    levelNumber,
    timeLimitSec,
    passingThreshold,
    accessCode,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalLevel &&
          other.id == this.id &&
          other.categoryId == this.categoryId &&
          other.levelNumber == this.levelNumber &&
          other.timeLimitSec == this.timeLimitSec &&
          other.passingThreshold == this.passingThreshold &&
          other.accessCode == this.accessCode);
}

class LocalLevelsCompanion extends UpdateCompanion<LocalLevel> {
  final Value<String> id;
  final Value<String> categoryId;
  final Value<int> levelNumber;
  final Value<int?> timeLimitSec;
  final Value<int> passingThreshold;
  final Value<String?> accessCode;
  final Value<int> rowid;
  const LocalLevelsCompanion({
    this.id = const Value.absent(),
    this.categoryId = const Value.absent(),
    this.levelNumber = const Value.absent(),
    this.timeLimitSec = const Value.absent(),
    this.passingThreshold = const Value.absent(),
    this.accessCode = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalLevelsCompanion.insert({
    required String id,
    required String categoryId,
    required int levelNumber,
    this.timeLimitSec = const Value.absent(),
    this.passingThreshold = const Value.absent(),
    this.accessCode = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       categoryId = Value(categoryId),
       levelNumber = Value(levelNumber);
  static Insertable<LocalLevel> custom({
    Expression<String>? id,
    Expression<String>? categoryId,
    Expression<int>? levelNumber,
    Expression<int>? timeLimitSec,
    Expression<int>? passingThreshold,
    Expression<String>? accessCode,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (categoryId != null) 'category_id': categoryId,
      if (levelNumber != null) 'level_number': levelNumber,
      if (timeLimitSec != null) 'time_limit_sec': timeLimitSec,
      if (passingThreshold != null) 'passing_threshold': passingThreshold,
      if (accessCode != null) 'access_code': accessCode,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalLevelsCompanion copyWith({
    Value<String>? id,
    Value<String>? categoryId,
    Value<int>? levelNumber,
    Value<int?>? timeLimitSec,
    Value<int>? passingThreshold,
    Value<String?>? accessCode,
    Value<int>? rowid,
  }) {
    return LocalLevelsCompanion(
      id: id ?? this.id,
      categoryId: categoryId ?? this.categoryId,
      levelNumber: levelNumber ?? this.levelNumber,
      timeLimitSec: timeLimitSec ?? this.timeLimitSec,
      passingThreshold: passingThreshold ?? this.passingThreshold,
      accessCode: accessCode ?? this.accessCode,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (categoryId.present) {
      map['category_id'] = Variable<String>(categoryId.value);
    }
    if (levelNumber.present) {
      map['level_number'] = Variable<int>(levelNumber.value);
    }
    if (timeLimitSec.present) {
      map['time_limit_sec'] = Variable<int>(timeLimitSec.value);
    }
    if (passingThreshold.present) {
      map['passing_threshold'] = Variable<int>(passingThreshold.value);
    }
    if (accessCode.present) {
      map['access_code'] = Variable<String>(accessCode.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalLevelsCompanion(')
          ..write('id: $id, ')
          ..write('categoryId: $categoryId, ')
          ..write('levelNumber: $levelNumber, ')
          ..write('timeLimitSec: $timeLimitSec, ')
          ..write('passingThreshold: $passingThreshold, ')
          ..write('accessCode: $accessCode, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalQuestionsTable extends LocalQuestions
    with TableInfo<$LocalQuestionsTable, LocalQuestion> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalQuestionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _levelIdMeta = const VerificationMeta(
    'levelId',
  );
  @override
  late final GeneratedColumn<String> levelId = GeneratedColumn<String>(
    'level_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _categoryIdMeta = const VerificationMeta(
    'categoryId',
  );
  @override
  late final GeneratedColumn<String> categoryId = GeneratedColumn<String>(
    'category_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _subjectAreaMeta = const VerificationMeta(
    'subjectArea',
  );
  @override
  late final GeneratedColumn<String> subjectArea = GeneratedColumn<String>(
    'subject_area',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _questionTypeMeta = const VerificationMeta(
    'questionType',
  );
  @override
  late final GeneratedColumn<String> questionType = GeneratedColumn<String>(
    'question_type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _questionTextMeta = const VerificationMeta(
    'questionText',
  );
  @override
  late final GeneratedColumn<String> questionText = GeneratedColumn<String>(
    'question_text',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _questionAudioUrlMeta = const VerificationMeta(
    'questionAudioUrl',
  );
  @override
  late final GeneratedColumn<String> questionAudioUrl = GeneratedColumn<String>(
    'question_audio_url',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _questionVideoUrlMeta = const VerificationMeta(
    'questionVideoUrl',
  );
  @override
  late final GeneratedColumn<String> questionVideoUrl = GeneratedColumn<String>(
    'question_video_url',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _questionImageUrlMeta = const VerificationMeta(
    'questionImageUrl',
  );
  @override
  late final GeneratedColumn<String> questionImageUrl = GeneratedColumn<String>(
    'question_image_url',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _optionsJsonMeta = const VerificationMeta(
    'optionsJson',
  );
  @override
  late final GeneratedColumn<String> optionsJson = GeneratedColumn<String>(
    'options_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _correctAnswerJsonMeta = const VerificationMeta(
    'correctAnswerJson',
  );
  @override
  late final GeneratedColumn<String> correctAnswerJson =
      GeneratedColumn<String>(
        'correct_answer_json',
        aliasedName,
        false,
        type: DriftSqlType.string,
        requiredDuringInsert: true,
      );
  static const VerificationMeta _versionMeta = const VerificationMeta(
    'version',
  );
  @override
  late final GeneratedColumn<int> version = GeneratedColumn<int>(
    'version',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _orderIndexMeta = const VerificationMeta(
    'orderIndex',
  );
  @override
  late final GeneratedColumn<int> orderIndex = GeneratedColumn<int>(
    'order_index',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _timeLimitSecMeta = const VerificationMeta(
    'timeLimitSec',
  );
  @override
  late final GeneratedColumn<int> timeLimitSec = GeneratedColumn<int>(
    'time_limit_sec',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    levelId,
    categoryId,
    subjectArea,
    questionType,
    questionText,
    questionAudioUrl,
    questionVideoUrl,
    questionImageUrl,
    optionsJson,
    correctAnswerJson,
    version,
    orderIndex,
    timeLimitSec,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_questions';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalQuestion> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('level_id')) {
      context.handle(
        _levelIdMeta,
        levelId.isAcceptableOrUnknown(data['level_id']!, _levelIdMeta),
      );
    } else if (isInserting) {
      context.missing(_levelIdMeta);
    }
    if (data.containsKey('category_id')) {
      context.handle(
        _categoryIdMeta,
        categoryId.isAcceptableOrUnknown(data['category_id']!, _categoryIdMeta),
      );
    } else if (isInserting) {
      context.missing(_categoryIdMeta);
    }
    if (data.containsKey('subject_area')) {
      context.handle(
        _subjectAreaMeta,
        subjectArea.isAcceptableOrUnknown(
          data['subject_area']!,
          _subjectAreaMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_subjectAreaMeta);
    }
    if (data.containsKey('question_type')) {
      context.handle(
        _questionTypeMeta,
        questionType.isAcceptableOrUnknown(
          data['question_type']!,
          _questionTypeMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_questionTypeMeta);
    }
    if (data.containsKey('question_text')) {
      context.handle(
        _questionTextMeta,
        questionText.isAcceptableOrUnknown(
          data['question_text']!,
          _questionTextMeta,
        ),
      );
    }
    if (data.containsKey('question_audio_url')) {
      context.handle(
        _questionAudioUrlMeta,
        questionAudioUrl.isAcceptableOrUnknown(
          data['question_audio_url']!,
          _questionAudioUrlMeta,
        ),
      );
    }
    if (data.containsKey('question_video_url')) {
      context.handle(
        _questionVideoUrlMeta,
        questionVideoUrl.isAcceptableOrUnknown(
          data['question_video_url']!,
          _questionVideoUrlMeta,
        ),
      );
    }
    if (data.containsKey('question_image_url')) {
      context.handle(
        _questionImageUrlMeta,
        questionImageUrl.isAcceptableOrUnknown(
          data['question_image_url']!,
          _questionImageUrlMeta,
        ),
      );
    }
    if (data.containsKey('options_json')) {
      context.handle(
        _optionsJsonMeta,
        optionsJson.isAcceptableOrUnknown(
          data['options_json']!,
          _optionsJsonMeta,
        ),
      );
    }
    if (data.containsKey('correct_answer_json')) {
      context.handle(
        _correctAnswerJsonMeta,
        correctAnswerJson.isAcceptableOrUnknown(
          data['correct_answer_json']!,
          _correctAnswerJsonMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_correctAnswerJsonMeta);
    }
    if (data.containsKey('version')) {
      context.handle(
        _versionMeta,
        version.isAcceptableOrUnknown(data['version']!, _versionMeta),
      );
    }
    if (data.containsKey('order_index')) {
      context.handle(
        _orderIndexMeta,
        orderIndex.isAcceptableOrUnknown(data['order_index']!, _orderIndexMeta),
      );
    }
    if (data.containsKey('time_limit_sec')) {
      context.handle(
        _timeLimitSecMeta,
        timeLimitSec.isAcceptableOrUnknown(
          data['time_limit_sec']!,
          _timeLimitSecMeta,
        ),
      );
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_cachedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalQuestion map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalQuestion(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      levelId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}level_id'],
      )!,
      categoryId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category_id'],
      )!,
      subjectArea: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}subject_area'],
      )!,
      questionType: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}question_type'],
      )!,
      questionText: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}question_text'],
      ),
      questionAudioUrl: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}question_audio_url'],
      ),
      questionVideoUrl: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}question_video_url'],
      ),
      questionImageUrl: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}question_image_url'],
      ),
      optionsJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}options_json'],
      ),
      correctAnswerJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}correct_answer_json'],
      )!,
      version: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}version'],
      )!,
      orderIndex: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}order_index'],
      )!,
      timeLimitSec: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}time_limit_sec'],
      ),
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $LocalQuestionsTable createAlias(String alias) {
    return $LocalQuestionsTable(attachedDatabase, alias);
  }
}

class LocalQuestion extends DataClass implements Insertable<LocalQuestion> {
  final String id;
  final String levelId;
  final String categoryId;
  final String subjectArea;
  final String questionType;
  final String? questionText;
  final String? questionAudioUrl;
  final String? questionVideoUrl;
  final String? questionImageUrl;
  final String? optionsJson;
  final String correctAnswerJson;
  final int version;
  final int orderIndex;
  final int? timeLimitSec;
  final DateTime cachedAt;
  const LocalQuestion({
    required this.id,
    required this.levelId,
    required this.categoryId,
    required this.subjectArea,
    required this.questionType,
    this.questionText,
    this.questionAudioUrl,
    this.questionVideoUrl,
    this.questionImageUrl,
    this.optionsJson,
    required this.correctAnswerJson,
    required this.version,
    required this.orderIndex,
    this.timeLimitSec,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['level_id'] = Variable<String>(levelId);
    map['category_id'] = Variable<String>(categoryId);
    map['subject_area'] = Variable<String>(subjectArea);
    map['question_type'] = Variable<String>(questionType);
    if (!nullToAbsent || questionText != null) {
      map['question_text'] = Variable<String>(questionText);
    }
    if (!nullToAbsent || questionAudioUrl != null) {
      map['question_audio_url'] = Variable<String>(questionAudioUrl);
    }
    if (!nullToAbsent || questionVideoUrl != null) {
      map['question_video_url'] = Variable<String>(questionVideoUrl);
    }
    if (!nullToAbsent || questionImageUrl != null) {
      map['question_image_url'] = Variable<String>(questionImageUrl);
    }
    if (!nullToAbsent || optionsJson != null) {
      map['options_json'] = Variable<String>(optionsJson);
    }
    map['correct_answer_json'] = Variable<String>(correctAnswerJson);
    map['version'] = Variable<int>(version);
    map['order_index'] = Variable<int>(orderIndex);
    if (!nullToAbsent || timeLimitSec != null) {
      map['time_limit_sec'] = Variable<int>(timeLimitSec);
    }
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  LocalQuestionsCompanion toCompanion(bool nullToAbsent) {
    return LocalQuestionsCompanion(
      id: Value(id),
      levelId: Value(levelId),
      categoryId: Value(categoryId),
      subjectArea: Value(subjectArea),
      questionType: Value(questionType),
      questionText: questionText == null && nullToAbsent
          ? const Value.absent()
          : Value(questionText),
      questionAudioUrl: questionAudioUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(questionAudioUrl),
      questionVideoUrl: questionVideoUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(questionVideoUrl),
      questionImageUrl: questionImageUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(questionImageUrl),
      optionsJson: optionsJson == null && nullToAbsent
          ? const Value.absent()
          : Value(optionsJson),
      correctAnswerJson: Value(correctAnswerJson),
      version: Value(version),
      orderIndex: Value(orderIndex),
      timeLimitSec: timeLimitSec == null && nullToAbsent
          ? const Value.absent()
          : Value(timeLimitSec),
      cachedAt: Value(cachedAt),
    );
  }

  factory LocalQuestion.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalQuestion(
      id: serializer.fromJson<String>(json['id']),
      levelId: serializer.fromJson<String>(json['levelId']),
      categoryId: serializer.fromJson<String>(json['categoryId']),
      subjectArea: serializer.fromJson<String>(json['subjectArea']),
      questionType: serializer.fromJson<String>(json['questionType']),
      questionText: serializer.fromJson<String?>(json['questionText']),
      questionAudioUrl: serializer.fromJson<String?>(json['questionAudioUrl']),
      questionVideoUrl: serializer.fromJson<String?>(json['questionVideoUrl']),
      questionImageUrl: serializer.fromJson<String?>(json['questionImageUrl']),
      optionsJson: serializer.fromJson<String?>(json['optionsJson']),
      correctAnswerJson: serializer.fromJson<String>(json['correctAnswerJson']),
      version: serializer.fromJson<int>(json['version']),
      orderIndex: serializer.fromJson<int>(json['orderIndex']),
      timeLimitSec: serializer.fromJson<int?>(json['timeLimitSec']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'levelId': serializer.toJson<String>(levelId),
      'categoryId': serializer.toJson<String>(categoryId),
      'subjectArea': serializer.toJson<String>(subjectArea),
      'questionType': serializer.toJson<String>(questionType),
      'questionText': serializer.toJson<String?>(questionText),
      'questionAudioUrl': serializer.toJson<String?>(questionAudioUrl),
      'questionVideoUrl': serializer.toJson<String?>(questionVideoUrl),
      'questionImageUrl': serializer.toJson<String?>(questionImageUrl),
      'optionsJson': serializer.toJson<String?>(optionsJson),
      'correctAnswerJson': serializer.toJson<String>(correctAnswerJson),
      'version': serializer.toJson<int>(version),
      'orderIndex': serializer.toJson<int>(orderIndex),
      'timeLimitSec': serializer.toJson<int?>(timeLimitSec),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  LocalQuestion copyWith({
    String? id,
    String? levelId,
    String? categoryId,
    String? subjectArea,
    String? questionType,
    Value<String?> questionText = const Value.absent(),
    Value<String?> questionAudioUrl = const Value.absent(),
    Value<String?> questionVideoUrl = const Value.absent(),
    Value<String?> questionImageUrl = const Value.absent(),
    Value<String?> optionsJson = const Value.absent(),
    String? correctAnswerJson,
    int? version,
    int? orderIndex,
    Value<int?> timeLimitSec = const Value.absent(),
    DateTime? cachedAt,
  }) => LocalQuestion(
    id: id ?? this.id,
    levelId: levelId ?? this.levelId,
    categoryId: categoryId ?? this.categoryId,
    subjectArea: subjectArea ?? this.subjectArea,
    questionType: questionType ?? this.questionType,
    questionText: questionText.present ? questionText.value : this.questionText,
    questionAudioUrl: questionAudioUrl.present
        ? questionAudioUrl.value
        : this.questionAudioUrl,
    questionVideoUrl: questionVideoUrl.present
        ? questionVideoUrl.value
        : this.questionVideoUrl,
    questionImageUrl: questionImageUrl.present
        ? questionImageUrl.value
        : this.questionImageUrl,
    optionsJson: optionsJson.present ? optionsJson.value : this.optionsJson,
    correctAnswerJson: correctAnswerJson ?? this.correctAnswerJson,
    version: version ?? this.version,
    orderIndex: orderIndex ?? this.orderIndex,
    timeLimitSec: timeLimitSec.present ? timeLimitSec.value : this.timeLimitSec,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  LocalQuestion copyWithCompanion(LocalQuestionsCompanion data) {
    return LocalQuestion(
      id: data.id.present ? data.id.value : this.id,
      levelId: data.levelId.present ? data.levelId.value : this.levelId,
      categoryId: data.categoryId.present
          ? data.categoryId.value
          : this.categoryId,
      subjectArea: data.subjectArea.present
          ? data.subjectArea.value
          : this.subjectArea,
      questionType: data.questionType.present
          ? data.questionType.value
          : this.questionType,
      questionText: data.questionText.present
          ? data.questionText.value
          : this.questionText,
      questionAudioUrl: data.questionAudioUrl.present
          ? data.questionAudioUrl.value
          : this.questionAudioUrl,
      questionVideoUrl: data.questionVideoUrl.present
          ? data.questionVideoUrl.value
          : this.questionVideoUrl,
      questionImageUrl: data.questionImageUrl.present
          ? data.questionImageUrl.value
          : this.questionImageUrl,
      optionsJson: data.optionsJson.present
          ? data.optionsJson.value
          : this.optionsJson,
      correctAnswerJson: data.correctAnswerJson.present
          ? data.correctAnswerJson.value
          : this.correctAnswerJson,
      version: data.version.present ? data.version.value : this.version,
      orderIndex: data.orderIndex.present
          ? data.orderIndex.value
          : this.orderIndex,
      timeLimitSec: data.timeLimitSec.present
          ? data.timeLimitSec.value
          : this.timeLimitSec,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalQuestion(')
          ..write('id: $id, ')
          ..write('levelId: $levelId, ')
          ..write('categoryId: $categoryId, ')
          ..write('subjectArea: $subjectArea, ')
          ..write('questionType: $questionType, ')
          ..write('questionText: $questionText, ')
          ..write('questionAudioUrl: $questionAudioUrl, ')
          ..write('questionVideoUrl: $questionVideoUrl, ')
          ..write('questionImageUrl: $questionImageUrl, ')
          ..write('optionsJson: $optionsJson, ')
          ..write('correctAnswerJson: $correctAnswerJson, ')
          ..write('version: $version, ')
          ..write('orderIndex: $orderIndex, ')
          ..write('timeLimitSec: $timeLimitSec, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    levelId,
    categoryId,
    subjectArea,
    questionType,
    questionText,
    questionAudioUrl,
    questionVideoUrl,
    questionImageUrl,
    optionsJson,
    correctAnswerJson,
    version,
    orderIndex,
    timeLimitSec,
    cachedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalQuestion &&
          other.id == this.id &&
          other.levelId == this.levelId &&
          other.categoryId == this.categoryId &&
          other.subjectArea == this.subjectArea &&
          other.questionType == this.questionType &&
          other.questionText == this.questionText &&
          other.questionAudioUrl == this.questionAudioUrl &&
          other.questionVideoUrl == this.questionVideoUrl &&
          other.questionImageUrl == this.questionImageUrl &&
          other.optionsJson == this.optionsJson &&
          other.correctAnswerJson == this.correctAnswerJson &&
          other.version == this.version &&
          other.orderIndex == this.orderIndex &&
          other.timeLimitSec == this.timeLimitSec &&
          other.cachedAt == this.cachedAt);
}

class LocalQuestionsCompanion extends UpdateCompanion<LocalQuestion> {
  final Value<String> id;
  final Value<String> levelId;
  final Value<String> categoryId;
  final Value<String> subjectArea;
  final Value<String> questionType;
  final Value<String?> questionText;
  final Value<String?> questionAudioUrl;
  final Value<String?> questionVideoUrl;
  final Value<String?> questionImageUrl;
  final Value<String?> optionsJson;
  final Value<String> correctAnswerJson;
  final Value<int> version;
  final Value<int> orderIndex;
  final Value<int?> timeLimitSec;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const LocalQuestionsCompanion({
    this.id = const Value.absent(),
    this.levelId = const Value.absent(),
    this.categoryId = const Value.absent(),
    this.subjectArea = const Value.absent(),
    this.questionType = const Value.absent(),
    this.questionText = const Value.absent(),
    this.questionAudioUrl = const Value.absent(),
    this.questionVideoUrl = const Value.absent(),
    this.questionImageUrl = const Value.absent(),
    this.optionsJson = const Value.absent(),
    this.correctAnswerJson = const Value.absent(),
    this.version = const Value.absent(),
    this.orderIndex = const Value.absent(),
    this.timeLimitSec = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalQuestionsCompanion.insert({
    required String id,
    required String levelId,
    required String categoryId,
    required String subjectArea,
    required String questionType,
    this.questionText = const Value.absent(),
    this.questionAudioUrl = const Value.absent(),
    this.questionVideoUrl = const Value.absent(),
    this.questionImageUrl = const Value.absent(),
    this.optionsJson = const Value.absent(),
    required String correctAnswerJson,
    this.version = const Value.absent(),
    this.orderIndex = const Value.absent(),
    this.timeLimitSec = const Value.absent(),
    required DateTime cachedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       levelId = Value(levelId),
       categoryId = Value(categoryId),
       subjectArea = Value(subjectArea),
       questionType = Value(questionType),
       correctAnswerJson = Value(correctAnswerJson),
       cachedAt = Value(cachedAt);
  static Insertable<LocalQuestion> custom({
    Expression<String>? id,
    Expression<String>? levelId,
    Expression<String>? categoryId,
    Expression<String>? subjectArea,
    Expression<String>? questionType,
    Expression<String>? questionText,
    Expression<String>? questionAudioUrl,
    Expression<String>? questionVideoUrl,
    Expression<String>? questionImageUrl,
    Expression<String>? optionsJson,
    Expression<String>? correctAnswerJson,
    Expression<int>? version,
    Expression<int>? orderIndex,
    Expression<int>? timeLimitSec,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (levelId != null) 'level_id': levelId,
      if (categoryId != null) 'category_id': categoryId,
      if (subjectArea != null) 'subject_area': subjectArea,
      if (questionType != null) 'question_type': questionType,
      if (questionText != null) 'question_text': questionText,
      if (questionAudioUrl != null) 'question_audio_url': questionAudioUrl,
      if (questionVideoUrl != null) 'question_video_url': questionVideoUrl,
      if (questionImageUrl != null) 'question_image_url': questionImageUrl,
      if (optionsJson != null) 'options_json': optionsJson,
      if (correctAnswerJson != null) 'correct_answer_json': correctAnswerJson,
      if (version != null) 'version': version,
      if (orderIndex != null) 'order_index': orderIndex,
      if (timeLimitSec != null) 'time_limit_sec': timeLimitSec,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalQuestionsCompanion copyWith({
    Value<String>? id,
    Value<String>? levelId,
    Value<String>? categoryId,
    Value<String>? subjectArea,
    Value<String>? questionType,
    Value<String?>? questionText,
    Value<String?>? questionAudioUrl,
    Value<String?>? questionVideoUrl,
    Value<String?>? questionImageUrl,
    Value<String?>? optionsJson,
    Value<String>? correctAnswerJson,
    Value<int>? version,
    Value<int>? orderIndex,
    Value<int?>? timeLimitSec,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return LocalQuestionsCompanion(
      id: id ?? this.id,
      levelId: levelId ?? this.levelId,
      categoryId: categoryId ?? this.categoryId,
      subjectArea: subjectArea ?? this.subjectArea,
      questionType: questionType ?? this.questionType,
      questionText: questionText ?? this.questionText,
      questionAudioUrl: questionAudioUrl ?? this.questionAudioUrl,
      questionVideoUrl: questionVideoUrl ?? this.questionVideoUrl,
      questionImageUrl: questionImageUrl ?? this.questionImageUrl,
      optionsJson: optionsJson ?? this.optionsJson,
      correctAnswerJson: correctAnswerJson ?? this.correctAnswerJson,
      version: version ?? this.version,
      orderIndex: orderIndex ?? this.orderIndex,
      timeLimitSec: timeLimitSec ?? this.timeLimitSec,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (levelId.present) {
      map['level_id'] = Variable<String>(levelId.value);
    }
    if (categoryId.present) {
      map['category_id'] = Variable<String>(categoryId.value);
    }
    if (subjectArea.present) {
      map['subject_area'] = Variable<String>(subjectArea.value);
    }
    if (questionType.present) {
      map['question_type'] = Variable<String>(questionType.value);
    }
    if (questionText.present) {
      map['question_text'] = Variable<String>(questionText.value);
    }
    if (questionAudioUrl.present) {
      map['question_audio_url'] = Variable<String>(questionAudioUrl.value);
    }
    if (questionVideoUrl.present) {
      map['question_video_url'] = Variable<String>(questionVideoUrl.value);
    }
    if (questionImageUrl.present) {
      map['question_image_url'] = Variable<String>(questionImageUrl.value);
    }
    if (optionsJson.present) {
      map['options_json'] = Variable<String>(optionsJson.value);
    }
    if (correctAnswerJson.present) {
      map['correct_answer_json'] = Variable<String>(correctAnswerJson.value);
    }
    if (version.present) {
      map['version'] = Variable<int>(version.value);
    }
    if (orderIndex.present) {
      map['order_index'] = Variable<int>(orderIndex.value);
    }
    if (timeLimitSec.present) {
      map['time_limit_sec'] = Variable<int>(timeLimitSec.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalQuestionsCompanion(')
          ..write('id: $id, ')
          ..write('levelId: $levelId, ')
          ..write('categoryId: $categoryId, ')
          ..write('subjectArea: $subjectArea, ')
          ..write('questionType: $questionType, ')
          ..write('questionText: $questionText, ')
          ..write('questionAudioUrl: $questionAudioUrl, ')
          ..write('questionVideoUrl: $questionVideoUrl, ')
          ..write('questionImageUrl: $questionImageUrl, ')
          ..write('optionsJson: $optionsJson, ')
          ..write('correctAnswerJson: $correctAnswerJson, ')
          ..write('version: $version, ')
          ..write('orderIndex: $orderIndex, ')
          ..write('timeLimitSec: $timeLimitSec, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalSessionsTable extends LocalSessions
    with TableInfo<$LocalSessionsTable, LocalSession> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalSessionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _studentIdMeta = const VerificationMeta(
    'studentId',
  );
  @override
  late final GeneratedColumn<String> studentId = GeneratedColumn<String>(
    'student_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _categoryIdMeta = const VerificationMeta(
    'categoryId',
  );
  @override
  late final GeneratedColumn<String> categoryId = GeneratedColumn<String>(
    'category_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _schoolIdMeta = const VerificationMeta(
    'schoolId',
  );
  @override
  late final GeneratedColumn<String> schoolId = GeneratedColumn<String>(
    'school_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _levelIdMeta = const VerificationMeta(
    'levelId',
  );
  @override
  late final GeneratedColumn<String> levelId = GeneratedColumn<String>(
    'level_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _phaseMeta = const VerificationMeta('phase');
  @override
  late final GeneratedColumn<String> phase = GeneratedColumn<String>(
    'phase',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('Tahap 1'),
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _attemptNumberMeta = const VerificationMeta(
    'attemptNumber',
  );
  @override
  late final GeneratedColumn<int> attemptNumber = GeneratedColumn<int>(
    'attempt_number',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _currentQuestionIndexMeta =
      const VerificationMeta('currentQuestionIndex');
  @override
  late final GeneratedColumn<int> currentQuestionIndex = GeneratedColumn<int>(
    'current_question_index',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _startedAtMeta = const VerificationMeta(
    'startedAt',
  );
  @override
  late final GeneratedColumn<DateTime> startedAt = GeneratedColumn<DateTime>(
    'started_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _completedAtMeta = const VerificationMeta(
    'completedAt',
  );
  @override
  late final GeneratedColumn<DateTime> completedAt = GeneratedColumn<DateTime>(
    'completed_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _timeSpentSecMeta = const VerificationMeta(
    'timeSpentSec',
  );
  @override
  late final GeneratedColumn<int> timeSpentSec = GeneratedColumn<int>(
    'time_spent_sec',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _syncStatusMeta = const VerificationMeta(
    'syncStatus',
  );
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
    'sync_status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    studentId,
    categoryId,
    schoolId,
    levelId,
    phase,
    status,
    attemptNumber,
    currentQuestionIndex,
    startedAt,
    completedAt,
    timeSpentSec,
    syncStatus,
    createdAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_sessions';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalSession> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('student_id')) {
      context.handle(
        _studentIdMeta,
        studentId.isAcceptableOrUnknown(data['student_id']!, _studentIdMeta),
      );
    } else if (isInserting) {
      context.missing(_studentIdMeta);
    }
    if (data.containsKey('category_id')) {
      context.handle(
        _categoryIdMeta,
        categoryId.isAcceptableOrUnknown(data['category_id']!, _categoryIdMeta),
      );
    } else if (isInserting) {
      context.missing(_categoryIdMeta);
    }
    if (data.containsKey('school_id')) {
      context.handle(
        _schoolIdMeta,
        schoolId.isAcceptableOrUnknown(data['school_id']!, _schoolIdMeta),
      );
    } else if (isInserting) {
      context.missing(_schoolIdMeta);
    }
    if (data.containsKey('level_id')) {
      context.handle(
        _levelIdMeta,
        levelId.isAcceptableOrUnknown(data['level_id']!, _levelIdMeta),
      );
    }
    if (data.containsKey('phase')) {
      context.handle(
        _phaseMeta,
        phase.isAcceptableOrUnknown(data['phase']!, _phaseMeta),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('attempt_number')) {
      context.handle(
        _attemptNumberMeta,
        attemptNumber.isAcceptableOrUnknown(
          data['attempt_number']!,
          _attemptNumberMeta,
        ),
      );
    }
    if (data.containsKey('current_question_index')) {
      context.handle(
        _currentQuestionIndexMeta,
        currentQuestionIndex.isAcceptableOrUnknown(
          data['current_question_index']!,
          _currentQuestionIndexMeta,
        ),
      );
    }
    if (data.containsKey('started_at')) {
      context.handle(
        _startedAtMeta,
        startedAt.isAcceptableOrUnknown(data['started_at']!, _startedAtMeta),
      );
    }
    if (data.containsKey('completed_at')) {
      context.handle(
        _completedAtMeta,
        completedAt.isAcceptableOrUnknown(
          data['completed_at']!,
          _completedAtMeta,
        ),
      );
    }
    if (data.containsKey('time_spent_sec')) {
      context.handle(
        _timeSpentSecMeta,
        timeSpentSec.isAcceptableOrUnknown(
          data['time_spent_sec']!,
          _timeSpentSecMeta,
        ),
      );
    }
    if (data.containsKey('sync_status')) {
      context.handle(
        _syncStatusMeta,
        syncStatus.isAcceptableOrUnknown(data['sync_status']!, _syncStatusMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalSession map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalSession(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      studentId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}student_id'],
      )!,
      categoryId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category_id'],
      )!,
      schoolId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}school_id'],
      )!,
      levelId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}level_id'],
      ),
      phase: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}phase'],
      )!,
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      attemptNumber: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}attempt_number'],
      )!,
      currentQuestionIndex: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}current_question_index'],
      )!,
      startedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}started_at'],
      ),
      completedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}completed_at'],
      ),
      timeSpentSec: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}time_spent_sec'],
      ),
      syncStatus: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sync_status'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
    );
  }

  @override
  $LocalSessionsTable createAlias(String alias) {
    return $LocalSessionsTable(attachedDatabase, alias);
  }
}

class LocalSession extends DataClass implements Insertable<LocalSession> {
  final String id;
  final String studentId;
  final String categoryId;
  final String schoolId;
  final String? levelId;
  final String phase;
  final String status;
  final int attemptNumber;
  final int currentQuestionIndex;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final int? timeSpentSec;
  final String syncStatus;
  final DateTime createdAt;
  const LocalSession({
    required this.id,
    required this.studentId,
    required this.categoryId,
    required this.schoolId,
    this.levelId,
    required this.phase,
    required this.status,
    required this.attemptNumber,
    required this.currentQuestionIndex,
    this.startedAt,
    this.completedAt,
    this.timeSpentSec,
    required this.syncStatus,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['student_id'] = Variable<String>(studentId);
    map['category_id'] = Variable<String>(categoryId);
    map['school_id'] = Variable<String>(schoolId);
    if (!nullToAbsent || levelId != null) {
      map['level_id'] = Variable<String>(levelId);
    }
    map['phase'] = Variable<String>(phase);
    map['status'] = Variable<String>(status);
    map['attempt_number'] = Variable<int>(attemptNumber);
    map['current_question_index'] = Variable<int>(currentQuestionIndex);
    if (!nullToAbsent || startedAt != null) {
      map['started_at'] = Variable<DateTime>(startedAt);
    }
    if (!nullToAbsent || completedAt != null) {
      map['completed_at'] = Variable<DateTime>(completedAt);
    }
    if (!nullToAbsent || timeSpentSec != null) {
      map['time_spent_sec'] = Variable<int>(timeSpentSec);
    }
    map['sync_status'] = Variable<String>(syncStatus);
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  LocalSessionsCompanion toCompanion(bool nullToAbsent) {
    return LocalSessionsCompanion(
      id: Value(id),
      studentId: Value(studentId),
      categoryId: Value(categoryId),
      schoolId: Value(schoolId),
      levelId: levelId == null && nullToAbsent
          ? const Value.absent()
          : Value(levelId),
      phase: Value(phase),
      status: Value(status),
      attemptNumber: Value(attemptNumber),
      currentQuestionIndex: Value(currentQuestionIndex),
      startedAt: startedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(startedAt),
      completedAt: completedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(completedAt),
      timeSpentSec: timeSpentSec == null && nullToAbsent
          ? const Value.absent()
          : Value(timeSpentSec),
      syncStatus: Value(syncStatus),
      createdAt: Value(createdAt),
    );
  }

  factory LocalSession.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalSession(
      id: serializer.fromJson<String>(json['id']),
      studentId: serializer.fromJson<String>(json['studentId']),
      categoryId: serializer.fromJson<String>(json['categoryId']),
      schoolId: serializer.fromJson<String>(json['schoolId']),
      levelId: serializer.fromJson<String?>(json['levelId']),
      phase: serializer.fromJson<String>(json['phase']),
      status: serializer.fromJson<String>(json['status']),
      attemptNumber: serializer.fromJson<int>(json['attemptNumber']),
      currentQuestionIndex: serializer.fromJson<int>(
        json['currentQuestionIndex'],
      ),
      startedAt: serializer.fromJson<DateTime?>(json['startedAt']),
      completedAt: serializer.fromJson<DateTime?>(json['completedAt']),
      timeSpentSec: serializer.fromJson<int?>(json['timeSpentSec']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'studentId': serializer.toJson<String>(studentId),
      'categoryId': serializer.toJson<String>(categoryId),
      'schoolId': serializer.toJson<String>(schoolId),
      'levelId': serializer.toJson<String?>(levelId),
      'phase': serializer.toJson<String>(phase),
      'status': serializer.toJson<String>(status),
      'attemptNumber': serializer.toJson<int>(attemptNumber),
      'currentQuestionIndex': serializer.toJson<int>(currentQuestionIndex),
      'startedAt': serializer.toJson<DateTime?>(startedAt),
      'completedAt': serializer.toJson<DateTime?>(completedAt),
      'timeSpentSec': serializer.toJson<int?>(timeSpentSec),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  LocalSession copyWith({
    String? id,
    String? studentId,
    String? categoryId,
    String? schoolId,
    Value<String?> levelId = const Value.absent(),
    String? phase,
    String? status,
    int? attemptNumber,
    int? currentQuestionIndex,
    Value<DateTime?> startedAt = const Value.absent(),
    Value<DateTime?> completedAt = const Value.absent(),
    Value<int?> timeSpentSec = const Value.absent(),
    String? syncStatus,
    DateTime? createdAt,
  }) => LocalSession(
    id: id ?? this.id,
    studentId: studentId ?? this.studentId,
    categoryId: categoryId ?? this.categoryId,
    schoolId: schoolId ?? this.schoolId,
    levelId: levelId.present ? levelId.value : this.levelId,
    phase: phase ?? this.phase,
    status: status ?? this.status,
    attemptNumber: attemptNumber ?? this.attemptNumber,
    currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
    startedAt: startedAt.present ? startedAt.value : this.startedAt,
    completedAt: completedAt.present ? completedAt.value : this.completedAt,
    timeSpentSec: timeSpentSec.present ? timeSpentSec.value : this.timeSpentSec,
    syncStatus: syncStatus ?? this.syncStatus,
    createdAt: createdAt ?? this.createdAt,
  );
  LocalSession copyWithCompanion(LocalSessionsCompanion data) {
    return LocalSession(
      id: data.id.present ? data.id.value : this.id,
      studentId: data.studentId.present ? data.studentId.value : this.studentId,
      categoryId: data.categoryId.present
          ? data.categoryId.value
          : this.categoryId,
      schoolId: data.schoolId.present ? data.schoolId.value : this.schoolId,
      levelId: data.levelId.present ? data.levelId.value : this.levelId,
      phase: data.phase.present ? data.phase.value : this.phase,
      status: data.status.present ? data.status.value : this.status,
      attemptNumber: data.attemptNumber.present
          ? data.attemptNumber.value
          : this.attemptNumber,
      currentQuestionIndex: data.currentQuestionIndex.present
          ? data.currentQuestionIndex.value
          : this.currentQuestionIndex,
      startedAt: data.startedAt.present ? data.startedAt.value : this.startedAt,
      completedAt: data.completedAt.present
          ? data.completedAt.value
          : this.completedAt,
      timeSpentSec: data.timeSpentSec.present
          ? data.timeSpentSec.value
          : this.timeSpentSec,
      syncStatus: data.syncStatus.present
          ? data.syncStatus.value
          : this.syncStatus,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalSession(')
          ..write('id: $id, ')
          ..write('studentId: $studentId, ')
          ..write('categoryId: $categoryId, ')
          ..write('schoolId: $schoolId, ')
          ..write('levelId: $levelId, ')
          ..write('phase: $phase, ')
          ..write('status: $status, ')
          ..write('attemptNumber: $attemptNumber, ')
          ..write('currentQuestionIndex: $currentQuestionIndex, ')
          ..write('startedAt: $startedAt, ')
          ..write('completedAt: $completedAt, ')
          ..write('timeSpentSec: $timeSpentSec, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    studentId,
    categoryId,
    schoolId,
    levelId,
    phase,
    status,
    attemptNumber,
    currentQuestionIndex,
    startedAt,
    completedAt,
    timeSpentSec,
    syncStatus,
    createdAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalSession &&
          other.id == this.id &&
          other.studentId == this.studentId &&
          other.categoryId == this.categoryId &&
          other.schoolId == this.schoolId &&
          other.levelId == this.levelId &&
          other.phase == this.phase &&
          other.status == this.status &&
          other.attemptNumber == this.attemptNumber &&
          other.currentQuestionIndex == this.currentQuestionIndex &&
          other.startedAt == this.startedAt &&
          other.completedAt == this.completedAt &&
          other.timeSpentSec == this.timeSpentSec &&
          other.syncStatus == this.syncStatus &&
          other.createdAt == this.createdAt);
}

class LocalSessionsCompanion extends UpdateCompanion<LocalSession> {
  final Value<String> id;
  final Value<String> studentId;
  final Value<String> categoryId;
  final Value<String> schoolId;
  final Value<String?> levelId;
  final Value<String> phase;
  final Value<String> status;
  final Value<int> attemptNumber;
  final Value<int> currentQuestionIndex;
  final Value<DateTime?> startedAt;
  final Value<DateTime?> completedAt;
  final Value<int?> timeSpentSec;
  final Value<String> syncStatus;
  final Value<DateTime> createdAt;
  final Value<int> rowid;
  const LocalSessionsCompanion({
    this.id = const Value.absent(),
    this.studentId = const Value.absent(),
    this.categoryId = const Value.absent(),
    this.schoolId = const Value.absent(),
    this.levelId = const Value.absent(),
    this.phase = const Value.absent(),
    this.status = const Value.absent(),
    this.attemptNumber = const Value.absent(),
    this.currentQuestionIndex = const Value.absent(),
    this.startedAt = const Value.absent(),
    this.completedAt = const Value.absent(),
    this.timeSpentSec = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalSessionsCompanion.insert({
    required String id,
    required String studentId,
    required String categoryId,
    required String schoolId,
    this.levelId = const Value.absent(),
    this.phase = const Value.absent(),
    this.status = const Value.absent(),
    this.attemptNumber = const Value.absent(),
    this.currentQuestionIndex = const Value.absent(),
    this.startedAt = const Value.absent(),
    this.completedAt = const Value.absent(),
    this.timeSpentSec = const Value.absent(),
    this.syncStatus = const Value.absent(),
    required DateTime createdAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       studentId = Value(studentId),
       categoryId = Value(categoryId),
       schoolId = Value(schoolId),
       createdAt = Value(createdAt);
  static Insertable<LocalSession> custom({
    Expression<String>? id,
    Expression<String>? studentId,
    Expression<String>? categoryId,
    Expression<String>? schoolId,
    Expression<String>? levelId,
    Expression<String>? phase,
    Expression<String>? status,
    Expression<int>? attemptNumber,
    Expression<int>? currentQuestionIndex,
    Expression<DateTime>? startedAt,
    Expression<DateTime>? completedAt,
    Expression<int>? timeSpentSec,
    Expression<String>? syncStatus,
    Expression<DateTime>? createdAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (studentId != null) 'student_id': studentId,
      if (categoryId != null) 'category_id': categoryId,
      if (schoolId != null) 'school_id': schoolId,
      if (levelId != null) 'level_id': levelId,
      if (phase != null) 'phase': phase,
      if (status != null) 'status': status,
      if (attemptNumber != null) 'attempt_number': attemptNumber,
      if (currentQuestionIndex != null)
        'current_question_index': currentQuestionIndex,
      if (startedAt != null) 'started_at': startedAt,
      if (completedAt != null) 'completed_at': completedAt,
      if (timeSpentSec != null) 'time_spent_sec': timeSpentSec,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (createdAt != null) 'created_at': createdAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalSessionsCompanion copyWith({
    Value<String>? id,
    Value<String>? studentId,
    Value<String>? categoryId,
    Value<String>? schoolId,
    Value<String?>? levelId,
    Value<String>? phase,
    Value<String>? status,
    Value<int>? attemptNumber,
    Value<int>? currentQuestionIndex,
    Value<DateTime?>? startedAt,
    Value<DateTime?>? completedAt,
    Value<int?>? timeSpentSec,
    Value<String>? syncStatus,
    Value<DateTime>? createdAt,
    Value<int>? rowid,
  }) {
    return LocalSessionsCompanion(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      categoryId: categoryId ?? this.categoryId,
      schoolId: schoolId ?? this.schoolId,
      levelId: levelId ?? this.levelId,
      phase: phase ?? this.phase,
      status: status ?? this.status,
      attemptNumber: attemptNumber ?? this.attemptNumber,
      currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      timeSpentSec: timeSpentSec ?? this.timeSpentSec,
      syncStatus: syncStatus ?? this.syncStatus,
      createdAt: createdAt ?? this.createdAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (studentId.present) {
      map['student_id'] = Variable<String>(studentId.value);
    }
    if (categoryId.present) {
      map['category_id'] = Variable<String>(categoryId.value);
    }
    if (schoolId.present) {
      map['school_id'] = Variable<String>(schoolId.value);
    }
    if (levelId.present) {
      map['level_id'] = Variable<String>(levelId.value);
    }
    if (phase.present) {
      map['phase'] = Variable<String>(phase.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (attemptNumber.present) {
      map['attempt_number'] = Variable<int>(attemptNumber.value);
    }
    if (currentQuestionIndex.present) {
      map['current_question_index'] = Variable<int>(currentQuestionIndex.value);
    }
    if (startedAt.present) {
      map['started_at'] = Variable<DateTime>(startedAt.value);
    }
    if (completedAt.present) {
      map['completed_at'] = Variable<DateTime>(completedAt.value);
    }
    if (timeSpentSec.present) {
      map['time_spent_sec'] = Variable<int>(timeSpentSec.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalSessionsCompanion(')
          ..write('id: $id, ')
          ..write('studentId: $studentId, ')
          ..write('categoryId: $categoryId, ')
          ..write('schoolId: $schoolId, ')
          ..write('levelId: $levelId, ')
          ..write('phase: $phase, ')
          ..write('status: $status, ')
          ..write('attemptNumber: $attemptNumber, ')
          ..write('currentQuestionIndex: $currentQuestionIndex, ')
          ..write('startedAt: $startedAt, ')
          ..write('completedAt: $completedAt, ')
          ..write('timeSpentSec: $timeSpentSec, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('createdAt: $createdAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalAnswersTable extends LocalAnswers
    with TableInfo<$LocalAnswersTable, LocalAnswer> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalAnswersTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sessionIdMeta = const VerificationMeta(
    'sessionId',
  );
  @override
  late final GeneratedColumn<String> sessionId = GeneratedColumn<String>(
    'session_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _questionIdMeta = const VerificationMeta(
    'questionId',
  );
  @override
  late final GeneratedColumn<String> questionId = GeneratedColumn<String>(
    'question_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _answerDataMeta = const VerificationMeta(
    'answerData',
  );
  @override
  late final GeneratedColumn<String> answerData = GeneratedColumn<String>(
    'answer_data',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _recordingLocalPathMeta =
      const VerificationMeta('recordingLocalPath');
  @override
  late final GeneratedColumn<String> recordingLocalPath =
      GeneratedColumn<String>(
        'recording_local_path',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _recordingUrlMeta = const VerificationMeta(
    'recordingUrl',
  );
  @override
  late final GeneratedColumn<String> recordingUrl = GeneratedColumn<String>(
    'recording_url',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _isCorrectMeta = const VerificationMeta(
    'isCorrect',
  );
  @override
  late final GeneratedColumn<bool> isCorrect = GeneratedColumn<bool>(
    'is_correct',
    aliasedName,
    true,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("is_correct" IN (0, 1))',
    ),
  );
  static const VerificationMeta _scoreMeta = const VerificationMeta('score');
  @override
  late final GeneratedColumn<double> score = GeneratedColumn<double>(
    'score',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _timeSpentSecMeta = const VerificationMeta(
    'timeSpentSec',
  );
  @override
  late final GeneratedColumn<int> timeSpentSec = GeneratedColumn<int>(
    'time_spent_sec',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('answered'),
  );
  static const VerificationMeta _syncStatusMeta = const VerificationMeta(
    'syncStatus',
  );
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
    'sync_status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _failReasonMeta = const VerificationMeta(
    'failReason',
  );
  @override
  late final GeneratedColumn<String> failReason = GeneratedColumn<String>(
    'fail_reason',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _questionVersionMeta = const VerificationMeta(
    'questionVersion',
  );
  @override
  late final GeneratedColumn<String> questionVersion = GeneratedColumn<String>(
    'question_version',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _answeredAtMeta = const VerificationMeta(
    'answeredAt',
  );
  @override
  late final GeneratedColumn<DateTime> answeredAt = GeneratedColumn<DateTime>(
    'answered_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    sessionId,
    questionId,
    answerData,
    recordingLocalPath,
    recordingUrl,
    isCorrect,
    score,
    timeSpentSec,
    status,
    syncStatus,
    failReason,
    questionVersion,
    answeredAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_answers';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalAnswer> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('session_id')) {
      context.handle(
        _sessionIdMeta,
        sessionId.isAcceptableOrUnknown(data['session_id']!, _sessionIdMeta),
      );
    } else if (isInserting) {
      context.missing(_sessionIdMeta);
    }
    if (data.containsKey('question_id')) {
      context.handle(
        _questionIdMeta,
        questionId.isAcceptableOrUnknown(data['question_id']!, _questionIdMeta),
      );
    } else if (isInserting) {
      context.missing(_questionIdMeta);
    }
    if (data.containsKey('answer_data')) {
      context.handle(
        _answerDataMeta,
        answerData.isAcceptableOrUnknown(data['answer_data']!, _answerDataMeta),
      );
    } else if (isInserting) {
      context.missing(_answerDataMeta);
    }
    if (data.containsKey('recording_local_path')) {
      context.handle(
        _recordingLocalPathMeta,
        recordingLocalPath.isAcceptableOrUnknown(
          data['recording_local_path']!,
          _recordingLocalPathMeta,
        ),
      );
    }
    if (data.containsKey('recording_url')) {
      context.handle(
        _recordingUrlMeta,
        recordingUrl.isAcceptableOrUnknown(
          data['recording_url']!,
          _recordingUrlMeta,
        ),
      );
    }
    if (data.containsKey('is_correct')) {
      context.handle(
        _isCorrectMeta,
        isCorrect.isAcceptableOrUnknown(data['is_correct']!, _isCorrectMeta),
      );
    }
    if (data.containsKey('score')) {
      context.handle(
        _scoreMeta,
        score.isAcceptableOrUnknown(data['score']!, _scoreMeta),
      );
    }
    if (data.containsKey('time_spent_sec')) {
      context.handle(
        _timeSpentSecMeta,
        timeSpentSec.isAcceptableOrUnknown(
          data['time_spent_sec']!,
          _timeSpentSecMeta,
        ),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('sync_status')) {
      context.handle(
        _syncStatusMeta,
        syncStatus.isAcceptableOrUnknown(data['sync_status']!, _syncStatusMeta),
      );
    }
    if (data.containsKey('fail_reason')) {
      context.handle(
        _failReasonMeta,
        failReason.isAcceptableOrUnknown(data['fail_reason']!, _failReasonMeta),
      );
    }
    if (data.containsKey('question_version')) {
      context.handle(
        _questionVersionMeta,
        questionVersion.isAcceptableOrUnknown(
          data['question_version']!,
          _questionVersionMeta,
        ),
      );
    }
    if (data.containsKey('answered_at')) {
      context.handle(
        _answeredAtMeta,
        answeredAt.isAcceptableOrUnknown(data['answered_at']!, _answeredAtMeta),
      );
    } else if (isInserting) {
      context.missing(_answeredAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalAnswer map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalAnswer(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      sessionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}session_id'],
      )!,
      questionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}question_id'],
      )!,
      answerData: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}answer_data'],
      )!,
      recordingLocalPath: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}recording_local_path'],
      ),
      recordingUrl: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}recording_url'],
      ),
      isCorrect: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}is_correct'],
      ),
      score: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}score'],
      ),
      timeSpentSec: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}time_spent_sec'],
      ),
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      syncStatus: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sync_status'],
      )!,
      failReason: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}fail_reason'],
      ),
      questionVersion: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}question_version'],
      ),
      answeredAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}answered_at'],
      )!,
    );
  }

  @override
  $LocalAnswersTable createAlias(String alias) {
    return $LocalAnswersTable(attachedDatabase, alias);
  }
}

class LocalAnswer extends DataClass implements Insertable<LocalAnswer> {
  final String id;
  final String sessionId;
  final String questionId;
  final String answerData;
  final String? recordingLocalPath;
  final String? recordingUrl;
  final bool? isCorrect;
  final double? score;
  final int? timeSpentSec;
  final String status;
  final String syncStatus;
  final String? failReason;
  final String? questionVersion;
  final DateTime answeredAt;
  const LocalAnswer({
    required this.id,
    required this.sessionId,
    required this.questionId,
    required this.answerData,
    this.recordingLocalPath,
    this.recordingUrl,
    this.isCorrect,
    this.score,
    this.timeSpentSec,
    required this.status,
    required this.syncStatus,
    this.failReason,
    this.questionVersion,
    required this.answeredAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['session_id'] = Variable<String>(sessionId);
    map['question_id'] = Variable<String>(questionId);
    map['answer_data'] = Variable<String>(answerData);
    if (!nullToAbsent || recordingLocalPath != null) {
      map['recording_local_path'] = Variable<String>(recordingLocalPath);
    }
    if (!nullToAbsent || recordingUrl != null) {
      map['recording_url'] = Variable<String>(recordingUrl);
    }
    if (!nullToAbsent || isCorrect != null) {
      map['is_correct'] = Variable<bool>(isCorrect);
    }
    if (!nullToAbsent || score != null) {
      map['score'] = Variable<double>(score);
    }
    if (!nullToAbsent || timeSpentSec != null) {
      map['time_spent_sec'] = Variable<int>(timeSpentSec);
    }
    map['status'] = Variable<String>(status);
    map['sync_status'] = Variable<String>(syncStatus);
    if (!nullToAbsent || failReason != null) {
      map['fail_reason'] = Variable<String>(failReason);
    }
    if (!nullToAbsent || questionVersion != null) {
      map['question_version'] = Variable<String>(questionVersion);
    }
    map['answered_at'] = Variable<DateTime>(answeredAt);
    return map;
  }

  LocalAnswersCompanion toCompanion(bool nullToAbsent) {
    return LocalAnswersCompanion(
      id: Value(id),
      sessionId: Value(sessionId),
      questionId: Value(questionId),
      answerData: Value(answerData),
      recordingLocalPath: recordingLocalPath == null && nullToAbsent
          ? const Value.absent()
          : Value(recordingLocalPath),
      recordingUrl: recordingUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(recordingUrl),
      isCorrect: isCorrect == null && nullToAbsent
          ? const Value.absent()
          : Value(isCorrect),
      score: score == null && nullToAbsent
          ? const Value.absent()
          : Value(score),
      timeSpentSec: timeSpentSec == null && nullToAbsent
          ? const Value.absent()
          : Value(timeSpentSec),
      status: Value(status),
      syncStatus: Value(syncStatus),
      failReason: failReason == null && nullToAbsent
          ? const Value.absent()
          : Value(failReason),
      questionVersion: questionVersion == null && nullToAbsent
          ? const Value.absent()
          : Value(questionVersion),
      answeredAt: Value(answeredAt),
    );
  }

  factory LocalAnswer.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalAnswer(
      id: serializer.fromJson<String>(json['id']),
      sessionId: serializer.fromJson<String>(json['sessionId']),
      questionId: serializer.fromJson<String>(json['questionId']),
      answerData: serializer.fromJson<String>(json['answerData']),
      recordingLocalPath: serializer.fromJson<String?>(
        json['recordingLocalPath'],
      ),
      recordingUrl: serializer.fromJson<String?>(json['recordingUrl']),
      isCorrect: serializer.fromJson<bool?>(json['isCorrect']),
      score: serializer.fromJson<double?>(json['score']),
      timeSpentSec: serializer.fromJson<int?>(json['timeSpentSec']),
      status: serializer.fromJson<String>(json['status']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      failReason: serializer.fromJson<String?>(json['failReason']),
      questionVersion: serializer.fromJson<String?>(json['questionVersion']),
      answeredAt: serializer.fromJson<DateTime>(json['answeredAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'sessionId': serializer.toJson<String>(sessionId),
      'questionId': serializer.toJson<String>(questionId),
      'answerData': serializer.toJson<String>(answerData),
      'recordingLocalPath': serializer.toJson<String?>(recordingLocalPath),
      'recordingUrl': serializer.toJson<String?>(recordingUrl),
      'isCorrect': serializer.toJson<bool?>(isCorrect),
      'score': serializer.toJson<double?>(score),
      'timeSpentSec': serializer.toJson<int?>(timeSpentSec),
      'status': serializer.toJson<String>(status),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'failReason': serializer.toJson<String?>(failReason),
      'questionVersion': serializer.toJson<String?>(questionVersion),
      'answeredAt': serializer.toJson<DateTime>(answeredAt),
    };
  }

  LocalAnswer copyWith({
    String? id,
    String? sessionId,
    String? questionId,
    String? answerData,
    Value<String?> recordingLocalPath = const Value.absent(),
    Value<String?> recordingUrl = const Value.absent(),
    Value<bool?> isCorrect = const Value.absent(),
    Value<double?> score = const Value.absent(),
    Value<int?> timeSpentSec = const Value.absent(),
    String? status,
    String? syncStatus,
    Value<String?> failReason = const Value.absent(),
    Value<String?> questionVersion = const Value.absent(),
    DateTime? answeredAt,
  }) => LocalAnswer(
    id: id ?? this.id,
    sessionId: sessionId ?? this.sessionId,
    questionId: questionId ?? this.questionId,
    answerData: answerData ?? this.answerData,
    recordingLocalPath: recordingLocalPath.present
        ? recordingLocalPath.value
        : this.recordingLocalPath,
    recordingUrl: recordingUrl.present ? recordingUrl.value : this.recordingUrl,
    isCorrect: isCorrect.present ? isCorrect.value : this.isCorrect,
    score: score.present ? score.value : this.score,
    timeSpentSec: timeSpentSec.present ? timeSpentSec.value : this.timeSpentSec,
    status: status ?? this.status,
    syncStatus: syncStatus ?? this.syncStatus,
    failReason: failReason.present ? failReason.value : this.failReason,
    questionVersion: questionVersion.present
        ? questionVersion.value
        : this.questionVersion,
    answeredAt: answeredAt ?? this.answeredAt,
  );
  LocalAnswer copyWithCompanion(LocalAnswersCompanion data) {
    return LocalAnswer(
      id: data.id.present ? data.id.value : this.id,
      sessionId: data.sessionId.present ? data.sessionId.value : this.sessionId,
      questionId: data.questionId.present
          ? data.questionId.value
          : this.questionId,
      answerData: data.answerData.present
          ? data.answerData.value
          : this.answerData,
      recordingLocalPath: data.recordingLocalPath.present
          ? data.recordingLocalPath.value
          : this.recordingLocalPath,
      recordingUrl: data.recordingUrl.present
          ? data.recordingUrl.value
          : this.recordingUrl,
      isCorrect: data.isCorrect.present ? data.isCorrect.value : this.isCorrect,
      score: data.score.present ? data.score.value : this.score,
      timeSpentSec: data.timeSpentSec.present
          ? data.timeSpentSec.value
          : this.timeSpentSec,
      status: data.status.present ? data.status.value : this.status,
      syncStatus: data.syncStatus.present
          ? data.syncStatus.value
          : this.syncStatus,
      failReason: data.failReason.present
          ? data.failReason.value
          : this.failReason,
      questionVersion: data.questionVersion.present
          ? data.questionVersion.value
          : this.questionVersion,
      answeredAt: data.answeredAt.present
          ? data.answeredAt.value
          : this.answeredAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalAnswer(')
          ..write('id: $id, ')
          ..write('sessionId: $sessionId, ')
          ..write('questionId: $questionId, ')
          ..write('answerData: $answerData, ')
          ..write('recordingLocalPath: $recordingLocalPath, ')
          ..write('recordingUrl: $recordingUrl, ')
          ..write('isCorrect: $isCorrect, ')
          ..write('score: $score, ')
          ..write('timeSpentSec: $timeSpentSec, ')
          ..write('status: $status, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('failReason: $failReason, ')
          ..write('questionVersion: $questionVersion, ')
          ..write('answeredAt: $answeredAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    sessionId,
    questionId,
    answerData,
    recordingLocalPath,
    recordingUrl,
    isCorrect,
    score,
    timeSpentSec,
    status,
    syncStatus,
    failReason,
    questionVersion,
    answeredAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalAnswer &&
          other.id == this.id &&
          other.sessionId == this.sessionId &&
          other.questionId == this.questionId &&
          other.answerData == this.answerData &&
          other.recordingLocalPath == this.recordingLocalPath &&
          other.recordingUrl == this.recordingUrl &&
          other.isCorrect == this.isCorrect &&
          other.score == this.score &&
          other.timeSpentSec == this.timeSpentSec &&
          other.status == this.status &&
          other.syncStatus == this.syncStatus &&
          other.failReason == this.failReason &&
          other.questionVersion == this.questionVersion &&
          other.answeredAt == this.answeredAt);
}

class LocalAnswersCompanion extends UpdateCompanion<LocalAnswer> {
  final Value<String> id;
  final Value<String> sessionId;
  final Value<String> questionId;
  final Value<String> answerData;
  final Value<String?> recordingLocalPath;
  final Value<String?> recordingUrl;
  final Value<bool?> isCorrect;
  final Value<double?> score;
  final Value<int?> timeSpentSec;
  final Value<String> status;
  final Value<String> syncStatus;
  final Value<String?> failReason;
  final Value<String?> questionVersion;
  final Value<DateTime> answeredAt;
  final Value<int> rowid;
  const LocalAnswersCompanion({
    this.id = const Value.absent(),
    this.sessionId = const Value.absent(),
    this.questionId = const Value.absent(),
    this.answerData = const Value.absent(),
    this.recordingLocalPath = const Value.absent(),
    this.recordingUrl = const Value.absent(),
    this.isCorrect = const Value.absent(),
    this.score = const Value.absent(),
    this.timeSpentSec = const Value.absent(),
    this.status = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.failReason = const Value.absent(),
    this.questionVersion = const Value.absent(),
    this.answeredAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalAnswersCompanion.insert({
    required String id,
    required String sessionId,
    required String questionId,
    required String answerData,
    this.recordingLocalPath = const Value.absent(),
    this.recordingUrl = const Value.absent(),
    this.isCorrect = const Value.absent(),
    this.score = const Value.absent(),
    this.timeSpentSec = const Value.absent(),
    this.status = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.failReason = const Value.absent(),
    this.questionVersion = const Value.absent(),
    required DateTime answeredAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       sessionId = Value(sessionId),
       questionId = Value(questionId),
       answerData = Value(answerData),
       answeredAt = Value(answeredAt);
  static Insertable<LocalAnswer> custom({
    Expression<String>? id,
    Expression<String>? sessionId,
    Expression<String>? questionId,
    Expression<String>? answerData,
    Expression<String>? recordingLocalPath,
    Expression<String>? recordingUrl,
    Expression<bool>? isCorrect,
    Expression<double>? score,
    Expression<int>? timeSpentSec,
    Expression<String>? status,
    Expression<String>? syncStatus,
    Expression<String>? failReason,
    Expression<String>? questionVersion,
    Expression<DateTime>? answeredAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (sessionId != null) 'session_id': sessionId,
      if (questionId != null) 'question_id': questionId,
      if (answerData != null) 'answer_data': answerData,
      if (recordingLocalPath != null)
        'recording_local_path': recordingLocalPath,
      if (recordingUrl != null) 'recording_url': recordingUrl,
      if (isCorrect != null) 'is_correct': isCorrect,
      if (score != null) 'score': score,
      if (timeSpentSec != null) 'time_spent_sec': timeSpentSec,
      if (status != null) 'status': status,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (failReason != null) 'fail_reason': failReason,
      if (questionVersion != null) 'question_version': questionVersion,
      if (answeredAt != null) 'answered_at': answeredAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalAnswersCompanion copyWith({
    Value<String>? id,
    Value<String>? sessionId,
    Value<String>? questionId,
    Value<String>? answerData,
    Value<String?>? recordingLocalPath,
    Value<String?>? recordingUrl,
    Value<bool?>? isCorrect,
    Value<double?>? score,
    Value<int?>? timeSpentSec,
    Value<String>? status,
    Value<String>? syncStatus,
    Value<String?>? failReason,
    Value<String?>? questionVersion,
    Value<DateTime>? answeredAt,
    Value<int>? rowid,
  }) {
    return LocalAnswersCompanion(
      id: id ?? this.id,
      sessionId: sessionId ?? this.sessionId,
      questionId: questionId ?? this.questionId,
      answerData: answerData ?? this.answerData,
      recordingLocalPath: recordingLocalPath ?? this.recordingLocalPath,
      recordingUrl: recordingUrl ?? this.recordingUrl,
      isCorrect: isCorrect ?? this.isCorrect,
      score: score ?? this.score,
      timeSpentSec: timeSpentSec ?? this.timeSpentSec,
      status: status ?? this.status,
      syncStatus: syncStatus ?? this.syncStatus,
      failReason: failReason ?? this.failReason,
      questionVersion: questionVersion ?? this.questionVersion,
      answeredAt: answeredAt ?? this.answeredAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (sessionId.present) {
      map['session_id'] = Variable<String>(sessionId.value);
    }
    if (questionId.present) {
      map['question_id'] = Variable<String>(questionId.value);
    }
    if (answerData.present) {
      map['answer_data'] = Variable<String>(answerData.value);
    }
    if (recordingLocalPath.present) {
      map['recording_local_path'] = Variable<String>(recordingLocalPath.value);
    }
    if (recordingUrl.present) {
      map['recording_url'] = Variable<String>(recordingUrl.value);
    }
    if (isCorrect.present) {
      map['is_correct'] = Variable<bool>(isCorrect.value);
    }
    if (score.present) {
      map['score'] = Variable<double>(score.value);
    }
    if (timeSpentSec.present) {
      map['time_spent_sec'] = Variable<int>(timeSpentSec.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (failReason.present) {
      map['fail_reason'] = Variable<String>(failReason.value);
    }
    if (questionVersion.present) {
      map['question_version'] = Variable<String>(questionVersion.value);
    }
    if (answeredAt.present) {
      map['answered_at'] = Variable<DateTime>(answeredAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalAnswersCompanion(')
          ..write('id: $id, ')
          ..write('sessionId: $sessionId, ')
          ..write('questionId: $questionId, ')
          ..write('answerData: $answerData, ')
          ..write('recordingLocalPath: $recordingLocalPath, ')
          ..write('recordingUrl: $recordingUrl, ')
          ..write('isCorrect: $isCorrect, ')
          ..write('score: $score, ')
          ..write('timeSpentSec: $timeSpentSec, ')
          ..write('status: $status, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('failReason: $failReason, ')
          ..write('questionVersion: $questionVersion, ')
          ..write('answeredAt: $answeredAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $LocalCategoriesTable localCategories = $LocalCategoriesTable(
    this,
  );
  late final $LocalLevelsTable localLevels = $LocalLevelsTable(this);
  late final $LocalQuestionsTable localQuestions = $LocalQuestionsTable(this);
  late final $LocalSessionsTable localSessions = $LocalSessionsTable(this);
  late final $LocalAnswersTable localAnswers = $LocalAnswersTable(this);
  late final CategoryDao categoryDao = CategoryDao(this as AppDatabase);
  late final LevelDao levelDao = LevelDao(this as AppDatabase);
  late final QuestionDao questionDao = QuestionDao(this as AppDatabase);
  late final SessionDao sessionDao = SessionDao(this as AppDatabase);
  late final AnswerDao answerDao = AnswerDao(this as AppDatabase);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    localCategories,
    localLevels,
    localQuestions,
    localSessions,
    localAnswers,
  ];
}

typedef $$LocalCategoriesTableCreateCompanionBuilder =
    LocalCategoriesCompanion Function({
      required String id,
      required String name,
      required String subjectArea,
      Value<String> phase,
      Value<DateTime?> validFrom,
      Value<DateTime?> validUntil,
      Value<int> rowid,
    });
typedef $$LocalCategoriesTableUpdateCompanionBuilder =
    LocalCategoriesCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String> subjectArea,
      Value<String> phase,
      Value<DateTime?> validFrom,
      Value<DateTime?> validUntil,
      Value<int> rowid,
    });

class $$LocalCategoriesTableFilterComposer
    extends Composer<_$AppDatabase, $LocalCategoriesTable> {
  $$LocalCategoriesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get subjectArea => $composableBuilder(
    column: $table.subjectArea,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get phase => $composableBuilder(
    column: $table.phase,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get validFrom => $composableBuilder(
    column: $table.validFrom,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get validUntil => $composableBuilder(
    column: $table.validUntil,
    builder: (column) => ColumnFilters(column),
  );
}

class $$LocalCategoriesTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalCategoriesTable> {
  $$LocalCategoriesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get subjectArea => $composableBuilder(
    column: $table.subjectArea,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get phase => $composableBuilder(
    column: $table.phase,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get validFrom => $composableBuilder(
    column: $table.validFrom,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get validUntil => $composableBuilder(
    column: $table.validUntil,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalCategoriesTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalCategoriesTable> {
  $$LocalCategoriesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get subjectArea => $composableBuilder(
    column: $table.subjectArea,
    builder: (column) => column,
  );

  GeneratedColumn<String> get phase =>
      $composableBuilder(column: $table.phase, builder: (column) => column);

  GeneratedColumn<DateTime> get validFrom =>
      $composableBuilder(column: $table.validFrom, builder: (column) => column);

  GeneratedColumn<DateTime> get validUntil => $composableBuilder(
    column: $table.validUntil,
    builder: (column) => column,
  );
}

class $$LocalCategoriesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalCategoriesTable,
          LocalCategory,
          $$LocalCategoriesTableFilterComposer,
          $$LocalCategoriesTableOrderingComposer,
          $$LocalCategoriesTableAnnotationComposer,
          $$LocalCategoriesTableCreateCompanionBuilder,
          $$LocalCategoriesTableUpdateCompanionBuilder,
          (
            LocalCategory,
            BaseReferences<_$AppDatabase, $LocalCategoriesTable, LocalCategory>,
          ),
          LocalCategory,
          PrefetchHooks Function()
        > {
  $$LocalCategoriesTableTableManager(
    _$AppDatabase db,
    $LocalCategoriesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalCategoriesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalCategoriesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalCategoriesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String> subjectArea = const Value.absent(),
                Value<String> phase = const Value.absent(),
                Value<DateTime?> validFrom = const Value.absent(),
                Value<DateTime?> validUntil = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalCategoriesCompanion(
                id: id,
                name: name,
                subjectArea: subjectArea,
                phase: phase,
                validFrom: validFrom,
                validUntil: validUntil,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                required String subjectArea,
                Value<String> phase = const Value.absent(),
                Value<DateTime?> validFrom = const Value.absent(),
                Value<DateTime?> validUntil = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalCategoriesCompanion.insert(
                id: id,
                name: name,
                subjectArea: subjectArea,
                phase: phase,
                validFrom: validFrom,
                validUntil: validUntil,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$LocalCategoriesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalCategoriesTable,
      LocalCategory,
      $$LocalCategoriesTableFilterComposer,
      $$LocalCategoriesTableOrderingComposer,
      $$LocalCategoriesTableAnnotationComposer,
      $$LocalCategoriesTableCreateCompanionBuilder,
      $$LocalCategoriesTableUpdateCompanionBuilder,
      (
        LocalCategory,
        BaseReferences<_$AppDatabase, $LocalCategoriesTable, LocalCategory>,
      ),
      LocalCategory,
      PrefetchHooks Function()
    >;
typedef $$LocalLevelsTableCreateCompanionBuilder =
    LocalLevelsCompanion Function({
      required String id,
      required String categoryId,
      required int levelNumber,
      Value<int?> timeLimitSec,
      Value<int> passingThreshold,
      Value<String?> accessCode,
      Value<int> rowid,
    });
typedef $$LocalLevelsTableUpdateCompanionBuilder =
    LocalLevelsCompanion Function({
      Value<String> id,
      Value<String> categoryId,
      Value<int> levelNumber,
      Value<int?> timeLimitSec,
      Value<int> passingThreshold,
      Value<String?> accessCode,
      Value<int> rowid,
    });

class $$LocalLevelsTableFilterComposer
    extends Composer<_$AppDatabase, $LocalLevelsTable> {
  $$LocalLevelsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get categoryId => $composableBuilder(
    column: $table.categoryId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get levelNumber => $composableBuilder(
    column: $table.levelNumber,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get timeLimitSec => $composableBuilder(
    column: $table.timeLimitSec,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get passingThreshold => $composableBuilder(
    column: $table.passingThreshold,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get accessCode => $composableBuilder(
    column: $table.accessCode,
    builder: (column) => ColumnFilters(column),
  );
}

class $$LocalLevelsTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalLevelsTable> {
  $$LocalLevelsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get categoryId => $composableBuilder(
    column: $table.categoryId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get levelNumber => $composableBuilder(
    column: $table.levelNumber,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get timeLimitSec => $composableBuilder(
    column: $table.timeLimitSec,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get passingThreshold => $composableBuilder(
    column: $table.passingThreshold,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get accessCode => $composableBuilder(
    column: $table.accessCode,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalLevelsTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalLevelsTable> {
  $$LocalLevelsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get categoryId => $composableBuilder(
    column: $table.categoryId,
    builder: (column) => column,
  );

  GeneratedColumn<int> get levelNumber => $composableBuilder(
    column: $table.levelNumber,
    builder: (column) => column,
  );

  GeneratedColumn<int> get timeLimitSec => $composableBuilder(
    column: $table.timeLimitSec,
    builder: (column) => column,
  );

  GeneratedColumn<int> get passingThreshold => $composableBuilder(
    column: $table.passingThreshold,
    builder: (column) => column,
  );

  GeneratedColumn<String> get accessCode => $composableBuilder(
    column: $table.accessCode,
    builder: (column) => column,
  );
}

class $$LocalLevelsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalLevelsTable,
          LocalLevel,
          $$LocalLevelsTableFilterComposer,
          $$LocalLevelsTableOrderingComposer,
          $$LocalLevelsTableAnnotationComposer,
          $$LocalLevelsTableCreateCompanionBuilder,
          $$LocalLevelsTableUpdateCompanionBuilder,
          (
            LocalLevel,
            BaseReferences<_$AppDatabase, $LocalLevelsTable, LocalLevel>,
          ),
          LocalLevel,
          PrefetchHooks Function()
        > {
  $$LocalLevelsTableTableManager(_$AppDatabase db, $LocalLevelsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalLevelsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalLevelsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalLevelsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> categoryId = const Value.absent(),
                Value<int> levelNumber = const Value.absent(),
                Value<int?> timeLimitSec = const Value.absent(),
                Value<int> passingThreshold = const Value.absent(),
                Value<String?> accessCode = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalLevelsCompanion(
                id: id,
                categoryId: categoryId,
                levelNumber: levelNumber,
                timeLimitSec: timeLimitSec,
                passingThreshold: passingThreshold,
                accessCode: accessCode,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String categoryId,
                required int levelNumber,
                Value<int?> timeLimitSec = const Value.absent(),
                Value<int> passingThreshold = const Value.absent(),
                Value<String?> accessCode = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalLevelsCompanion.insert(
                id: id,
                categoryId: categoryId,
                levelNumber: levelNumber,
                timeLimitSec: timeLimitSec,
                passingThreshold: passingThreshold,
                accessCode: accessCode,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$LocalLevelsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalLevelsTable,
      LocalLevel,
      $$LocalLevelsTableFilterComposer,
      $$LocalLevelsTableOrderingComposer,
      $$LocalLevelsTableAnnotationComposer,
      $$LocalLevelsTableCreateCompanionBuilder,
      $$LocalLevelsTableUpdateCompanionBuilder,
      (
        LocalLevel,
        BaseReferences<_$AppDatabase, $LocalLevelsTable, LocalLevel>,
      ),
      LocalLevel,
      PrefetchHooks Function()
    >;
typedef $$LocalQuestionsTableCreateCompanionBuilder =
    LocalQuestionsCompanion Function({
      required String id,
      required String levelId,
      required String categoryId,
      required String subjectArea,
      required String questionType,
      Value<String?> questionText,
      Value<String?> questionAudioUrl,
      Value<String?> questionVideoUrl,
      Value<String?> questionImageUrl,
      Value<String?> optionsJson,
      required String correctAnswerJson,
      Value<int> version,
      Value<int> orderIndex,
      Value<int?> timeLimitSec,
      required DateTime cachedAt,
      Value<int> rowid,
    });
typedef $$LocalQuestionsTableUpdateCompanionBuilder =
    LocalQuestionsCompanion Function({
      Value<String> id,
      Value<String> levelId,
      Value<String> categoryId,
      Value<String> subjectArea,
      Value<String> questionType,
      Value<String?> questionText,
      Value<String?> questionAudioUrl,
      Value<String?> questionVideoUrl,
      Value<String?> questionImageUrl,
      Value<String?> optionsJson,
      Value<String> correctAnswerJson,
      Value<int> version,
      Value<int> orderIndex,
      Value<int?> timeLimitSec,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$LocalQuestionsTableFilterComposer
    extends Composer<_$AppDatabase, $LocalQuestionsTable> {
  $$LocalQuestionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get levelId => $composableBuilder(
    column: $table.levelId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get categoryId => $composableBuilder(
    column: $table.categoryId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get subjectArea => $composableBuilder(
    column: $table.subjectArea,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get questionType => $composableBuilder(
    column: $table.questionType,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get questionText => $composableBuilder(
    column: $table.questionText,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get questionAudioUrl => $composableBuilder(
    column: $table.questionAudioUrl,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get questionVideoUrl => $composableBuilder(
    column: $table.questionVideoUrl,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get questionImageUrl => $composableBuilder(
    column: $table.questionImageUrl,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get optionsJson => $composableBuilder(
    column: $table.optionsJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get correctAnswerJson => $composableBuilder(
    column: $table.correctAnswerJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get version => $composableBuilder(
    column: $table.version,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get orderIndex => $composableBuilder(
    column: $table.orderIndex,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get timeLimitSec => $composableBuilder(
    column: $table.timeLimitSec,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$LocalQuestionsTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalQuestionsTable> {
  $$LocalQuestionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get levelId => $composableBuilder(
    column: $table.levelId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get categoryId => $composableBuilder(
    column: $table.categoryId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get subjectArea => $composableBuilder(
    column: $table.subjectArea,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get questionType => $composableBuilder(
    column: $table.questionType,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get questionText => $composableBuilder(
    column: $table.questionText,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get questionAudioUrl => $composableBuilder(
    column: $table.questionAudioUrl,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get questionVideoUrl => $composableBuilder(
    column: $table.questionVideoUrl,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get questionImageUrl => $composableBuilder(
    column: $table.questionImageUrl,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get optionsJson => $composableBuilder(
    column: $table.optionsJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get correctAnswerJson => $composableBuilder(
    column: $table.correctAnswerJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get version => $composableBuilder(
    column: $table.version,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get orderIndex => $composableBuilder(
    column: $table.orderIndex,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get timeLimitSec => $composableBuilder(
    column: $table.timeLimitSec,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalQuestionsTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalQuestionsTable> {
  $$LocalQuestionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get levelId =>
      $composableBuilder(column: $table.levelId, builder: (column) => column);

  GeneratedColumn<String> get categoryId => $composableBuilder(
    column: $table.categoryId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get subjectArea => $composableBuilder(
    column: $table.subjectArea,
    builder: (column) => column,
  );

  GeneratedColumn<String> get questionType => $composableBuilder(
    column: $table.questionType,
    builder: (column) => column,
  );

  GeneratedColumn<String> get questionText => $composableBuilder(
    column: $table.questionText,
    builder: (column) => column,
  );

  GeneratedColumn<String> get questionAudioUrl => $composableBuilder(
    column: $table.questionAudioUrl,
    builder: (column) => column,
  );

  GeneratedColumn<String> get questionVideoUrl => $composableBuilder(
    column: $table.questionVideoUrl,
    builder: (column) => column,
  );

  GeneratedColumn<String> get questionImageUrl => $composableBuilder(
    column: $table.questionImageUrl,
    builder: (column) => column,
  );

  GeneratedColumn<String> get optionsJson => $composableBuilder(
    column: $table.optionsJson,
    builder: (column) => column,
  );

  GeneratedColumn<String> get correctAnswerJson => $composableBuilder(
    column: $table.correctAnswerJson,
    builder: (column) => column,
  );

  GeneratedColumn<int> get version =>
      $composableBuilder(column: $table.version, builder: (column) => column);

  GeneratedColumn<int> get orderIndex => $composableBuilder(
    column: $table.orderIndex,
    builder: (column) => column,
  );

  GeneratedColumn<int> get timeLimitSec => $composableBuilder(
    column: $table.timeLimitSec,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$LocalQuestionsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalQuestionsTable,
          LocalQuestion,
          $$LocalQuestionsTableFilterComposer,
          $$LocalQuestionsTableOrderingComposer,
          $$LocalQuestionsTableAnnotationComposer,
          $$LocalQuestionsTableCreateCompanionBuilder,
          $$LocalQuestionsTableUpdateCompanionBuilder,
          (
            LocalQuestion,
            BaseReferences<_$AppDatabase, $LocalQuestionsTable, LocalQuestion>,
          ),
          LocalQuestion,
          PrefetchHooks Function()
        > {
  $$LocalQuestionsTableTableManager(
    _$AppDatabase db,
    $LocalQuestionsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalQuestionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalQuestionsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalQuestionsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> levelId = const Value.absent(),
                Value<String> categoryId = const Value.absent(),
                Value<String> subjectArea = const Value.absent(),
                Value<String> questionType = const Value.absent(),
                Value<String?> questionText = const Value.absent(),
                Value<String?> questionAudioUrl = const Value.absent(),
                Value<String?> questionVideoUrl = const Value.absent(),
                Value<String?> questionImageUrl = const Value.absent(),
                Value<String?> optionsJson = const Value.absent(),
                Value<String> correctAnswerJson = const Value.absent(),
                Value<int> version = const Value.absent(),
                Value<int> orderIndex = const Value.absent(),
                Value<int?> timeLimitSec = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalQuestionsCompanion(
                id: id,
                levelId: levelId,
                categoryId: categoryId,
                subjectArea: subjectArea,
                questionType: questionType,
                questionText: questionText,
                questionAudioUrl: questionAudioUrl,
                questionVideoUrl: questionVideoUrl,
                questionImageUrl: questionImageUrl,
                optionsJson: optionsJson,
                correctAnswerJson: correctAnswerJson,
                version: version,
                orderIndex: orderIndex,
                timeLimitSec: timeLimitSec,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String levelId,
                required String categoryId,
                required String subjectArea,
                required String questionType,
                Value<String?> questionText = const Value.absent(),
                Value<String?> questionAudioUrl = const Value.absent(),
                Value<String?> questionVideoUrl = const Value.absent(),
                Value<String?> questionImageUrl = const Value.absent(),
                Value<String?> optionsJson = const Value.absent(),
                required String correctAnswerJson,
                Value<int> version = const Value.absent(),
                Value<int> orderIndex = const Value.absent(),
                Value<int?> timeLimitSec = const Value.absent(),
                required DateTime cachedAt,
                Value<int> rowid = const Value.absent(),
              }) => LocalQuestionsCompanion.insert(
                id: id,
                levelId: levelId,
                categoryId: categoryId,
                subjectArea: subjectArea,
                questionType: questionType,
                questionText: questionText,
                questionAudioUrl: questionAudioUrl,
                questionVideoUrl: questionVideoUrl,
                questionImageUrl: questionImageUrl,
                optionsJson: optionsJson,
                correctAnswerJson: correctAnswerJson,
                version: version,
                orderIndex: orderIndex,
                timeLimitSec: timeLimitSec,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$LocalQuestionsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalQuestionsTable,
      LocalQuestion,
      $$LocalQuestionsTableFilterComposer,
      $$LocalQuestionsTableOrderingComposer,
      $$LocalQuestionsTableAnnotationComposer,
      $$LocalQuestionsTableCreateCompanionBuilder,
      $$LocalQuestionsTableUpdateCompanionBuilder,
      (
        LocalQuestion,
        BaseReferences<_$AppDatabase, $LocalQuestionsTable, LocalQuestion>,
      ),
      LocalQuestion,
      PrefetchHooks Function()
    >;
typedef $$LocalSessionsTableCreateCompanionBuilder =
    LocalSessionsCompanion Function({
      required String id,
      required String studentId,
      required String categoryId,
      required String schoolId,
      Value<String?> levelId,
      Value<String> phase,
      Value<String> status,
      Value<int> attemptNumber,
      Value<int> currentQuestionIndex,
      Value<DateTime?> startedAt,
      Value<DateTime?> completedAt,
      Value<int?> timeSpentSec,
      Value<String> syncStatus,
      required DateTime createdAt,
      Value<int> rowid,
    });
typedef $$LocalSessionsTableUpdateCompanionBuilder =
    LocalSessionsCompanion Function({
      Value<String> id,
      Value<String> studentId,
      Value<String> categoryId,
      Value<String> schoolId,
      Value<String?> levelId,
      Value<String> phase,
      Value<String> status,
      Value<int> attemptNumber,
      Value<int> currentQuestionIndex,
      Value<DateTime?> startedAt,
      Value<DateTime?> completedAt,
      Value<int?> timeSpentSec,
      Value<String> syncStatus,
      Value<DateTime> createdAt,
      Value<int> rowid,
    });

class $$LocalSessionsTableFilterComposer
    extends Composer<_$AppDatabase, $LocalSessionsTable> {
  $$LocalSessionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get studentId => $composableBuilder(
    column: $table.studentId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get categoryId => $composableBuilder(
    column: $table.categoryId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get schoolId => $composableBuilder(
    column: $table.schoolId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get levelId => $composableBuilder(
    column: $table.levelId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get phase => $composableBuilder(
    column: $table.phase,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get attemptNumber => $composableBuilder(
    column: $table.attemptNumber,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get currentQuestionIndex => $composableBuilder(
    column: $table.currentQuestionIndex,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get startedAt => $composableBuilder(
    column: $table.startedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get completedAt => $composableBuilder(
    column: $table.completedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get timeSpentSec => $composableBuilder(
    column: $table.timeSpentSec,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$LocalSessionsTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalSessionsTable> {
  $$LocalSessionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get studentId => $composableBuilder(
    column: $table.studentId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get categoryId => $composableBuilder(
    column: $table.categoryId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get schoolId => $composableBuilder(
    column: $table.schoolId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get levelId => $composableBuilder(
    column: $table.levelId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get phase => $composableBuilder(
    column: $table.phase,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get attemptNumber => $composableBuilder(
    column: $table.attemptNumber,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get currentQuestionIndex => $composableBuilder(
    column: $table.currentQuestionIndex,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get startedAt => $composableBuilder(
    column: $table.startedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get completedAt => $composableBuilder(
    column: $table.completedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get timeSpentSec => $composableBuilder(
    column: $table.timeSpentSec,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalSessionsTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalSessionsTable> {
  $$LocalSessionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get studentId =>
      $composableBuilder(column: $table.studentId, builder: (column) => column);

  GeneratedColumn<String> get categoryId => $composableBuilder(
    column: $table.categoryId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get schoolId =>
      $composableBuilder(column: $table.schoolId, builder: (column) => column);

  GeneratedColumn<String> get levelId =>
      $composableBuilder(column: $table.levelId, builder: (column) => column);

  GeneratedColumn<String> get phase =>
      $composableBuilder(column: $table.phase, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get attemptNumber => $composableBuilder(
    column: $table.attemptNumber,
    builder: (column) => column,
  );

  GeneratedColumn<int> get currentQuestionIndex => $composableBuilder(
    column: $table.currentQuestionIndex,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get startedAt =>
      $composableBuilder(column: $table.startedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get completedAt => $composableBuilder(
    column: $table.completedAt,
    builder: (column) => column,
  );

  GeneratedColumn<int> get timeSpentSec => $composableBuilder(
    column: $table.timeSpentSec,
    builder: (column) => column,
  );

  GeneratedColumn<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$LocalSessionsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalSessionsTable,
          LocalSession,
          $$LocalSessionsTableFilterComposer,
          $$LocalSessionsTableOrderingComposer,
          $$LocalSessionsTableAnnotationComposer,
          $$LocalSessionsTableCreateCompanionBuilder,
          $$LocalSessionsTableUpdateCompanionBuilder,
          (
            LocalSession,
            BaseReferences<_$AppDatabase, $LocalSessionsTable, LocalSession>,
          ),
          LocalSession,
          PrefetchHooks Function()
        > {
  $$LocalSessionsTableTableManager(_$AppDatabase db, $LocalSessionsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalSessionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalSessionsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalSessionsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> studentId = const Value.absent(),
                Value<String> categoryId = const Value.absent(),
                Value<String> schoolId = const Value.absent(),
                Value<String?> levelId = const Value.absent(),
                Value<String> phase = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<int> attemptNumber = const Value.absent(),
                Value<int> currentQuestionIndex = const Value.absent(),
                Value<DateTime?> startedAt = const Value.absent(),
                Value<DateTime?> completedAt = const Value.absent(),
                Value<int?> timeSpentSec = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalSessionsCompanion(
                id: id,
                studentId: studentId,
                categoryId: categoryId,
                schoolId: schoolId,
                levelId: levelId,
                phase: phase,
                status: status,
                attemptNumber: attemptNumber,
                currentQuestionIndex: currentQuestionIndex,
                startedAt: startedAt,
                completedAt: completedAt,
                timeSpentSec: timeSpentSec,
                syncStatus: syncStatus,
                createdAt: createdAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String studentId,
                required String categoryId,
                required String schoolId,
                Value<String?> levelId = const Value.absent(),
                Value<String> phase = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<int> attemptNumber = const Value.absent(),
                Value<int> currentQuestionIndex = const Value.absent(),
                Value<DateTime?> startedAt = const Value.absent(),
                Value<DateTime?> completedAt = const Value.absent(),
                Value<int?> timeSpentSec = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                required DateTime createdAt,
                Value<int> rowid = const Value.absent(),
              }) => LocalSessionsCompanion.insert(
                id: id,
                studentId: studentId,
                categoryId: categoryId,
                schoolId: schoolId,
                levelId: levelId,
                phase: phase,
                status: status,
                attemptNumber: attemptNumber,
                currentQuestionIndex: currentQuestionIndex,
                startedAt: startedAt,
                completedAt: completedAt,
                timeSpentSec: timeSpentSec,
                syncStatus: syncStatus,
                createdAt: createdAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$LocalSessionsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalSessionsTable,
      LocalSession,
      $$LocalSessionsTableFilterComposer,
      $$LocalSessionsTableOrderingComposer,
      $$LocalSessionsTableAnnotationComposer,
      $$LocalSessionsTableCreateCompanionBuilder,
      $$LocalSessionsTableUpdateCompanionBuilder,
      (
        LocalSession,
        BaseReferences<_$AppDatabase, $LocalSessionsTable, LocalSession>,
      ),
      LocalSession,
      PrefetchHooks Function()
    >;
typedef $$LocalAnswersTableCreateCompanionBuilder =
    LocalAnswersCompanion Function({
      required String id,
      required String sessionId,
      required String questionId,
      required String answerData,
      Value<String?> recordingLocalPath,
      Value<String?> recordingUrl,
      Value<bool?> isCorrect,
      Value<double?> score,
      Value<int?> timeSpentSec,
      Value<String> status,
      Value<String> syncStatus,
      Value<String?> failReason,
      Value<String?> questionVersion,
      required DateTime answeredAt,
      Value<int> rowid,
    });
typedef $$LocalAnswersTableUpdateCompanionBuilder =
    LocalAnswersCompanion Function({
      Value<String> id,
      Value<String> sessionId,
      Value<String> questionId,
      Value<String> answerData,
      Value<String?> recordingLocalPath,
      Value<String?> recordingUrl,
      Value<bool?> isCorrect,
      Value<double?> score,
      Value<int?> timeSpentSec,
      Value<String> status,
      Value<String> syncStatus,
      Value<String?> failReason,
      Value<String?> questionVersion,
      Value<DateTime> answeredAt,
      Value<int> rowid,
    });

class $$LocalAnswersTableFilterComposer
    extends Composer<_$AppDatabase, $LocalAnswersTable> {
  $$LocalAnswersTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get sessionId => $composableBuilder(
    column: $table.sessionId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get questionId => $composableBuilder(
    column: $table.questionId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get answerData => $composableBuilder(
    column: $table.answerData,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get recordingLocalPath => $composableBuilder(
    column: $table.recordingLocalPath,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get recordingUrl => $composableBuilder(
    column: $table.recordingUrl,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get isCorrect => $composableBuilder(
    column: $table.isCorrect,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get score => $composableBuilder(
    column: $table.score,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get timeSpentSec => $composableBuilder(
    column: $table.timeSpentSec,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get failReason => $composableBuilder(
    column: $table.failReason,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get questionVersion => $composableBuilder(
    column: $table.questionVersion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get answeredAt => $composableBuilder(
    column: $table.answeredAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$LocalAnswersTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalAnswersTable> {
  $$LocalAnswersTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get sessionId => $composableBuilder(
    column: $table.sessionId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get questionId => $composableBuilder(
    column: $table.questionId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get answerData => $composableBuilder(
    column: $table.answerData,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get recordingLocalPath => $composableBuilder(
    column: $table.recordingLocalPath,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get recordingUrl => $composableBuilder(
    column: $table.recordingUrl,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get isCorrect => $composableBuilder(
    column: $table.isCorrect,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get score => $composableBuilder(
    column: $table.score,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get timeSpentSec => $composableBuilder(
    column: $table.timeSpentSec,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get failReason => $composableBuilder(
    column: $table.failReason,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get questionVersion => $composableBuilder(
    column: $table.questionVersion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get answeredAt => $composableBuilder(
    column: $table.answeredAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalAnswersTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalAnswersTable> {
  $$LocalAnswersTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get sessionId =>
      $composableBuilder(column: $table.sessionId, builder: (column) => column);

  GeneratedColumn<String> get questionId => $composableBuilder(
    column: $table.questionId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get answerData => $composableBuilder(
    column: $table.answerData,
    builder: (column) => column,
  );

  GeneratedColumn<String> get recordingLocalPath => $composableBuilder(
    column: $table.recordingLocalPath,
    builder: (column) => column,
  );

  GeneratedColumn<String> get recordingUrl => $composableBuilder(
    column: $table.recordingUrl,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get isCorrect =>
      $composableBuilder(column: $table.isCorrect, builder: (column) => column);

  GeneratedColumn<double> get score =>
      $composableBuilder(column: $table.score, builder: (column) => column);

  GeneratedColumn<int> get timeSpentSec => $composableBuilder(
    column: $table.timeSpentSec,
    builder: (column) => column,
  );

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => column,
  );

  GeneratedColumn<String> get failReason => $composableBuilder(
    column: $table.failReason,
    builder: (column) => column,
  );

  GeneratedColumn<String> get questionVersion => $composableBuilder(
    column: $table.questionVersion,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get answeredAt => $composableBuilder(
    column: $table.answeredAt,
    builder: (column) => column,
  );
}

class $$LocalAnswersTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalAnswersTable,
          LocalAnswer,
          $$LocalAnswersTableFilterComposer,
          $$LocalAnswersTableOrderingComposer,
          $$LocalAnswersTableAnnotationComposer,
          $$LocalAnswersTableCreateCompanionBuilder,
          $$LocalAnswersTableUpdateCompanionBuilder,
          (
            LocalAnswer,
            BaseReferences<_$AppDatabase, $LocalAnswersTable, LocalAnswer>,
          ),
          LocalAnswer,
          PrefetchHooks Function()
        > {
  $$LocalAnswersTableTableManager(_$AppDatabase db, $LocalAnswersTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalAnswersTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalAnswersTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalAnswersTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> sessionId = const Value.absent(),
                Value<String> questionId = const Value.absent(),
                Value<String> answerData = const Value.absent(),
                Value<String?> recordingLocalPath = const Value.absent(),
                Value<String?> recordingUrl = const Value.absent(),
                Value<bool?> isCorrect = const Value.absent(),
                Value<double?> score = const Value.absent(),
                Value<int?> timeSpentSec = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<String?> failReason = const Value.absent(),
                Value<String?> questionVersion = const Value.absent(),
                Value<DateTime> answeredAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalAnswersCompanion(
                id: id,
                sessionId: sessionId,
                questionId: questionId,
                answerData: answerData,
                recordingLocalPath: recordingLocalPath,
                recordingUrl: recordingUrl,
                isCorrect: isCorrect,
                score: score,
                timeSpentSec: timeSpentSec,
                status: status,
                syncStatus: syncStatus,
                failReason: failReason,
                questionVersion: questionVersion,
                answeredAt: answeredAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String sessionId,
                required String questionId,
                required String answerData,
                Value<String?> recordingLocalPath = const Value.absent(),
                Value<String?> recordingUrl = const Value.absent(),
                Value<bool?> isCorrect = const Value.absent(),
                Value<double?> score = const Value.absent(),
                Value<int?> timeSpentSec = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<String?> failReason = const Value.absent(),
                Value<String?> questionVersion = const Value.absent(),
                required DateTime answeredAt,
                Value<int> rowid = const Value.absent(),
              }) => LocalAnswersCompanion.insert(
                id: id,
                sessionId: sessionId,
                questionId: questionId,
                answerData: answerData,
                recordingLocalPath: recordingLocalPath,
                recordingUrl: recordingUrl,
                isCorrect: isCorrect,
                score: score,
                timeSpentSec: timeSpentSec,
                status: status,
                syncStatus: syncStatus,
                failReason: failReason,
                questionVersion: questionVersion,
                answeredAt: answeredAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$LocalAnswersTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalAnswersTable,
      LocalAnswer,
      $$LocalAnswersTableFilterComposer,
      $$LocalAnswersTableOrderingComposer,
      $$LocalAnswersTableAnnotationComposer,
      $$LocalAnswersTableCreateCompanionBuilder,
      $$LocalAnswersTableUpdateCompanionBuilder,
      (
        LocalAnswer,
        BaseReferences<_$AppDatabase, $LocalAnswersTable, LocalAnswer>,
      ),
      LocalAnswer,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$LocalCategoriesTableTableManager get localCategories =>
      $$LocalCategoriesTableTableManager(_db, _db.localCategories);
  $$LocalLevelsTableTableManager get localLevels =>
      $$LocalLevelsTableTableManager(_db, _db.localLevels);
  $$LocalQuestionsTableTableManager get localQuestions =>
      $$LocalQuestionsTableTableManager(_db, _db.localQuestions);
  $$LocalSessionsTableTableManager get localSessions =>
      $$LocalSessionsTableTableManager(_db, _db.localSessions);
  $$LocalAnswersTableTableManager get localAnswers =>
      $$LocalAnswersTableTableManager(_db, _db.localAnswers);
}
