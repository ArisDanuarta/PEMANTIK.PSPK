import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/sync/sync_service.dart';
import '../../../shared/widgets/pspk_button.dart';
import '../providers/assessment_history_provider.dart';

class AssessmentHistoryPage extends ConsumerWidget {
  const AssessmentHistoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(studentHistoryProvider);

    return SafeArea(
      child: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: historyAsync.when(
              data: (groupedHistory) {
                if (groupedHistory.isEmpty) {
                  return _EmptyHistoryState(
                    onRefresh: () {
                      ref.invalidate(studentHistoryProvider);
                      ref.read(syncServiceProvider).uploadCompletedSessions();
                    },
                  );
                }

                return RefreshIndicator(
                  color: AppColors.kuningEmas,
                  onRefresh: () async {
                    await ref
                        .read(syncServiceProvider)
                        .uploadCompletedSessions();
                    return ref.refresh(studentHistoryProvider.future);
                  },
                  child: ListView(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    children: _buildGroupedCards(groupedHistory, context),
                  ),
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.kuningEmas),
              ),
              error:
                  (e, _) => Center(
                    child: Text(
                      'Terjadi kesalahan: $e',
                      style: AppTextStyles.bodyMedium,
                    ),
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border, width: 1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Riwayat Asesmen 📜', style: AppTextStyles.heading1),
          const SizedBox(height: 4),
          Text(
            'Rekam jejak dan hasil asesmen yang telah kamu kerjakan',
            style: AppTextStyles.label,
          ),
        ],
      ),
    );
  }

  List<Widget> _buildGroupedCards(
    Map<String, List<StudentAssessmentHistoryItem>> groupedData,
    BuildContext context,
  ) {
    final widgets = <Widget>[];

    groupedData.forEach((phase, items) {
      widgets.add(
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
          child: Row(
            children: [
              const Icon(
                Icons.verified_outlined,
                size: 20,
                color: AppColors.jingga,
              ),
              const SizedBox(width: 8),
              Text(
                phase,
                style: AppTextStyles.label.copyWith(
                  color: AppColors.jingga,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );

      for (final item in items) {
        widgets.add(_HistoryCard(item: item));
      }
    });

    return widgets;
  }
}

class _HistoryCard extends StatelessWidget {
  final StudentAssessmentHistoryItem item;
  const _HistoryCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final isSynced = item.syncStatus == 'synced';
    final isPending = item.syncStatus == 'pending';

    final badgeColor =
        isSynced
            ? AppColors.sukses
            : (isPending ? AppColors.kuningEmas : AppColors.merahMarun);
    final badgeText =
        isSynced
            ? 'Tersinkron ☁️'
            : (isPending ? 'Lokal ⏳' : 'Gagal Upload ⚠️');

    final dateStr =
        item.completedAt != null
            ? '${item.completedAt!.day}/${item.completedAt!.month}/${item.completedAt!.year}'
            : 'Selesai';

    return GestureDetector(
      onTap: () => _showDetailBottomSheet(context, item),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: AppColors.birNavy.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '📖 ${item.subjectArea}',
                  style: AppTextStyles.label.copyWith(
                    color: AppColors.jingga,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    badgeText,
                    style: AppTextStyles.label.copyWith(
                      color: badgeColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(item.categoryName, style: AppTextStyles.heading2),
            const SizedBox(height: 6),
            Row(
              children: [
                if (item.levelName != null) ...[
                  Icon(
                    Icons.emoji_events_outlined,
                    size: 16,
                    color: AppColors.birTeal,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    item.levelName!,
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.birTeal,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 16),
                ],
                Icon(
                  Icons.calendar_today_outlined,
                  size: 14,
                  color: AppColors.textMuted,
                ),
                const SizedBox(width: 4),
                Text(dateStr, style: AppTextStyles.bodySmall),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Skor Jawaban Benar', style: AppTextStyles.bodySmall),
                Text(
                  '${item.formattedScore} (${item.scorePercentage}%)',
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.birNavyGelap,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value:
                    item.totalQuestions > 0
                        ? item.correctAnswers / item.totalQuestions
                        : 0,
                backgroundColor: AppColors.border,
                color: AppColors.sukses,
                minHeight: 8,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDetailBottomSheet(
    BuildContext context,
    StudentAssessmentHistoryItem item,
  ) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      backgroundColor: AppColors.surface,
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Rincian Hasil Asesmen', style: AppTextStyles.heading2),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const Divider(color: AppColors.border),
              const SizedBox(height: 12),
              _detailRow('Kategori', item.categoryName),
              _detailRow('Fase / Sesi', item.phase),
              if (item.levelName != null)
                _detailRow('Level Dicapai', item.levelName!),
              _detailRow(
                'Skor Akhir',
                '${item.formattedScore} (${item.scorePercentage}%)',
              ),
              _detailRow('Waktu Pengerjaan', item.formattedTimeSpent),
              _detailRow(
                'Status Sinkronisasi',
                item.syncStatus == 'synced'
                    ? 'Tersinkron ke Server'
                    : (item.syncStatus == 'pending'
                        ? 'Tersimpan Lokal (Menunggu Koneksi)'
                        : 'Gagal Upload'),
              ),
              const SizedBox(height: 24),
              PspkButton(
                label: 'Tutup',
                fullWidth: true,
                onPressed: () => Navigator.pop(ctx),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textMuted),
          ),
          Text(
            value,
            style: AppTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.w600,
              color: AppColors.birNavyGelap,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyHistoryState extends StatelessWidget {
  final VoidCallback onRefresh;
  const _EmptyHistoryState({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.history_toggle_off,
              size: 64,
              color: AppColors.border,
            ),
            const SizedBox(height: 16),
            Text(
              'Belum Ada Riwayat',
              style: AppTextStyles.heading2,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Kamu belum menyelesaikan asesmen apapun. Ayo mulai kerjakan asesmen aktifmu!',
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
