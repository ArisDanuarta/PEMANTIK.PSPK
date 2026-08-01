// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'assessment_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(AssessmentController)
final assessmentControllerProvider = AssessmentControllerFamily._();

final class AssessmentControllerProvider
    extends $AsyncNotifierProvider<AssessmentController, AssessmentState> {
  AssessmentControllerProvider._({
    required AssessmentControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'assessmentControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$assessmentControllerHash();

  @override
  String toString() {
    return r'assessmentControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  AssessmentController create() => AssessmentController();

  @override
  bool operator ==(Object other) {
    return other is AssessmentControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$assessmentControllerHash() =>
    r'44143fab685a94ea960b0379b0210050f3742c24';

final class AssessmentControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          AssessmentController,
          AsyncValue<AssessmentState>,
          AssessmentState,
          FutureOr<AssessmentState>,
          String
        > {
  AssessmentControllerFamily._()
    : super(
        retry: null,
        name: r'assessmentControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  AssessmentControllerProvider call(String sessionId) =>
      AssessmentControllerProvider._(argument: sessionId, from: this);

  @override
  String toString() => r'assessmentControllerProvider';
}

abstract class _$AssessmentController extends $AsyncNotifier<AssessmentState> {
  late final _$args = ref.$arg as String;
  String get sessionId => _$args;

  FutureOr<AssessmentState> build(String sessionId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<AssessmentState>, AssessmentState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<AssessmentState>, AssessmentState>,
              AsyncValue<AssessmentState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(selectedAnswer)
final selectedAnswerProvider = SelectedAnswerFamily._();

final class SelectedAnswerProvider
    extends $FunctionalProvider<String?, String?, String?>
    with $Provider<String?> {
  SelectedAnswerProvider._({
    required SelectedAnswerFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'selectedAnswerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$selectedAnswerHash();

  @override
  String toString() {
    return r'selectedAnswerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<String?> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  String? create(Ref ref) {
    final argument = this.argument as (String, String);
    return selectedAnswer(ref, argument.$1, argument.$2);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String?>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is SelectedAnswerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$selectedAnswerHash() => r'0916ef4f9abb3963c3f69abde745093d16ef3d2d';

final class SelectedAnswerFamily extends $Family
    with $FunctionalFamilyOverride<String?, (String, String)> {
  SelectedAnswerFamily._()
    : super(
        retry: null,
        name: r'selectedAnswerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  SelectedAnswerProvider call(String sessionId, String questionId) =>
      SelectedAnswerProvider._(argument: (sessionId, questionId), from: this);

  @override
  String toString() => r'selectedAnswerProvider';
}
