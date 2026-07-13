import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/pspk_button.dart';
import '../../../core/router/app_router.dart';
import '../providers/assessment_levels_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../../core/database/database.dart';

class AssessmentLevelsPage extends ConsumerWidget {
  final String categoryId;

  const AssessmentLevelsPage({super.key, required this.categoryId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final levelsAsync = ref.watch(assessmentLevelsProvider(categoryId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: const BackButton(color: AppColors.birNavy),
        title: Text('Daftar Level', style: AppTextStyles.heading2),
        centerTitle: true,
      ),
      body: SafeArea(
        child: levelsAsync.when(
          data: (levels) {
            if (levels.isEmpty) {
              return Center(
                child: Text(
                  'Level belum tersedia.',
                  style: AppTextStyles.bodyMedium,
                ),
              );
            }

            return Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: ListView.builder(
                  padding: const EdgeInsets.all(20),
                  itemCount: levels.length,
                  itemBuilder: (context, index) {
                    final info = levels[index];
                    return _LevelCard(categoryId: categoryId, info: info);
                  },
                ),
              ),
            );
          },
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.kuningEmas),
          ),
          error: (e, _) => Center(child: Text('Terjadi kesalahan: $e')),
        ),
      ),
    );
  }
}

class _LevelCard extends ConsumerWidget {
  final String categoryId;
  final LevelInfo info;

  const _LevelCard({required this.categoryId, required this.info});

  void _showHistoryModal(
    BuildContext context,
    WidgetRef ref,
    String levelId,
  ) async {
    final student = await ref.read(currentStudentProvider.future);
    if (student == null) return;

    final studentId = student['id'] as String;
    final db = ref.read(databaseProvider);
    final category = await db.categoryDao.getCategoryById(categoryId);
    final String currentPhase = category?.phase ?? 'Tahap 1';

    final sessions = await db.sessionDao.getSessionsForLevel(
      studentId,
      levelId,
      currentPhase,
    );

    if (!context.mounted) return;

    showModalBottomSheet(
      context: context,
      constraints: const BoxConstraints(maxWidth: 600),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      backgroundColor: AppColors.surface,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Riwayat & Sinkronisasi', style: AppTextStyles.heading2),
              const SizedBox(height: 16),
              if (sessions.isEmpty)
                Text(
                  'Belum ada riwayat pengerjaan.',
                  style: AppTextStyles.bodyMedium,
                )
              else
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: sessions.length,
                    itemBuilder: (context, index) {
                      final item = sessions[index];
                      final session = item.session;

                      Color syncColor = AppColors.jingga;
                      String syncText = 'Menunggu';
                      IconData syncIcon = Icons.sync;

                      if (session.syncStatus == 'synced') {
                        syncColor = AppColors.sukses;
                        syncText = 'Tersinkronisasi';
                        syncIcon = Icons.cloud_done_outlined;
                      } else if (session.syncStatus == 'failed') {
                        syncColor = AppColors.merahMarun;
                        syncText = 'Gagal';
                        syncIcon = Icons.error_outline;
                      }

                      final dateStr = session.completedAt != null
                          ? '${session.completedAt!.day.toString().padLeft(2, '0')}/${session.completedAt!.month.toString().padLeft(2, '0')}/${session.completedAt!.year} ${session.completedAt!.hour.toString().padLeft(2, '0')}:${session.completedAt!.minute.toString().padLeft(2, '0')}'
                          : '-';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Skor: ${item.correctAnswers}',
                                  style: AppTextStyles.heading2,
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(syncIcon, size: 14, color: syncColor),
                                    const SizedBox(width: 4),
                                    Text(
                                      syncText,
                                      style: AppTextStyles.label.copyWith(
                                        color: syncColor,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            Text(dateStr, style: AppTextStyles.label),
                          ],
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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final level = info.level;
    bool isLocked = !info.isUnlocked;
    bool isPassed = info.isPassed;
    bool isFailed = info.isFailed;

    Color cardColor = AppColors.surface;
    Color borderColor = AppColors.border;

    if (isLocked && !isFailed) {
      cardColor = Colors.grey.shade100;
    } else if (isPassed) {
      cardColor = AppColors.birNavyMuda;
      borderColor = AppColors.birTeal.withValues(alpha: 0.3);
    } else if (isFailed) {
      cardColor = AppColors.merahMarun.withValues(alpha: 0.05);
      borderColor = AppColors.merahMarun.withValues(alpha: 0.3);
      isLocked = true;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Level ${level.levelNumber}',
                style: AppTextStyles.heading2.copyWith(
                  color: (isLocked && !isFailed)
                      ? AppColors.textMuted
                      : (isFailed
                            ? AppColors.merahMarun
                            : AppColors.birNavyGelap),
                ),
              ),
              if (isPassed)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.sukses.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle,
                        size: 14,
                        color: AppColors.sukses,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Selesai',
                        style: AppTextStyles.label.copyWith(
                          color: AppColors.sukses,
                        ),
                      ),
                    ],
                  ),
                )
              else if (isFailed)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.merahMarun.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.cancel,
                        size: 14,
                        color: AppColors.merahMarun,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Gagal',
                        style: AppTextStyles.label.copyWith(
                          color: AppColors.merahMarun,
                        ),
                      ),
                    ],
                  ),
                )
              else if (isLocked)
                const Icon(
                  Icons.lock_outline,
                  size: 20,
                  color: AppColors.textMuted,
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Jumlah Soal: ${info.totalQuestions}',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.birNavyGelap,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Target: ${level.passingThreshold} Jawaban Benar',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textMuted,
            ),
          ),
          if (info.highestScore > 0 || isPassed || isFailed) ...[
            const SizedBox(height: 4),
            Text(
              'Skor Tertinggi: ${info.highestScore}',
              style: AppTextStyles.bodyMedium.copyWith(
                color: isPassed
                    ? AppColors.sukses
                    : (isFailed ? AppColors.merahMarun : AppColors.jingga),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          if (!isLocked && !isPassed && !isFailed) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: PspkButton(
                    label: 'Mulai',
                    size: ButtonSize.small,
                    fullWidth: true,
                    onPressed: () {
                      Navigator.of(context).pushNamed(
                        AppRouter.assessmentLobby,
                        arguments: {
                          'categoryId': categoryId,
                          'levelId': level.id,
                          'levelNumber': level.levelNumber,
                          'accessCode': level.accessCode,
                          'totalQuestions': info.totalQuestions,
                          'passingThreshold': level.passingThreshold,
                          'timeLimitSec': level.timeLimitSec ?? 60,
                          'learningObjective': level.learningObjective,
                          'successMessage': level.successMessage,
                          'failureMessage': level.failureMessage,
                        },
                      );
                    },
                  ),
                ),
                if (info.highestScore > 0) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: PspkButton(
                      label: 'Riwayat',
                      size: ButtonSize.small,
                      outlined: true,
                      fullWidth: true,
                      onPressed: () =>
                          _showHistoryModal(context, ref, level.id),
                    ),
                  ),
                ],
              ],
            ),
          ] else if (isPassed || isFailed) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: PspkButton(
                    label: 'Riwayat',
                    size: ButtonSize.small,
                    outlined: true,
                    fullWidth: true,
                    onPressed: () => _showHistoryModal(context, ref, level.id),
                  ),
                ),
              ],
            ),
          ] else if (isLocked) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: null,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: Text(
                  'Terkunci',
                  style: AppTextStyles.buttonText.copyWith(
                    color: AppColors.textMuted,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
