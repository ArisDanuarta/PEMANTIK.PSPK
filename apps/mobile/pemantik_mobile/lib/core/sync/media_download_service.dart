import 'dart:developer';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../database/database.dart';
import 'media_extractor.dart';

part 'media_download_service.g.dart';

// URL-URL yang tidak bisa didownload (streaming only) - tetap bisa diputar online
const _streamOnlyHosts = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  // Tambahkan platform lain di sini jika perlu
];

bool _isStreamOnlyUrl(String url) {
  return _streamOnlyHosts.any((host) => url.contains(host));
}

class MediaDownloadState {
  final int totalFiles;
  final int downloadedFiles;
  final bool isDownloading;
  final bool isDone;
  final List<String> failedUrls;
  final String? error;

  const MediaDownloadState({
    this.totalFiles = 0,
    this.downloadedFiles = 0,
    this.isDownloading = false,
    this.isDone = false,
    this.failedUrls = const [],
    this.error,
  });

  MediaDownloadState copyWith({
    int? totalFiles,
    int? downloadedFiles,
    bool? isDownloading,
    bool? isDone,
    List<String>? failedUrls,
    String? error,
  }) {
    return MediaDownloadState(
      totalFiles: totalFiles ?? this.totalFiles,
      downloadedFiles: downloadedFiles ?? this.downloadedFiles,
      isDownloading: isDownloading ?? this.isDownloading,
      isDone: isDone ?? this.isDone,
      failedUrls: failedUrls ?? this.failedUrls,
      error: error ?? this.error,
    );
  }

  double get progress =>
      totalFiles == 0 ? 0.0 : downloadedFiles / totalFiles;

  bool get hasFailures => failedUrls.isNotEmpty;

  /// Semua file berhasil atau gagal (tidak lagi sedang berjalan)
  bool get isComplete => !isDownloading && isDone;
}

@riverpod
class MediaDownloadService extends _$MediaDownloadService {
  @override
  MediaDownloadState build() {
    return const MediaDownloadState();
  }

  Future<void> downloadAllMedia({int maxRetries = 2}) async {
    if (state.isDownloading) return;

    try {
      state = state.copyWith(
        isDownloading: true,
        isDone: false,
        error: null,
        failedUrls: [],
      );

      final db = ref.read(databaseProvider);
      final questions = await db.questionDao.getAllQuestions();

      final allUrls = <String>{};
      for (final q in questions) {
        allUrls.addAll(MediaExtractor.extractUrls(q));
      }

      // Pisahkan URL stream-only (YouTube, Vimeo, dll) - tidak didownload, tetap bisa diputar online
      final downloadableUrls = allUrls
          .where((url) => !_isStreamOnlyUrl(url))
          .toList();

      final streamOnlyCount =
          allUrls.length - downloadableUrls.length;

      log('[MediaDownload] Total URL: ${allUrls.length} '
          '(${downloadableUrls.length} bisa download, '
          '$streamOnlyCount streaming-only)');

      state = state.copyWith(
        totalFiles: downloadableUrls.length,
        downloadedFiles: 0,
      );

      int successCount = 0;
      final failedUrls = <String>[];

      for (final url in downloadableUrls) {
        bool success = false;
        for (int attempt = 0; attempt < maxRetries && !success; attempt++) {
          try {
            // Cek apakah sudah ada di cache terlebih dahulu
            final cached = await DefaultCacheManager().getFileFromCache(url);
            if (cached != null) {
              log('[MediaDownload] Cache hit: $url');
              success = true;
              break;
            }
            // Download file baru
            await DefaultCacheManager().downloadFile(url);
            log('[MediaDownload] Downloaded: $url');
            success = true;
          } catch (e) {
            log('[MediaDownload] Attempt ${attempt + 1}/$maxRetries gagal: $url - $e');
            if (attempt < maxRetries - 1) {
              // Tunggu sebentar sebelum retry
              await Future.delayed(const Duration(seconds: 1));
            }
          }
        }

        if (success) {
          successCount++;
        } else {
          failedUrls.add(url);
          log('[MediaDownload] GAGAL setelah $maxRetries percobaan: $url');
        }

        state = state.copyWith(
          downloadedFiles: successCount,
          failedUrls: List.from(failedUrls),
        );
      }

      log('[MediaDownload] Selesai. Berhasil: $successCount, Gagal: ${failedUrls.length}');
    } catch (e) {
      log('[MediaDownload] Error kritis: $e');
      state = state.copyWith(error: e.toString());
    } finally {
      state = state.copyWith(isDownloading: false, isDone: true);
    }
  }

  /// Coba ulang hanya file yang gagal
  Future<void> retryFailed() async {
    if (state.isDownloading || state.failedUrls.isEmpty) return;

    final failedUrls = List<String>.from(state.failedUrls);
    final successUrls = <String>[];
    final stillFailed = <String>[];

    state = state.copyWith(
      isDownloading: true,
      isDone: false,
      totalFiles: failedUrls.length,
      downloadedFiles: 0,
      failedUrls: [],
    );

    int successCount = 0;
    for (final url in failedUrls) {
      try {
        await DefaultCacheManager().downloadFile(url);
        successUrls.add(url);
        successCount++;
        state = state.copyWith(downloadedFiles: successCount);
      } catch (e) {
        stillFailed.add(url);
        state = state.copyWith(failedUrls: List.from(stillFailed));
      }
    }

    state = state.copyWith(isDownloading: false, isDone: true);
  }
}
