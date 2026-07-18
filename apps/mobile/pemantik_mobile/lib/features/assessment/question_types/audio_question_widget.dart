import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../providers/assessment_provider.dart';

class AudioQuestionWidget extends ConsumerStatefulWidget {
  final QuestionData question;
  final String sessionId;

  const AudioQuestionWidget({
    super.key,
    required this.question,
    required this.sessionId,
  });

  @override
  ConsumerState<AudioQuestionWidget> createState() =>
      _AudioQuestionWidgetState();
}

class _AudioQuestionWidgetState extends ConsumerState<AudioQuestionWidget> {
  late AudioPlayer _audioPlayer;
  bool _isPlaying = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;

  @override
  void initState() {
    super.initState();
    _audioPlayer = AudioPlayer();
    _audioPlayer.setReleaseMode(ReleaseMode.stop);

    // Set source di awal untuk PRELOAD audio. Penting untuk audio berdurasi pendek (misal 0.7 detik)
    // agar tidak 'bisu' di awal pemutaran akibat telat terunduh.
    final audioUrl =
        widget.question.audioUrl ??
        widget.question.options['audioUrl']?.toString();
    if (audioUrl != null && audioUrl.isNotEmpty) {
      _initAudioSource(audioUrl);
    }

    // Mendengarkan status pemutar selesai
    _audioPlayer.onPlayerComplete.listen((event) {
      if (mounted) {
        setState(() {
          _isPlaying = false;
          _position = Duration.zero;
        });
      }
    });

    _audioPlayer.onDurationChanged.listen((newDuration) {
      if (mounted) {
        setState(() {
          _duration = newDuration;
        });
      }
    });

    _audioPlayer.onPositionChanged.listen((newPosition) {
      if (mounted) {
        setState(() {
          _position = newPosition;
        });
      }
    });
  }

  Future<void> _initAudioSource(String url) async {
    try {
      final fileInfo = await DefaultCacheManager().getFileFromCache(url);
      if (fileInfo != null && mounted) {
        await _audioPlayer.setSource(DeviceFileSource(fileInfo.file.path));
      } else if (mounted) {
        await _audioPlayer.setSource(UrlSource(url));
      }
    } catch (e) {
      if (mounted) {
        await _audioPlayer.setSource(UrlSource(url));
      }
    }
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _toggleAudio() async {
    final audioUrl =
        widget.question.audioUrl ??
        widget.question.options['audioUrl']?.toString();
    debugPrint('[AudioQuestion] URL: $audioUrl');
    if (audioUrl == null || audioUrl.isEmpty) return;

    try {
      if (_isPlaying) {
        await _audioPlayer.pause();
        setState(() => _isPlaying = false);
      } else {
        if (_audioPlayer.state == PlayerState.paused) {
          await _audioPlayer.resume();
        } else {
          // Jika posisinya stop/selesai, mulai dari awal lalu resume
          // Ini memastikan buffer preload yang dimuat di initState tetap terpakai
          await _audioPlayer.seek(Duration.zero);
          await _audioPlayer.resume();
        }
        setState(() => _isPlaying = true);
      }
    } catch (e) {
      debugPrint('Error playing audio: $e');
      setState(() => _isPlaying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final selected = ref.watch(
      selectedAnswerProvider(widget.sessionId, widget.question.id),
    );
    // Admin menyimpan options sebagai array strings langsung - di-parse ke format umum
    final rawChoices =
        widget.question.options['choices'] as List<dynamic>? ??
        widget.question.options['answers'] as List<dynamic>? ??
        [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.question.text.isNotEmpty) ...[
          Text(widget.question.text, style: AppTextStyles.questionText),
          const SizedBox(height: 20),
        ],

        // Tombol Pemutar Audio dan Progress Bar
        GestureDetector(
          onTap: _toggleAudio,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            decoration: BoxDecoration(
              color: _isPlaying ? AppColors.birNavy : AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.birNavy, width: 2),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _isPlaying
                          ? Icons.pause_circle_filled
                          : Icons.play_circle_fill,
                      color: _isPlaying ? Colors.white : AppColors.birNavy,
                      size: 32,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _isPlaying ? 'Jeda Suara' : 'Putar Suara',
                      style: AppTextStyles.bodyLarge.copyWith(
                        color: _isPlaying ? Colors.white : AppColors.birNavy,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                if (_duration.inMilliseconds > 0) ...[
                  const SizedBox(height: 12),
                  SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      trackHeight: 4.0,
                      thumbShape: const RoundSliderThumbShape(
                        enabledThumbRadius: 6.0,
                      ),
                      overlayShape: const RoundSliderOverlayShape(
                        overlayRadius: 14.0,
                      ),
                      activeTrackColor: _isPlaying
                          ? Colors.white
                          : AppColors.birNavy,
                      inactiveTrackColor: _isPlaying
                          ? Colors.white38
                          : AppColors.birNavy.withValues(alpha: 0.3),
                      thumbColor: _isPlaying ? Colors.white : AppColors.birNavy,
                    ),
                    child: Slider(
                      min: 0.0,
                      max: _duration.inMilliseconds.toDouble(),
                      value: _position.inMilliseconds.toDouble().clamp(
                        0.0,
                        _duration.inMilliseconds.toDouble(),
                      ),
                      onChanged: (value) {
                        _audioPlayer.seek(
                          Duration(milliseconds: value.toInt()),
                        );
                      },
                    ),
                  ),

                ],
              ],
            ),
          ),
        ),

        const SizedBox(height: 32),

        // Pilihan Ganda Text di bawahnya - safe-parse setiap format choice
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
