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
    final studentName = studentAsync.value?['full_name'] ?? 'Siswa';

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        color: AppColors.secondaryContainer,
        onRefresh: () => ref.refresh(availableAssessmentsProvider.future),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Column(
                    children: [
                      _DashboardHeader(studentName: studentName),
                      const SizedBox(height: 16), // Ruang ekstra sebelum konten mulai jika tidak ada banner
                    ],
                  ),
                  const Positioned(
                    bottom: -16,
                    left: 0,
                    right: 0,
                    child: _MediaDownloadBanner(),
                  ),
                ],
              ),
            ),
            SliverToBoxAdapter(
              child: const SizedBox(height: 24), // Spacer setelah tumpukan header
            ),
            SliverToBoxAdapter(
              child: const ConnectionBanner(),
            ),
            dashboardDataAsync.when(
              data: (data) {
                if (data.activeByPhase.isEmpty && data.historyByPhase.isEmpty) {
                  return SliverFillRemaining(
                    hasScrollBody: false,
                    child: _EmptyState(
                      onRefresh: () => ref.refresh(availableAssessmentsProvider.future),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      if (data.activeByPhase.isNotEmpty) ...[
                        const _SectionTitle(
                          title: 'Asesmen Aktif',
                          icon: Icons.local_fire_department,
                          color: AppColors.secondaryContainer,
                        ),
                        const SizedBox(height: 16),
                        ..._buildPhaseGroups(data.activeByPhase, context),
                      ],
                      const SizedBox(height: 32),
                      _LearningProgressSection(progressList: data.learningProgress),
                      const SizedBox(height: 32),
                      if (data.historyByPhase.isNotEmpty) ...[
                        const _SectionTitle(
                          title: 'Riwayat Asesmen',
                          icon: Icons.history,
                          color: AppColors.surfaceTint,
                        ),
                        const SizedBox(height: 16),
                        ..._buildPhaseGroups(data.historyByPhase, context, isHistory: true),
                      ],
                      const SizedBox(height: 100), // Padding bawah navigasi
                    ]),
                  ),
                );
              },
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator(color: AppColors.secondaryContainer)),
              ),
              error: (e, _) => SliverFillRemaining(
                child: Center(child: Text('Terjadi kesalahan: $e')),
              ),
            ),
          ],
        ),
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
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceTint.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Fase $phase',
                  style: const TextStyle(
                    color: AppColors.surfaceTint,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
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

class _DashboardHeader extends StatelessWidget {
  final String studentName;

  const _DashboardHeader({required this.studentName});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primaryContainer, Color(0xFF0874AA)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x11000000),
            blurRadius: 20,
            offset: Offset(0, 8),
          )
        ],
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: MediaQuery.paddingOf(context).top + 24,
        bottom: 56, // Padding ekstra karena efek banner
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Halo, ${studentName.split(' ').first}! 👋',
                  style: AppTextStyles.heading1.copyWith(
                    color: Colors.white,
                    fontSize: 28,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Siap memantik potensi belajarmu hari ini?',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 2),
                  image: const DecorationImage(
                    image: AssetImage('assets/icons/placeholder.jpg'),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.withValues(alpha: 0.2)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Colors.greenAccent,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      'Online',
                      style: TextStyle(
                        color: Colors.greenAccent,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
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
          margin: const EdgeInsets.symmetric(horizontal: 20),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0B1C30).withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.redAccent, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Gagal mengunduh media. Cek koneksi internet.',
                  style: AppTextStyles.label.copyWith(color: Colors.redAccent),
                ),
              ),
            ],
          ),
        );
      }
      return const SizedBox.shrink();
    }

    double progress = downloadState.totalFiles > 0 
        ? downloadState.downloadedFiles / downloadState.totalFiles 
        : 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0B1C30).withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.download, size: 20, color: AppColors.primaryContainer),
                  const SizedBox(width: 8),
                  Text(
                    'Mengunduh materi...',
                    style: AppTextStyles.label.copyWith(
                      color: AppColors.primaryContainer,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Text(
                '${(progress * 100).toInt()}%',
                style: AppTextStyles.label.copyWith(
                  color: AppColors.secondaryContainer,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: AppColors.surfaceContainerHighest,
              color: AppColors.secondaryContainer,
              minHeight: 10,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;

  const _SectionTitle({required this.title, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 8),
        Text(
          title,
          style: AppTextStyles.heading2.copyWith(
            color: AppColors.primary,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
      ],
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
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0B1C30).withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          )
        ],
        border: Border.all(color: AppColors.border.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white),
                ),
                child: Icon(
                  category.subjectArea.toLowerCase().contains('literasi') 
                    ? Icons.menu_book 
                    : Icons.calculate,
                  color: AppColors.primary,
                ),
              ),
              _buildStatusBadge(isExpired, isComingSoon, isHistory),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            category.name,
            style: AppTextStyles.heading2.copyWith(fontSize: 18, color: AppColors.onSurface),
          ),
          const SizedBox(height: 8),
          if (category.validUntil != null)
            Row(
              children: [
                Icon(
                  Icons.schedule, 
                  size: 16, 
                  color: isDisabled ? AppColors.onSurfaceVariant : Colors.redAccent,
                ),
                const SizedBox(width: 6),
                Text(
                  'Tenggat: ${category.validUntil!.day}/${category.validUntil!.month}/${category.validUntil!.year}',
                  style: AppTextStyles.label.copyWith(
                    color: isDisabled ? AppColors.onSurfaceVariant : Colors.redAccent,
                  ),
                ),
              ],
            ),
          const SizedBox(height: 16),
          const Divider(color: AppColors.surfaceContainerHighest, height: 1),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Jumlah Level: ${category.totalLevels}',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.onSurfaceVariant),
              ),
              if (!isDisabled)
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppRouter.assessmentLevels, arguments: category.id);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Mulai', style: TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Rubik')),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward, size: 16),
                    ],
                  ),
                )
              else if (isHistory)
                 ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppRouter.assessmentLevels, arguments: category.id);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.surfaceContainerHighest,
                    foregroundColor: AppColors.onSurfaceVariant,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    elevation: 0,
                  ),
                  child: const Text('Lihat Detail', style: TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Rubik')),
                )
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(bool isExpired, bool isComingSoon, bool isHistory) {
    Color bgColor;
    Color textColor;
    String text;

    if (isExpired) {
      bgColor = AppColors.merahMarun.withValues(alpha: 0.1);
      textColor = AppColors.merahMarun;
      text = 'Kedaluwarsa';
    } else if (isComingSoon) {
      bgColor = AppColors.birTeal.withValues(alpha: 0.1);
      textColor = AppColors.birTeal;
      text = 'Belum Mulai';
    } else if (isHistory) {
      bgColor = AppColors.surfaceTint.withValues(alpha: 0.1);
      textColor = AppColors.surfaceTint;
      text = 'Riwayat';
    } else {
      bgColor = AppColors.secondaryContainer.withValues(alpha: 0.2);
      textColor = const Color(0xFF614000); // on-secondary-fixed-variant from HTML
      text = 'Aktif';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: textColor.withValues(alpha: 0.3)),
      ),
      child: Text(text, style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }
}

