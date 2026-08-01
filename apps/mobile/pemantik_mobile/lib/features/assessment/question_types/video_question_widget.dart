import 'package:flutter/material.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../providers/assessment_provider.dart';

class VideoQuestionWidget extends ConsumerStatefulWidget {
  final QuestionData question;
  final String sessionId;

  const VideoQuestionWidget({
    super.key,
    required this.question,
    required this.sessionId,
  });

  @override
  ConsumerState<VideoQuestionWidget> createState() =>
      _VideoQuestionWidgetState();
}

class _VideoQuestionWidgetState extends ConsumerState<VideoQuestionWidget> {
  VideoPlayerController? _videoPlayerController;
  YoutubePlayerController? _youtubeController;
  bool _isYoutube = false;
  bool _isInitialized = false;
  bool _hasError = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  Future<void> _initializePlayer() async {
    final url =
        widget.question.videoUrl ??
        widget.question.options['videoUrl']?.toString();
    if (url == null || url.isEmpty) return;

    if (url.contains('youtube.com') || url.contains('youtu.be')) {
      _isYoutube = true;
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
        if (mounted) setState(() => _isInitialized = true);
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
          setState(() => _isInitialized = true);
          _videoPlayerController!.addListener(() {
            if (mounted) setState(() {});
          });
        }
      } catch (e) {
        if (mounted) {
          setState(() {
            _hasError = true;
            _errorMessage = 'Video tidak dapat diputar. Periksa koneksi internet.';
          });
        }
      }
    }
  }

  @override
  void dispose() {
    _videoPlayerController?.dispose();
    _youtubeController?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selected = ref.watch(
      selectedAnswerProvider(widget.sessionId, widget.question.id),
    );
    // Admin menyimpan options sebagai array strings - safe-parse ke format umum
    final rawChoices =
        widget.question.options['choices'] as List<dynamic>? ??
        widget.question.options['answers'] as List<dynamic>? ??
        [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.question.text.isNotEmpty) ...[
          Text(widget.question.text, style: AppTextStyles.questionText),
          const SizedBox(height: 16),
        ],

        // Pemutar Video
        if (_isInitialized)
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: _isYoutube && _youtubeController != null
                  ? YoutubePlayer(controller: _youtubeController!)
                  : _videoPlayerController != null
                  ? Stack(
                      alignment: Alignment.center,
                      children: [
                        VideoPlayer(_videoPlayerController!),
                        // Play/Pause overlay
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
                                child: Icon(
                                  Icons.play_circle_outline_rounded,
                                  color: Colors.white,
                                  size: 72,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    )
                  : const SizedBox.shrink(),
            ),
          )
        else if (_hasError)
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.videocam_off_rounded, color: Colors.red.shade400, size: 40),
                const SizedBox(height: 8),
                Text(
                  _errorMessage,
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodyMedium.copyWith(color: Colors.red.shade700),
                ),
              ],
            ),
          )
        else
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: CircularProgressIndicator(color: AppColors.kuningEmas),
            ),
          ),

        // Progress bar hanya untuk video lokal (bukan YouTube)
        if (_isInitialized && !_isYoutube && _videoPlayerController != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: SliderTheme(
              data: SliderTheme.of(context).copyWith(
                trackHeight: 3.0,
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6.0),
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 12.0),
                activeTrackColor: AppColors.birNavy,
                inactiveTrackColor: AppColors.birNavy.withValues(alpha: 0.25),
                thumbColor: AppColors.birNavy,
              ),
              child: Slider(
                min: 0.0,
                max: _videoPlayerController!.value.duration.inMilliseconds.toDouble().clamp(1.0, double.infinity),
                value: _videoPlayerController!.value.position.inMilliseconds.toDouble().clamp(
                  0.0,
                  _videoPlayerController!.value.duration.inMilliseconds.toDouble().clamp(1.0, double.infinity),
                ),
                onChanged: (value) {
                  _videoPlayerController!.seekTo(Duration(milliseconds: value.toInt()));
                },
              ),
            ),
          ),
        ],

        const SizedBox(height: 24),

        // Grid Pilihan Ganda
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: rawChoices.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (_, i) {
            final choice = rawChoices[i];

            String value = '';
            String label = '';
            if (choice is Map) {
              value =
                  choice['value']?.toString() ?? choice['id']?.toString() ?? '';
              label =
                  choice['label']?.toString() ??
                  choice['text']?.toString() ??
                  value;
            } else {
              value = choice.toString();
              label = choice.toString();
            }
            final isSelected = selected == value;

            return GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                ref
                    .read(
                      assessmentControllerProvider(widget.sessionId).notifier,
                    )
                    .selectAnswer(widget.question.id, value);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.birNavy : AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? AppColors.birNavy : AppColors.border,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected ? Colors.white : AppColors.border,
                          width: isSelected ? 5 : 2,
                        ),
                        color: isSelected
                            ? AppColors.birNavy
                            : Colors.transparent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        label,
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: isSelected ? Colors.white : AppColors.birNavy,
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
