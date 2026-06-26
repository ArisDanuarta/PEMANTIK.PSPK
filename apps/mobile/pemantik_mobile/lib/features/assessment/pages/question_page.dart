import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/pspk_button.dart';
import '../../../shared/widgets/pspk_dialog.dart';
import '../../../core/router/app_router.dart';
import '../providers/assessment_provider.dart';
import '../widgets/progress_bar.dart';
import '../question_types/multiple_choice_widget.dart';
import '../question_types/image_choice_widget.dart';
import '../question_types/audio_question_widget.dart';
import '../question_types/video_question_widget.dart';
import '../question_types/drag_drop_widget.dart';
import '../question_types/voice_recording_widget.dart';

import '../../../core/theme/app_text_styles.dart';

class QuestionPage extends ConsumerStatefulWidget {
  final String sessionId;

  const QuestionPage({super.key, required this.sessionId});

  @override
  ConsumerState<QuestionPage> createState() => _QuestionPageState();
}

class _QuestionPageState extends ConsumerState<QuestionPage> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    // Listener untuk inisiasi timer pertama kali data soal dimuat
    ref.listen(assessmentControllerProvider(widget.sessionId), (prev, next) {
      if (prev?.value == null &&
          next.value != null &&
          next.value!.questions.isNotEmpty) {
        final initialLevelLimit = next.value!.questions.first.timeLimitSec;
        // Gunakan delay agar tidak error state modification during build
        Future.microtask(() {
          ref
              .read(assessmentControllerProvider(widget.sessionId).notifier)
              .startTimer(initialLevelLimit);
        });
      }
    });

    // Listener untuk auto-navigasi saat waktu habis
    ref.listen(
      assessmentControllerProvider(
        widget.sessionId,
      ).select((s) => s.value?.isTimeUp),
      (prev, next) {
        if (next == true) {
          Navigator.of(context).pushNamedAndRemoveUntil(
            AppRouter.resultPage,
            (_) => false,
            arguments: false, // Default isPassed to false on timeout
          );
        }
      },
    );

    final stateAsync = ref.watch(
      assessmentControllerProvider(widget.sessionId),
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: stateAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.kuningEmas),
          ),
          error: (e, _) => Center(child: Text('Terjadi kesalahan: $e')),
          data: (state) {
            if (state.questions.isEmpty) {
              return const Center(
                child: Text('Tidak ada soal dalam paket ini.'),
              );
            }

            final currentQuestion = state.questions[state.currentIndex];
            final hasAnsweredCurrent = state.answers.containsKey(
              currentQuestion.id,
            );

            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24.0,
                    vertical: 8.0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: ProgressBar(
                          current: state.currentIndex + 1,
                          total: state.questions.length,
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(
                          Icons.grid_view,
                          color: AppColors.birNavy,
                        ),
                        onPressed: () => _showQuestionGrid(context, state),
                      ),
                      const SizedBox(width: 8),
                      _CountdownBadge(sessionId: widget.sessionId),
                    ],
                  ),
                ),
                Expanded(
                  child: PageView.builder(
                    controller: state.pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: state.questions.length,
                    itemBuilder: (_, i) {
                      final q = state.questions[i];
                      return SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
                        child: _buildQuestionWidget(q, widget.sessionId),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: PspkButton(
                    label: state.isLastQuestion ? 'Kumpulkan' : 'Lanjut',
                    fullWidth: true,
                    onPressed: hasAnsweredCurrent
                        ? () {
                            if (state.isLastQuestion) {
                              showPspkDialog(
                                context,
                                title: 'Kumpulkan Jawaban?',
                                message:
                                    'Kamu sudah menyelesaikan semua soal. Apakah kamu yakin ingin mengumpulkan?',
                                confirmText: 'Ya, Kumpulkan',
                                onConfirm: () async {
                                  log(
                                    'Mengumpulkan jawaban untuk sesi: ${widget.sessionId}',
                                  );

                                  final isPassed = await ref
                                      .read(
                                        assessmentControllerProvider(
                                          widget.sessionId,
                                        ).notifier,
                                      )
                                      .submitAssessment(widget.sessionId);

                                  if (context.mounted) {
                                    Navigator.of(
                                      context,
                                    ).pushNamedAndRemoveUntil(
                                      AppRouter.resultPage,
                                      (_) => false,
                                      arguments: isPassed,
                                    );
                                  }
                                },
                              );
                            } else {
                              ref
                                  .read(
                                    assessmentControllerProvider(
                                      widget.sessionId,
                                    ).notifier,
                                  )
                                  .nextQuestion(widget.sessionId);
                            }
                          }
                        : null,
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildQuestionWidget(QuestionData q, String sessionId) {
    switch (q.type) {
      case 'multiple_choice':
        return MultipleChoiceWidget(question: q, sessionId: sessionId);
      case 'image_choice':
        return ImageChoiceWidget(question: q, sessionId: sessionId);
      case 'audio_question':
        return AudioQuestionWidget(question: q, sessionId: sessionId);
      case 'video_question':
        return VideoQuestionWidget(question: q, sessionId: sessionId);
      case 'drag_drop':
        return DragDropWidget(question: q, sessionId: sessionId);
      case 'voice_recording':
        return VoiceRecordingWidget(question: q, sessionId: sessionId);
      default:
        return Center(
          child: Text('Tipe soal ${q.type} belum didukung di versi ini.'),
        );
    }
  }

  void _showQuestionGrid(BuildContext context, AssessmentState state) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Daftar Soal', style: AppTextStyles.heading2),
              const SizedBox(height: 16),
              Flexible(
                child: GridView.builder(
                  shrinkWrap: true,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 5,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                  ),
                  itemCount: state.questions.length,
                  itemBuilder: (context, index) {
                    final q = state.questions[index];
                    final isAnswered = state.answers.containsKey(q.id);
                    final isCurrent = state.currentIndex == index;

                    return GestureDetector(
                      onTap: () {
                        Navigator.pop(context);
                        ref
                            .read(
                              assessmentControllerProvider(
                                widget.sessionId,
                              ).notifier,
                            )
                            .jumpToQuestion(index);
                      },
                      child: Container(
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isCurrent
                              ? AppColors.kuningEmas
                              : (isAnswered
                                    ? AppColors.birNavy
                                    : AppColors.surface),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isAnswered || isCurrent
                                ? Colors.transparent
                                : AppColors.border,
                          ),
                        ),
                        child: Text(
                          '${index + 1}',
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: isAnswered || isCurrent
                                ? Colors.white
                                : AppColors.birNavy,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CountdownBadge extends ConsumerWidget {
  final String sessionId;
  const _CountdownBadge({required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final remaining = ref.watch(
      assessmentControllerProvider(
        sessionId,
      ).select((s) => s.value?.remainingSeconds ?? 0),
    );
    final minutes = (remaining ~/ 60).toString().padLeft(2, '0');
    final seconds = (remaining % 60).toString().padLeft(2, '0');
    final isWarning = remaining <= 60 && remaining > 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: remaining == 0
            ? AppColors.merahMarun
            : (isWarning ? AppColors.merahMarun : AppColors.birNavy),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '$minutes:$seconds',
        style: AppTextStyles.bodyMedium.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
