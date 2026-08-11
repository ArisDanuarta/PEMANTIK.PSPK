import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/pspk_dialog.dart';
import '../../../core/router/app_router.dart';
import '../providers/assessment_provider.dart';
import '../question_types/multiple_choice_widget.dart';
import '../question_types/image_choice_widget.dart';
import '../question_types/audio_question_widget.dart';
import '../question_types/video_question_widget.dart';
import '../question_types/drag_drop_widget.dart';
import '../question_types/voice_recording_widget.dart';
import '../../../core/database/database.dart';

import '../../../core/theme/app_text_styles.dart';

class QuestionPage extends ConsumerStatefulWidget {
  final String sessionId;
  final String title;

  const QuestionPage({super.key, required this.sessionId, required this.title});

  @override
  ConsumerState<QuestionPage> createState() => _QuestionPageState();
}

class _QuestionPageState extends ConsumerState<QuestionPage> with WidgetsBindingObserver {
  bool _isFailing = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused && !_isFailing) {
      _handlePausedState();
    }
  }

  Future<void> _handlePausedState() async {
    final db = ref.read(databaseProvider);
    final session = await db.sessionDao.getSessionById(widget.sessionId);
    if (session == null) return;

    final currentStrikes = session.cheatStrikes;
    final newStrikes = currentStrikes + 1;
    await db.sessionDao.updateCheatStrikes(widget.sessionId, newStrikes);

    if (newStrikes >= 3) {
      _isFailing = true;
      _handleCheat();
    } else {
      if (mounted) {
        showPspkDialog(
          context,
          title: 'Peringatan Pelanggaran!',
          message: 'Kamu terdeteksi keluar dari aplikasi saat ujian berlangsung. Jangan membuka aplikasi lain!\n\n(Peringatan $newStrikes dari 3)',
          isError: true,
          confirmText: 'Saya Mengerti',
        );
      }
    }
  }

  Future<void> _handleCheat() async {
    final notifier = ref.read(assessmentControllerProvider(widget.sessionId).notifier);
    final isPassed = await notifier.submitAssessment(widget.sessionId, forced: true);
    
    if (mounted) {
      showPspkDialog(
        context,
        title: 'Aktivitas Mencurigakan',
        message: 'Kamu telah keluar dari aplikasi sebanyak 3 kali. Sesi ujian ini otomatis digagalkan karena aktivitas mencurigakan.',
        isError: true,
        confirmText: 'Kembali',
        onConfirm: () => _navigateToResult(isPassed),
      );
    }
  }

  Future<void> _navigateToResult(bool isPassed) async {
    if (!mounted) return;
    
    final db = ref.read(databaseProvider);
    final session = await db.sessionDao.getSessionById(widget.sessionId);
    String? customMessage;
    
    if (session != null) {
      if (session.timeSpentSec == -1) {
        customMessage = 'Sesi digagalkan secara otomatis karena anak terdeteksi keluar dari aplikasi saat asesmen berlangsung.';
      } else {
        // Cek fallback currentLevelId jika levelId null (untuk asesmen adaptif)
        final effectiveLevelId = session.levelId ?? session.currentLevelId;
        if (effectiveLevelId != null) {
          final level = await db.levelDao.getLevelById(effectiveLevelId);
          customMessage = isPassed ? level?.successMessage : level?.failureMessage;
        }
      }
    }
    
    if (mounted) {
      Navigator.of(context).pushNamedAndRemoveUntil(
        AppRouter.resultPage,
        (_) => false,
        arguments: {
          'isPassed': isPassed,
          'customMessage': customMessage,
        },
      );
    }
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
      (prev, next) async {
        if (next == true) {
          // Tampilkan loading dialog agar user tidak bisa interaksi saat disubmit paksa
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (_) => const Center(
              child: CircularProgressIndicator(color: AppColors.kuningEmas),
            ),
          );

          final isPassed = await ref
              .read(assessmentControllerProvider(widget.sessionId).notifier)
              .submitAssessment(widget.sessionId, forced: true);

          if (context.mounted) {
            Navigator.of(context).pop(); // Tutup loading dialog
          }

          final db = ref.read(databaseProvider);
          final session = await db.sessionDao.getSessionById(widget.sessionId);
          String? customMessage;
          if (session != null && session.levelId != null) {
            final level = await db.levelDao.getLevelById(session.levelId!);
            customMessage = isPassed ? level?.successMessage : level?.failureMessage;
          }
          
          if (context.mounted) {
            Navigator.of(context).pushNamedAndRemoveUntil(
              AppRouter.resultPage,
              (_) => false,
              arguments: {
                'isPassed': isPassed,
                'customMessage': customMessage,
              },
            );
          }
        }
      },
    );

    final stateAsync = ref.watch(
      assessmentControllerProvider(widget.sessionId),
    );

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldPop = await showPspkConfirmationDialog(
          context,
          title: 'Yakin Ingin Kembali?',
          message: 'Anda belum menyelesaikan asesmen ini. Jika Anda keluar sekarang, Anda akan otomatis dinyatakan gagal dalam level ini.',
          confirmText: 'Keluar & Gagal',
          cancelText: 'Batal',
          isError: true,
        );

        if (shouldPop == true) {
          final isPassed = await ref.read(assessmentControllerProvider(widget.sessionId).notifier).submitAssessment(widget.sessionId, forced: true);
          if (context.mounted) {
            await _navigateToResult(isPassed);
          }
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(64),
        child: Container(
          decoration: const BoxDecoration(
            color: AppColors.primaryContainer,
            border: Border(bottom: BorderSide(color: AppColors.secondaryFixed, width: 4)),
            boxShadow: [
              BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4)),
            ],
          ),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.grid_view, color: AppColors.onPrimaryContainer),
                          onPressed: () {
                            if (stateAsync.value != null) {
                              _showQuestionGrid(context, stateAsync.value!);
                            }
                          },
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            widget.title,
                            style: AppTextStyles.heading2.copyWith(
                              color: AppColors.onPrimaryContainer,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      // Sync indicator
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.greenAccent, shape: BoxShape.circle)),
                            const SizedBox(width: 8),
                            Text('Tersinkron', style: AppTextStyles.labelSmall.copyWith(color: AppColors.onPrimary)),
                            const SizedBox(width: 4),
                            const Icon(Icons.cloud_done, color: AppColors.onPrimary, size: 14),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      _CountdownBadge(sessionId: widget.sessionId),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: stateAsync.maybeWhen(
        data: (state) {
          final currentQuestion = state.questions[state.currentIndex];
          final hasAnsweredCurrent = state.answers.containsKey(currentQuestion.id);

          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLowest.withValues(alpha: 0.9),
              border: const Border(top: BorderSide(color: AppColors.surfaceContainerHigh)),
              boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -4))],
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: state.currentIndex > 0 
                        ? () {
                            ref.read(assessmentControllerProvider(widget.sessionId).notifier).previousQuestion(widget.sessionId);
                          }
                        : null,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: BorderSide(color: state.currentIndex > 0 ? AppColors.primary : AppColors.outlineVariant),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('Kembali', style: AppTextStyles.labelLarge),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: hasAnsweredCurrent
                        ? () {
                            if (state.isLastQuestion) {
                              showPspkDialog(
                                context,
                                title: 'Kumpulkan Jawaban?',
                                message: 'Kamu sudah menyelesaikan semua soal. Apakah kamu yakin ingin mengumpulkan?',
                                confirmText: 'Ya, Kumpulkan',
                                onConfirm: () async {
                                  log('Mengumpulkan jawaban untuk sesi: ${widget.sessionId}');
                                  final isPassed = await ref.read(assessmentControllerProvider(widget.sessionId).notifier).submitAssessment(widget.sessionId);
                                  if (context.mounted) {
                                    await _navigateToResult(isPassed);
                                  }
                                },
                              );
                            } else {
                               ref.read(assessmentControllerProvider(widget.sessionId).notifier).nextQuestion(widget.sessionId);
                            }
                          }
                        : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.kuningEmas,
                        foregroundColor: AppColors.birNavy,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            state.isLastQuestion ? 'Kumpulkan' : 'Lanjut', 
                            style: AppTextStyles.labelLarge.copyWith(color: AppColors.birNavy),
                          ),
                          if (!state.isLastQuestion) ...[
                            const SizedBox(width: 8),
                            const Icon(Icons.arrow_forward, size: 20),
                          ]
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        orElse: () => const SizedBox.shrink(),
      ),
      body: SafeArea(
        bottom: false,
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

            return Stack(
              children: [
                // Decorative background
                Positioned(
                  top: -50,
                  right: -50,
                  child: Container(
                    width: 200,
                    height: 200,
                    decoration: BoxDecoration(
                      color: AppColors.secondaryContainer.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
                Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'SOAL ${state.currentIndex + 1} DARI ${state.questions.length}',
                                style: AppTextStyles.labelSmall.copyWith(color: AppColors.onSurfaceVariant, letterSpacing: 1.5),
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.cloud_done, color: Colors.green, size: 14),
                                  const SizedBox(width: 4),
                                  Text('Tersinkron', style: AppTextStyles.labelSmall.copyWith(color: AppColors.onSurfaceVariant)),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: (state.currentIndex + 1) / state.questions.length,
                              backgroundColor: AppColors.surfaceVariant,
                              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.secondaryContainer),
                              minHeight: 8,
                            ),
                          ),
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
                  ],
                ),
              ],
            );
          },
        ),
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
      backgroundColor: AppColors.surfaceContainerLowest,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.grid_view, color: AppColors.primary),
                      const SizedBox(width: 12),
                      Text('Peta Soal', style: AppTextStyles.heading3),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),
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
                              ? AppColors.secondaryContainer.withValues(alpha: 0.2)
                              : (isAnswered
                                    ? AppColors.primary
                                    : AppColors.surface),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isCurrent 
                                ? AppColors.secondaryContainer
                                : (isAnswered ? Colors.transparent : AppColors.outlineVariant),
                            width: isCurrent ? 2 : 1,
                          ),
                        ),
                        child: Text(
                          '${index + 1}',
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: isCurrent
                                ? AppColors.onSurface
                                : (isAnswered ? AppColors.onPrimary : AppColors.onSurfaceVariant),
                            fontWeight: isCurrent || isAnswered ? FontWeight.bold : FontWeight.normal,
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
