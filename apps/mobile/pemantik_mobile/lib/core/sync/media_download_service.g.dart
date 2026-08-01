// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'media_download_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(MediaDownloadService)
final mediaDownloadServiceProvider = MediaDownloadServiceProvider._();

final class MediaDownloadServiceProvider
    extends $NotifierProvider<MediaDownloadService, MediaDownloadState> {
  MediaDownloadServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'mediaDownloadServiceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$mediaDownloadServiceHash();

  @$internal
  @override
  MediaDownloadService create() => MediaDownloadService();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MediaDownloadState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MediaDownloadState>(value),
    );
  }
}

String _$mediaDownloadServiceHash() =>
    r'c94aa88d637eccfe4b2bc1f85878d5fdd16fd883';

abstract class _$MediaDownloadService extends $Notifier<MediaDownloadState> {
  MediaDownloadState build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<MediaDownloadState, MediaDownloadState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<MediaDownloadState, MediaDownloadState>,
              MediaDownloadState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
