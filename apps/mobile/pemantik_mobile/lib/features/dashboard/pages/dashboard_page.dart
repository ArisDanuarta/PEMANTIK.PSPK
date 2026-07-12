import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/connection_banner.dart';
import '../../../shared/widgets/pspk_button.dart';
import '../../../core/router/app_router.dart';
import '../providers/dashboard_provider.dart';

import '../../../core/sync/media_download_service.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentAsync = ref.watch(currentStudentProvider);
    final dashboardDataAsync = ref.watch(availableAssessmentsProvider);

    return SafeArea(
      child: Column(
        children: [
          studentAsync.when(
            data: (student) =>
                _DashboardHeader(studentName: student?['full_name'] ?? 'Anak'),
            loading: () => const _DashboardHeader(studentName: 'Memuat...'),
            error: (_, _) => const _DashboardHeader(studentName: 'Anak'),
          ),

          const ConnectionBanner(),
          const _MediaDownloadBanner(),

          Expanded(
            child: dashboardDataAsync.when(
              data: (data) {
                if (data.activeByPhase.isEmpty && data.historyByPhase.isEmpty) {
                  return _EmptyState(
                    onRefresh: () =>
                        ref.refresh(availableAssessmentsProvider.future),
                  );
                }

                return RefreshIndicator(
                  color: AppColors.kuningEmas,
                  onRefresh: () =>
                      ref.refresh(availableAssessmentsProvider.future),
                  child: ListView(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    children: [
                      if (data.activeByPhase.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 8,
                          ),
                          child: Text(
                            'Asesmen Aktif',
                            style: AppTextStyles.heading2,
                          ),
                        ),
                        ..._buildPhaseGroups(data.activeByPhase, context),
                      ],

                      if (data.historyByPhase.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 8,
                          ),
                          child: Text(
                            'Riwayat Asesmen',
                            style: AppTextStyles.heading2,
                          ),
                        ),
                        ..._buildPhaseGroups(
                          data.historyByPhase,
                          context,
                          isHistory: true,
                        ),
                      ],
                    ],
                  ),
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.kuningEmas),
              ),
              error: (e, _) => Center(child: Text('Terjadi kesalahan: $e')),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildPhaseGroups(
    Map<String, List<AssessmentCategory>> groupedData,
    BuildContext context, {
    bool isHistory = false,
  }) {
    final widgets = <Widget>[];

    groupedData.forEach((phase, categories) {
      widgets.add(
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
          child: Row(
            children: [
              const Icon(
                Icons.bookmark_outline,
                size: 18,
                color: AppColors.jingga,
              ),
              const SizedBox(width: 8),
              Text(
                phase,
                style: AppTextStyles.label.copyWith(
                  color: AppColors.jingga,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      );

      for (final cat in categories) {
        widgets.add(_AssessmentCard(category: cat, isHistory: isHistory));
      }
    });

    return widgets;
  }
}

class _MediaDownloadBanner extends ConsumerWidget {
  const _MediaDownloadBanner();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final downloadState = ref.watch(mediaDownloadServiceProvider);

    if (!downloadState.isDownloading) {
      if (downloadState.error != null) {
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          color: AppColors.merahMarun.withValues(alpha: 0.1),
          child: Text(
            'Gagal mengunduh sebagian media offline. Pastikan koneksi internet stabil.',
            style: AppTextStyles.label.copyWith(color: AppColors.merahMarun),
            textAlign: TextAlign.center,
          ),
        );
      }
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      color: AppColors.kuningEmas.withValues(alpha: 0.1),
      child: Row(
        children: [
          const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.jingga,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mengunduh aset untuk mode offline...',
                  style: AppTextStyles.label.copyWith(
                    color: AppColors.jingga,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: downloadState.progress,
                    backgroundColor: AppColors.border,
                    color: AppColors.jingga,
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${downloadState.downloadedFiles} dari ${downloadState.totalFiles} file',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DashboardHeader extends StatelessWidget {
  final String studentName;

  const _DashboardHeader({required this.studentName});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Halo, $studentName! 👋', style: AppTextStyles.heading1),
          const SizedBox(height: 4),
          Text(
            'Siap belajar dan bermain hari ini?',
            style: AppTextStyles.label,
          ),
        ],
      ),
    );
  }
}

class _AssessmentCard extends StatelessWidget {
  final AssessmentCategory category;
  final bool isHistory;

  const _AssessmentCard({required this.category, this.isHistory = false});

  @override
  Widget build(BuildContext context) {
    final isComingSoon = category.isComingSoon;
    final isExpired = category.isExpired;
    final isDisabled = isComingSoon || isExpired;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDisabled
            ? AppColors.border.withValues(alpha: 0.3)
            : AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDisabled ? AppColors.border : AppColors.birNavy,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '📖 ${category.subjectArea}',
                style: AppTextStyles.label.copyWith(color: AppColors.jingga),
              ),
              if (isExpired)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.merahMarun.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Kedaluwarsa',
                    style: AppTextStyles.label.copyWith(
                      color: AppColors.merahMarun,
                      fontSize: 11,
                    ),
                  ),
                )
              else if (isComingSoon)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.birTeal.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Belum Mulai',
                    style: AppTextStyles.label.copyWith(
                      color: AppColors.birTeal,
                      fontSize: 11,
                    ),
                  ),
                )
              else if (!isHistory)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.sukses.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Aktif',
                    style: AppTextStyles.label.copyWith(
                      color: AppColors.sukses,
                      fontSize: 11,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            category.name,
            style: AppTextStyles.heading2.copyWith(
              color: isDisabled ? AppColors.textMuted : AppColors.birNavyGelap,
            ),
          ),
          const SizedBox(height: 12),

          if (category.validUntil != null)
            Row(
              children: [
                Icon(
                  Icons.event_available,
                  size: 14,
                  color: isDisabled ? AppColors.textMuted : AppColors.birNavy,
                ),
                const SizedBox(width: 6),
                Text(
                  'Valid s/d: ${category.validUntil!.day}/${category.validUntil!.month}/${category.validUntil!.year}',
                  style: AppTextStyles.label.copyWith(
                    color: isDisabled ? AppColors.textMuted : AppColors.birNavy,
                  ),
                ),
              ],
            ),

          if (!isDisabled) ...[
            const SizedBox(height: 16),
            PspkButton(
              label: 'Lihat Detail',
              size: ButtonSize.small,
              fullWidth: true,
              onPressed: () {
                Navigator.of(
                  context,
                ).pushNamed(AppRouter.assessmentLevels, arguments: category.id);
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onRefresh;
  const _EmptyState({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.assignment_outlined,
              size: 64,
              color: AppColors.border,
            ),
            const SizedBox(height: 16),
            Text(
              'Belum ada asesmen',
              style: AppTextStyles.heading2,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Tanya gurumu kapan asesmen dimulai.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            PspkButton(
              label: 'Muat Ulang',
              onPressed: onRefresh,
              size: ButtonSize.small,
            ),
          ],
        ),
      ),
    );
  }
}
