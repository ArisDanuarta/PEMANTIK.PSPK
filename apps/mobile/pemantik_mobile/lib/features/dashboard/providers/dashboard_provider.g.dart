// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Provider untuk data profil siswa yang sedang login.
///
/// PENTING: ini sengaja dibuat sebagai Notifier (bukan function provider biasa)
/// supaya state-nya bisa di-update LANGSUNG dari luar (misal setelah edit
/// profil berhasil), tanpa harus invalidate() + menunggu refetch dari storage.
/// Dengan invalidate() biasa, widget yang sedang tidak "aktif" di navigation
/// stack (misal ProfilePage yang tertutup EditProfilePage) kadang tidak
/// langsung ter-render ulang sampai ada trigger rebuild lain (contoh: logout
/// lalu login lagi). Dengan setData() di bawah, perubahan langsung
/// ter-broadcast ke semua widget yang ref.watch(currentStudentProvider).

@ProviderFor(CurrentStudent)
final currentStudentProvider = CurrentStudentProvider._();

/// Provider untuk data profil siswa yang sedang login.
///
/// PENTING: ini sengaja dibuat sebagai Notifier (bukan function provider biasa)
/// supaya state-nya bisa di-update LANGSUNG dari luar (misal setelah edit
/// profil berhasil), tanpa harus invalidate() + menunggu refetch dari storage.
/// Dengan invalidate() biasa, widget yang sedang tidak "aktif" di navigation
/// stack (misal ProfilePage yang tertutup EditProfilePage) kadang tidak
/// langsung ter-render ulang sampai ada trigger rebuild lain (contoh: logout
/// lalu login lagi). Dengan setData() di bawah, perubahan langsung
/// ter-broadcast ke semua widget yang ref.watch(currentStudentProvider).
final class CurrentStudentProvider
    extends $AsyncNotifierProvider<CurrentStudent, Map<String, dynamic>?> {
  /// Provider untuk data profil siswa yang sedang login.
  ///
  /// PENTING: ini sengaja dibuat sebagai Notifier (bukan function provider biasa)
  /// supaya state-nya bisa di-update LANGSUNG dari luar (misal setelah edit
  /// profil berhasil), tanpa harus invalidate() + menunggu refetch dari storage.
  /// Dengan invalidate() biasa, widget yang sedang tidak "aktif" di navigation
  /// stack (misal ProfilePage yang tertutup EditProfilePage) kadang tidak
  /// langsung ter-render ulang sampai ada trigger rebuild lain (contoh: logout
  /// lalu login lagi). Dengan setData() di bawah, perubahan langsung
  /// ter-broadcast ke semua widget yang ref.watch(currentStudentProvider).
  CurrentStudentProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'currentStudentProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$currentStudentHash();

  @$internal
  @override
  CurrentStudent create() => CurrentStudent();
}

String _$currentStudentHash() => r'559449b025824afa53fae2e581a9a0a2006efcbf';

/// Provider untuk data profil siswa yang sedang login.
///
/// PENTING: ini sengaja dibuat sebagai Notifier (bukan function provider biasa)
/// supaya state-nya bisa di-update LANGSUNG dari luar (misal setelah edit
/// profil berhasil), tanpa harus invalidate() + menunggu refetch dari storage.
/// Dengan invalidate() biasa, widget yang sedang tidak "aktif" di navigation
/// stack (misal ProfilePage yang tertutup EditProfilePage) kadang tidak
/// langsung ter-render ulang sampai ada trigger rebuild lain (contoh: logout
/// lalu login lagi). Dengan setData() di bawah, perubahan langsung
/// ter-broadcast ke semua widget yang ref.watch(currentStudentProvider).

abstract class _$CurrentStudent extends $AsyncNotifier<Map<String, dynamic>?> {
  FutureOr<Map<String, dynamic>?> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<Map<String, dynamic>?>, Map<String, dynamic>?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<Map<String, dynamic>?>,
                Map<String, dynamic>?
              >,
              AsyncValue<Map<String, dynamic>?>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

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
    r'f07ff2338dafb27791dbeb24ea4efa95aa6f4b71';
