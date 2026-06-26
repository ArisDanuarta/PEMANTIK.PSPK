import 'dart:developer';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../database/database.dart';
import 'media_extractor.dart';

part 'media_download_service.g.dart';

class MediaDownloadState {
  final int totalFiles;
  final int downloadedFiles;
  final bool isDownloading;
  final String? error;

  const MediaDownloadState({
    this.totalFiles = 0,
    this.downloadedFiles = 0,
    this.isDownloading = false,
    this.error,
  });

  MediaDownloadState copyWith({
    int? totalFiles,
    int? downloadedFiles,
    bool? isDownloading,
    String? error,
  }) {
    return MediaDownloadState(
      totalFiles: totalFiles ?? this.totalFiles,
      downloadedFiles: downloadedFiles ?? this.downloadedFiles,
      isDownloading: isDownloading ?? this.isDownloading,
      error: error ?? this.error,
    );
  }

  double get progress => totalFiles == 0 ? 0.0 : downloadedFiles / totalFiles;
}

@riverpod
class MediaDownloadService extends _$MediaDownloadService {
  @override
  MediaDownloadState build() {
    return const MediaDownloadState();
  }

  Future<void> downloadAllMedia() async {
    if (state.isDownloading) return;

    try {
      state = state.copyWith(isDownloading: true, error: null);

      final db = ref.read(databaseProvider);
      final questions = await db.questionDao.getAllQuestions();

      final allUrls = <String>{};
      for (final q in questions) {
        allUrls.addAll(MediaExtractor.extractUrls(q));
      }

      // Filter out YouTube videos as they cannot be fully downloaded this way
      final validUrls = allUrls.where((url) {
        return !url.contains('youtube.com') && !url.contains('youtu.be');
      }).toList();

      state = state.copyWith(totalFiles: validUrls.length, downloadedFiles: 0);

      int successCount = 0;
      for (final url in validUrls) {
        try {
          final fileInfo = await DefaultCacheManager().getFileFromCache(url);
          if (fileInfo == null) {
            await DefaultCacheManager().downloadFile(url);
          }
          successCount++;
          state = state.copyWith(downloadedFiles: successCount);
        } catch (e) {
          log('Error downloading media: $url - $e');
          // We continue to next file even if one fails
        }
      }
    } catch (e) {
      log('Media download error: $e');
      state = state.copyWith(error: e.toString());
    } finally {
      state = state.copyWith(isDownloading: false);
    }
  }
}
