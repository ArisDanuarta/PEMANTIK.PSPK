// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(currentStudent)
final currentStudentProvider = CurrentStudentProvider._();

final class CurrentStudentProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, dynamic>?>,
          Map<String, dynamic>?,
          FutureOr<Map<String, dynamic>?>
        >
    with
        $FutureModifier<Map<String, dynamic>?>,
        $FutureProvider<Map<String, dynamic>?> {
  CurrentStudentProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'currentStudentProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$currentStudentHash();

  @$internal
  @override
  $FutureProviderElement<Map<String, dynamic>?> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Map<String, dynamic>?> create(Ref ref) {
    return currentStudent(ref);
  }
}

String _$currentStudentHash() => r'3a2001ef3521e1029f2f71804f5d029792681a9a';

@ProviderFor(availableAssessments)
final availableAssessmentsProvider = AvailableAssessmentsProvider._();

final class AvailableAssessmentsProvider
    extends
        $FunctionalProvider<
          AsyncValue<DashboardData>,
          DashboardData,
          FutureOr<DashboardData>
        >
    with $FutureModifier<DashboardData>, $FutureProvider<DashboardData> {
  AvailableAssessmentsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'availableAssessmentsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$availableAssessmentsHash();

  @$internal
  @override
  $FutureProviderElement<DashboardData> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<DashboardData> create(Ref ref) {
    return availableAssessments(ref);
  }
}

String _$availableAssessmentsHash() =>
    r'3bddeae38492e0d82949d365d917d687235e33f9';
