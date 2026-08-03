import 'package:audioplayers/audioplayers.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart' hide PlayerState;
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../providers/assessment_provider.dart';

class QuestionHeaderWidget extends ConsumerStatefulWidget {
  final QuestionData question;

  const QuestionHeaderWidget({
    super.key,
    required this.question,
  });

  @override
  ConsumerState<QuestionHeaderWidget> createState() =>
      _QuestionHeaderWidgetState();
}

class _QuestionHeaderWidgetState extends ConsumerState<QuestionHeaderWidget> {
  // Audio
  AudioPlayer? _audioPlayer;
  bool _isAudioPlaying = false;
  Duration _audioDuration = Duration.zero;
  Duration _audioPosition = Duration.zero;

  // Video
  VideoPlayerController? _videoPlayerController;
  YoutubePlayerController? _youtubeController;
  bool _isVideoYoutube = false;
  bool _isVideoInitialized = false;
  bool _hasVideoError = false;

  @override
  void initState() {
    super.initState();
    _initializeMedia();
  }

  Map<String, String?> _getParsedMediaUrls() {
    final rawAudioUrl = widget.question.audioUrl ?? widget.question.options['audioUrl']?.toString();
    final rawVideoUrl = widget.question.videoUrl ?? widget.question.options['videoUrl']?.toString();
    final rawImageUrl = widget.question.imageUrl ?? widget.question.options['imageUrl']?.toString();

    String? audioUrl;
    String? videoUrl;
    String? imageUrl;

    final mediaUrl = [rawAudioUrl, rawVideoUrl, rawImageUrl]
        .firstWhere((url) => url != null && url.isNotEmpty, orElse: () => null);

    if (mediaUrl != null) {
      final urlLower = mediaUrl.toLowerCase();
      if (urlLower.contains('youtube.com') || urlLower.contains('youtu.be')) {
        videoUrl = mediaUrl;
      } else if (urlLower.contains('.mp3') || urlLower.contains('.wav') || urlLower.contains('.m4a') || urlLower.contains('.ogg') || urlLower.contains('.aac')) {
        audioUrl = mediaUrl;
      } else if (urlLower.contains('.mp4') || urlLower.contains('.webm') || urlLower.contains('.mov') || urlLower.contains('.avi')) {
        videoUrl = mediaUrl;
      } else {
        if (mediaUrl == rawAudioUrl) {
          audioUrl = mediaUrl;
        } else if (mediaUrl == rawVideoUrl) {
          videoUrl = mediaUrl;
        } else {
          imageUrl = mediaUrl;
        }
      }
    }
    
    return {
      'audioUrl': audioUrl,
      'videoUrl': videoUrl,
      'imageUrl': imageUrl,
    };
  }

  void _initializeMedia() {
    final urls = _getParsedMediaUrls();
    final audioUrl = urls['audioUrl'];
    final videoUrl = urls['videoUrl'];

    if (videoUrl != null && videoUrl.isNotEmpty) {
      _initVideo(videoUrl);
    } else if (audioUrl != null && audioUrl.isNotEmpty) {
      _initAudio(audioUrl);
    }
  }

  Future<void> _initAudio(String url) async {
    _audioPlayer = AudioPlayer();
    _audioPlayer!.setReleaseMode(ReleaseMode.stop);

    try {
      final fileInfo = await DefaultCacheManager().getFileFromCache(url);
      if (fileInfo != null && mounted) {
        await _audioPlayer!.setSource(DeviceFileSource(fileInfo.file.path));
      } else if (mounted) {
        await _audioPlayer!.setSource(UrlSource(url));
      }
    } catch (e) {
      if (mounted) {
        await _audioPlayer!.setSource(UrlSource(url));
      }
    }

    _audioPlayer!.onPlayerComplete.listen((event) {
      if (mounted) {
        setState(() {
          _isAudioPlaying = false;
          _audioPosition = Duration.zero;
        });
      }
    });

    _audioPlayer!.onDurationChanged.listen((newDuration) {
      if (mounted) {
        setState(() => _audioDuration = newDuration);
      }
    });

    _audioPlayer!.onPositionChanged.listen((newPosition) {
      if (mounted) {
        setState(() => _audioPosition = newPosition);
      }
    });
  }

  Future<void> _initVideo(String url) async {
    if (url.contains('youtube.com') || url.contains('youtu.be')) {
      _isVideoYoutube = true;
      final videoId = YoutubePlayerController.convertUrlToId(url);
      if (videoId != null) {
        _youtubeController = YoutubePlayerController.fromVideoId(
          videoId: videoId,
          autoPlay: false,
          params: const YoutubePlayerParams(
            mute: false,
            showControls: true,
            showFullscreenButton: true,
          ),
        );
        if (mounted) setState(() => _isVideoInitialized = true);
      }
    } else {
      try {
        final fileInfo = await DefaultCacheManager().getFileFromCache(url);
        if (fileInfo != null) {
          _videoPlayerController = VideoPlayerController.file(fileInfo.file);
        } else {
          _videoPlayerController = VideoPlayerController.networkUrl(
            Uri.parse(url),
          );
        }
        await _videoPlayerController!.initialize();
        if (mounted) {
          setState(() => _isVideoInitialized = true);
          _videoPlayerController!.addListener(() {
            if (mounted) setState(() {});
          });
        }
      } catch (e) {
        if (mounted) {
          setState(() => _hasVideoError = true);
        }
      }
    }
  }

