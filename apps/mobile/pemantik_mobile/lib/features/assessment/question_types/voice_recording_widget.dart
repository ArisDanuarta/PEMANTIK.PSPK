import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:speech_to_text/speech_to_text.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/utils/levenshtein.dart';
import '../providers/assessment_provider.dart';
import 'components/question_header_widget.dart';

enum RecordState { idle, recording, analyzing, done }

class VoiceRecordingWidget extends ConsumerStatefulWidget {
  final QuestionData question;
  final String sessionId;

  const VoiceRecordingWidget({
    super.key,
    required this.question,
    required this.sessionId,
  });

  @override
  ConsumerState<VoiceRecordingWidget> createState() =>
      _VoiceRecordingWidgetState();
}

class _VoiceRecordingWidgetState extends ConsumerState<VoiceRecordingWidget> {
  final SpeechToText _stt = SpeechToText();
  late final AudioRecorder _audioRecorder;

  RecordState _state = RecordState.idle;
  String _transcription = '';
  double _similarityScore = 0.0;
  String? _localAudioPath;

  @override
  void initState() {
    super.initState();
    _audioRecorder = AudioRecorder();
    _initSTT();
  }

  Future<void> _initSTT() async {
    try {
      await _stt.initialize();
    } catch (e) {
      log('STT Init Error: $e');
    }
  }

  @override
  void dispose() {
    _audioRecorder.dispose();
    _stt.cancel();
    super.dispose();
  }

  Future<void> _handleRecordTap() async {
    HapticFeedback.heavyImpact();

    if (_state == RecordState.idle || _state == RecordState.done) {
      await _startRecording();
    } else if (_state == RecordState.recording) {
      await _stopAndAnalyze();
    }
  }

  Future<void> _startRecording() async {
    if (!await _audioRecorder.hasPermission()) return;

    final dir = await getTemporaryDirectory();
    _localAudioPath =
        '${dir.path}/rec_${widget.question.id}_${DateTime.now().millisecondsSinceEpoch}.m4a';

    await _audioRecorder.start(
      const RecordConfig(encoder: AudioEncoder.aacLc),
      path: _localAudioPath!,
    );

    setState(() {
      _state = RecordState.recording;
      _transcription = '';
    });

    // Mulai mendengarkan STT secara paralel
    if (_stt.isAvailable) {
      await _stt.listen(
        onResult: (result) {
          if (mounted) {
            setState(() {
              _transcription = result.recognizedWords;
            });
          }
        },
        listenOptions: SpeechListenOptions(
          localeId: 'id_ID',
        ), // Memaksa bahasa Indonesia
      );
    }
  }

  Future<void> _stopAndAnalyze() async {
    setState(() => _state = RecordState.analyzing);

    await _audioRecorder.stop();
    await _stt.stop();

    // Memberikan jeda sedikit agar STT menyelesaikan parsing kalimat terakhir
    await Future.delayed(const Duration(milliseconds: 500));

    // Menghitung Similarity - Admin menyimpan teks di correctAnswer['target_text']
    final targetText =
        widget.question.correctAnswer['target_text']?.toString() ??
        widget.question.options['display_text']?.toString() ??
        widget.question.correctAnswer['text']?.toString() ??
        widget.question.correctAnswer['answer']?.toString() ??
        '';

    _similarityScore = Levenshtein.calculateSimilarity(
      _transcription,
      targetText,
    );

    log(
      'Transkripsi: $_transcription | Target: $targetText | Skor: $_similarityScore',
    );

    // Ambil threshold dari correct_answer (default 80%)
    final threshold =
        (widget.question.correctAnswer['threshold_pct'] as num?)?.toDouble() ??
        80.0;

    // Menyimpan jawaban dengan semua info yang dibutuhkan untuk scoring
    ref
        .read(assessmentControllerProvider(widget.sessionId).notifier)
        .selectAnswer(
          widget.question.id,
          '{"transcription": "${_transcription.replaceAll('"', '\\"')}", "score": $_similarityScore, "threshold": $threshold, "path": "$_localAudioPath"}',
        );

    if (mounted) {
      setState(() => _state = RecordState.done);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        QuestionHeaderWidget(question: widget.question),
        const SizedBox(height: 32),

        // Teks Target (Apa yang harus dibaca anak)
        Builder(
          builder: (context) {
            final targetTextToDisplay =
                widget.question.correctAnswer['target_text']?.toString() ??
                widget.question.options['display_text']?.toString() ??
                widget.question.correctAnswer['text']?.toString() ??
                widget.question.correctAnswer['answer']?.toString() ??
                '';

            if (targetTextToDisplay.isEmpty) return const SizedBox.shrink();

            return Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.kuningEmas, width: 2),
              ),
              child: Text(
                targetTextToDisplay,
                style: AppTextStyles.heading1.copyWith(color: AppColors.jingga),
                textAlign: TextAlign.center,
              ),
            );
          },
        ),

        const SizedBox(height: 48),

        // Tombol Rekam Dinamis
        GestureDetector(
          onTap: _handleRecordTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            width: _state == RecordState.recording ? 120 : 96,
            height: _state == RecordState.recording ? 120 : 96,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _state == RecordState.recording
                  ? AppColors.merahMarun
                  : AppColors.birNavy,
              boxShadow: _state == RecordState.recording
                  ? [
                      BoxShadow(
                        color: AppColors.merahMarun.withValues(alpha: 0.4),
                        blurRadius: 20,
                        spreadRadius: 10,
                      ),
                    ]
                  : [],
            ),
            child: Icon(
              _state == RecordState.recording
                  ? Icons.stop_rounded
                  : Icons.mic_rounded,
              color: Colors.white,
              size: 48,
            ),
          ),
        ),
        const SizedBox(height: 16),

        Text(switch (_state) {
          RecordState.idle => 'Tekan untuk merekam suaramu',
          RecordState.recording => 'Sedang merekam... Tekan untuk berhenti',
          RecordState.analyzing => 'Memproses suaramu...',
          RecordState.done => 'Selesai direkam!',
        }, style: AppTextStyles.label),

        // Live transcription while recording
        if (_state == RecordState.recording && _transcription.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            '"$_transcription"',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textMuted,
              fontStyle: FontStyle.italic,
            ),
            textAlign: TextAlign.center,
          ),
        ],

        const SizedBox(height: 32),

        // Feedback Hasil (Muncul setelah selesai)
        if (_state == RecordState.done)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _transcription.isEmpty
                  ? AppColors.merahMarun.withValues(alpha: 0.1)
                  : AppColors.birNavyMuda,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Text(
                  _transcription.isEmpty
                      ? 'Suaramu tidak terdengar dengan jelas'
                      : 'Sistem mendengar:',
                  style: AppTextStyles.label.copyWith(
                    color: _transcription.isEmpty
                        ? AppColors.merahMarun
                        : AppColors.birNavy,
                  ),
                ),
                if (_transcription.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    '"$_transcription"',
                    style: AppTextStyles.bodyLarge.copyWith(
                      fontStyle: FontStyle.italic,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (_transcription.isEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Silakan tekan tombol rekam lagi untuk mengulang',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.merahMarun,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}