class _LearningProgressSection extends StatelessWidget {
  final List<PackageProgress> progressList;

  const _LearningProgressSection({required this.progressList});

  @override
  Widget build(BuildContext context) {
    if (progressList.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.primaryContainer,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryContainer.withValues(alpha: 0.2),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ]
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Progres Belajar Aktif',
            style: AppTextStyles.heading2.copyWith(color: Colors.white, fontSize: 18),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            alignment: WrapAlignment.start,
            children: progressList.map((pkg) {
              // Menentukan warna berdasarkan subjek (Literasi = kuning, Numerasi = hijau, lainnya biru muda)
              final subject = pkg.subjectArea.toLowerCase();
              Color progressColor = AppColors.inversePrimary;
              if (subject.contains('literasi')) {
                progressColor = AppColors.secondaryContainer;
              } else if (subject.contains('numerasi')) {
                progressColor = Colors.greenAccent;
              }

              // Hitung lebar item. Jika <= 2 item, bagi rata lebar. Jika lebih, buat ukuran fixed / wrap natural.
              // Untuk sederhana, gunakan fraction dari screen atau Expanded jika kita pakai Row, 
              // tapi karena Wrap tidak punya Expanded, kita akan set width spesifik
              return LayoutBuilder(
                builder: (context, constraints) {
                  // Hitung lebar optimal (Setengah layar dikurangi padding)
                  // Kita asumsikan constraints.maxWidth adalah lebar container parent
                  // Jika ada 1 atau 2 item, kita buat lebarnya menyesuaikan
                  final itemWidth = progressList.length == 1 
                      ? constraints.maxWidth 
                      : (constraints.maxWidth - 16) / 2;

                  return SizedBox(
                    width: itemWidth,
                    child: _buildProgressItem(
                      pkg.categoryName, 
                      pkg.completed, 
                      pkg.total, 
                      progressColor,
                    ),
                  );
                }
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
  
  Widget _buildProgressItem(String title, int completed, int total, Color color) {
    double perc = total == 0 ? 0 : completed / total;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 64,
            height: 64,
            child: Stack(
              children: [
                Center(
                  child: SizedBox(
                    width: 64, 
                    height: 64,
                    child: CircularProgressIndicator(
                      value: perc,
                      strokeWidth: 6,
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      color: color,
                      strokeCap: StrokeCap.round,
                    ),
                  ),
                ),
                Center(
                  child: Text(
                    '$completed/$total',
                    style: const TextStyle(
                      color: Colors.white, 
                      fontSize: 14, 
                      fontWeight: FontWeight.bold,
                      fontFamily: 'Rubik',
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            title, 
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.9), 
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
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
              Icons.auto_awesome,
              size: 64,
              color: AppColors.inversePrimary,
            ),
            const SizedBox(height: 16),
            Text(
              'Belum ada asesmen aktif.',
              style: AppTextStyles.heading2.copyWith(color: AppColors.primary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Ayo mulai petualanganmu dan nyalakan semangat belajar!',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            PspkButton(
              label: 'Muat Ulang Data',
              onPressed: onRefresh,
              size: ButtonSize.small,
            ),
          ],
        ),
      ),
    );
  }
}