  @override
  void dispose() {
    _audioPlayer?.dispose();
    _videoPlayerController?.dispose();
    _youtubeController?.close();
    super.dispose();
  }

  Future<void> _toggleAudio() async {
    if (_audioPlayer == null) return;
    try {
      if (_isAudioPlaying) {
        await _audioPlayer!.pause();
        setState(() => _isAudioPlaying = false);
      } else {
        if (_audioPlayer!.state == PlayerState.paused) {
          await _audioPlayer!.resume();
        } else {
          await _audioPlayer!.seek(Duration.zero);
          await _audioPlayer!.resume();
        }
        setState(() => _isAudioPlaying = true);
      }
    } catch (e) {
      setState(() => _isAudioPlaying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final urls = _getParsedMediaUrls();
    final audioUrl = urls['audioUrl'];
    final videoUrl = urls['videoUrl'];
    final imageUrl = urls['imageUrl'];

    final hasInstruction = widget.question.instruction != null && widget.question.instruction!.isNotEmpty;
    final hasText = widget.question.text.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (hasInstruction) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.birNavy.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.birNavy.withValues(alpha: 0.1)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.info_outline, size: 18, color: AppColors.birNavy),
                    const SizedBox(width: 8),
                    Text(
                      'Instruksi',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.birNavy,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  widget.question.instruction!,
                  style: AppTextStyles.questionText.copyWith(
                    fontStyle: FontStyle.italic,
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],

        if (videoUrl != null && videoUrl.isNotEmpty) ...[
          if (_hasVideoError)
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.red.shade50,
              child: const Text('Video tidak dapat diputar. Periksa koneksi internet.', style: TextStyle(color: Colors.red)),
            )
          else if (_isVideoInitialized)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: _isVideoYoutube
                    ? 16 / 9
                    : (_videoPlayerController?.value.aspectRatio ?? 16 / 9),
                child: _isVideoYoutube && _youtubeController != null
                    ? YoutubePlayer(controller: _youtubeController!)
                    : _videoPlayerController != null
                        ? Stack(
                            alignment: Alignment.center,
                            children: [
                              VideoPlayer(_videoPlayerController!),
                              GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _videoPlayerController!.value.isPlaying
                                        ? _videoPlayerController!.pause()
                                        : _videoPlayerController!.play();
                                  });
                                },
                                child: AnimatedOpacity(
                                  opacity: _videoPlayerController!.value.isPlaying ? 0.0 : 1.0,
                                  duration: const Duration(milliseconds: 300),
                                  child: Container(
                                    color: Colors.black38,
                                    child: const Center(
                                      child: Icon(Icons.play_circle_fill, color: Colors.white, size: 48),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          )
                        : const SizedBox(),
              ),
            ),
          const SizedBox(height: 24),
        ] else if (audioUrl != null && audioUrl.isNotEmpty) ...[
          GestureDetector(
            onTap: _toggleAudio,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                color: _isAudioPlaying ? AppColors.birNavy : AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.birNavy, width: 2),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _isAudioPlaying ? Icons.pause_circle_filled : Icons.play_circle_fill,
                        color: _isAudioPlaying ? Colors.white : AppColors.birNavy,
                        size: 32,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        _isAudioPlaying ? 'Jeda Suara' : 'Putar Suara',
                        style: AppTextStyles.bodyLarge.copyWith(
                          color: _isAudioPlaying ? Colors.white : AppColors.birNavy,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  if (_audioDuration.inMilliseconds > 0 && _audioPlayer != null) ...[
                    const SizedBox(height: 12),
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        trackHeight: 4.0,
                        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6.0),
                        overlayShape: const RoundSliderOverlayShape(overlayRadius: 14.0),
                        activeTrackColor: _isAudioPlaying ? Colors.white : AppColors.birNavy,
                        inactiveTrackColor: _isAudioPlaying ? Colors.white38 : AppColors.birNavy.withValues(alpha: 0.3),
                        thumbColor: _isAudioPlaying ? Colors.white : AppColors.birNavy,
                      ),
                      child: Slider(
                        min: 0.0,
                        max: _audioDuration.inMilliseconds.toDouble(),
                        value: _audioPosition.inMilliseconds.toDouble().clamp(0.0, _audioDuration.inMilliseconds.toDouble()),
                        onChanged: (value) {
                          _audioPlayer!.seek(Duration(milliseconds: value.toInt()));
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
        ] else if (imageUrl != null && imageUrl.isNotEmpty) ...[
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.5,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: CachedNetworkImage(
                imageUrl: imageUrl,
                width: double.infinity,
                fit: BoxFit.contain,
                placeholder: (context, url) => const Center(child: CircularProgressIndicator()),
                errorWidget: (context, url, error) => const Center(child: Icon(Icons.broken_image, size: 48, color: Colors.black)),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],

        if (hasText) ...[
          Text(widget.question.text, style: AppTextStyles.questionText),
          const SizedBox(height: 20),
        ],
      ],
    );
  }
}
