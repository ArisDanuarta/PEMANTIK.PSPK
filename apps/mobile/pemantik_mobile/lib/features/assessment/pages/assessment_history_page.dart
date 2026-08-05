import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/sync/sync_service.dart';
import '../providers/assessment_history_provider.dart';

class AssessmentHistoryPage extends ConsumerWidget {
  const AssessmentHistoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(studentHistoryProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background Flame Pattern
          Positioned(
            top: 0,
            right: 0,
            child: Container(
              width: MediaQuery.of(context).size.width * 0.8,
              height: MediaQuery.of(context).size.height * 0.5,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topRight,
                  radius: 1.0,
                  colors: [
                    AppColors.secondaryContainer.withValues(alpha: 0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            child: Container(
              width: MediaQuery.of(context).size.width * 0.8,
              height: MediaQuery.of(context).size.height * 0.5,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.bottomLeft,
                  radius: 1.0,
                  colors: [
                    AppColors.primary.withValues(alpha: 0.04),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Main Content
          SafeArea(
            bottom: false,
            child: historyAsync.when(
              data: (groupedHistory) {
                if (groupedHistory.isEmpty) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildHeader(),
                      Expanded(
                        child: _EmptyHistoryState(
                          onStart: () {
                            Navigator.pushNamedAndRemoveUntil(context, AppRouter.home, (route) => false);
                          },
                        ),
                      ),
                    ],
                  );
                }

                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () async {
                    await ref.read(syncServiceProvider).uploadCompletedSessions();
                    return ref.refresh(studentHistoryProvider.future);
                  },
                  child: CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [
                      SliverToBoxAdapter(child: _buildHeader()),
                      ..._buildGroupedSlivers(groupedHistory, context),
                      const SliverPadding(padding: EdgeInsets.only(bottom: 120)), // Space for bottom nav
                    ],
                  ),
                );
              },
              loading: () => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildHeader(),
                  const Expanded(child: Center(child: CircularProgressIndicator(color: AppColors.primary))),
                ],
              ),
              error: (e, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildHeader(),
                  Expanded(
                    child: Center(
                      child: Text('Terjadi kesalahan: $e', style: AppTextStyles.bodyMedium),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Riwayat Asesmen',
            style: AppTextStyles.heading1.copyWith(
              color: AppColors.primary,
              fontSize: 28,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Pantau perkembangan dan capaian tingkat pemahaman.',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildGroupedSlivers(
    Map<String, List<StudentAssessmentHistoryItem>> groupedData,
    BuildContext context,
  ) {
    final slivers = <Widget>[];

    groupedData.forEach((phase, items) {
      // Phase grouping styles based on phase content
      final isFaseA = phase.toLowerCase().contains('fase a');
      final phaseBgColor = isFaseA ? AppColors.surfaceContainerHigh : const Color(0xFFFFDAD5); // tertiary-fixed
      final phaseTextColor = isFaseA ? AppColors.primary : const Color(0xFF410000); // on-tertiary-fixed
      final phaseBorderColor = isFaseA ? AppColors.primary.withValues(alpha: 0.1) : const Color(0xFFFFB4A8); // tertiary-fixed-dim
      final phaseIcon = isFaseA ? Icons.school : Icons.menu_book;

      slivers.add(
        SliverPersistentHeader(
          pinned: true,
          delegate: _StickyHeaderDelegate(
            minHeight: 64,
            maxHeight: 64,
            child: Container(
              color: AppColors.background.withValues(alpha: 0.9),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              alignment: Alignment.centerLeft,
              child: ClipRRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: phaseBgColor,
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(color: phaseBorderColor),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(phaseIcon, size: 18, color: phaseTextColor),
                        const SizedBox(width: 8),
                        Text(
                          phase.toUpperCase(),
                          style: AppTextStyles.labelMedium.copyWith(
                            color: phaseTextColor,
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );

      slivers.add(
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final item = items[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: _HistoryCard(item: item),
                );
              },
              childCount: items.length,
            ),
          ),
        ),
      );
    });

    return slivers;
  }
}

class _HistoryCard extends StatelessWidget {
  final StudentAssessmentHistoryItem item;
  const _HistoryCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final isSynced = item.syncStatus == 'synced';
    final isPending = item.syncStatus == 'pending';

    // Status Pill Config
    Color pillBg;
    Color pillBorder;
    Color pillText;
    IconData pillIcon;
    String pillLabel;

    if (isSynced) {
      pillBg = const Color(0xFFECFDF5);
      pillBorder = const Color(0xFFD1FAE5);
      pillText = const Color(0xFF059669);
      pillIcon = Icons.cloud_done;
      pillLabel = 'Tersinkron';
    } else if (isPending) {
      pillBg = const Color(0xFFFEFCE8);
      pillBorder = const Color(0xFFFEF08A);
      pillText = const Color(0xFFCA8A04);
      pillIcon = Icons.hourglass_empty;
      pillLabel = 'Lokal';
    } else {
      pillBg = const Color(0xFFFEF2F2);
      pillBorder = const Color(0xFFFECACA);
      pillText = const Color(0xFFDC2626);
      pillIcon = Icons.error;
      pillLabel = 'Gagal';
    }

    // Date String
    final dateStr = item.completedAt != null
        ? '${item.completedAt!.day.toString().padLeft(2, '0')} ${_getMonthName(item.completedAt!.month)} ${item.completedAt!.year}'
        : 'Selesai';
    
    final levelNum = item.levelName?.replaceAll(RegExp(r'[^0-9]'), '') ?? '-';

    // Subject Area Gradient color
    final isLiterasi = item.subjectArea.toLowerCase().contains('literasi');
    final gradientColor = isLiterasi ? const Color(0xFFD4E3FF) : const Color(0xFFFFDDB0); // primary-fixed / secondary-fixed

    return GestureDetector(
      onTap: () => _showDetailBottomSheet(context, item),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLowest.withValues(alpha: 0.95),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.05),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Decorative subtle gradient
            Positioned(
              top: 0,
              right: 0,
              child: Container(
                width: 128,
                height: 128,
                decoration: BoxDecoration(
                  color: gradientColor.withValues(alpha: 0.3),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(128),
                    topRight: Radius.circular(20),
                  ),
                ),
              ),
            ),
            
            // Left border indicator if failed
            if (!isSynced && !isPending)
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                child: Container(
                  width: 4,
                  decoration: const BoxDecoration(
                    color: AppColors.error,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(20),
                      bottomLeft: Radius.circular(20),
                    ),
                  ),
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.categoryName,
                              style: AppTextStyles.heading2.copyWith(
                                color: AppColors.primary,
                                fontSize: 20,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              dateStr,
                              style: AppTextStyles.bodySmall.copyWith(
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 48,
                        height: 48,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black12,
                              blurRadius: 4,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          levelNum,
                          style: AppTextStyles.heading1.copyWith(
                            color: AppColors.onPrimary,
                            fontSize: 24,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    height: 1,
                    color: AppColors.surfaceContainer,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: pillBg,
                          border: Border.all(color: pillBorder),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(pillIcon, size: 14, color: pillText),
                            const SizedBox(width: 6),
                            Text(
                              pillLabel,
                              style: AppTextStyles.labelSmall.copyWith(
                                color: pillText,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(
                          color: Colors.transparent,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.arrow_forward,
                          size: 20,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getMonthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return months[month - 1];
  }
}

class _EmptyHistoryState extends StatelessWidget {
  final VoidCallback onStart;
  const _EmptyHistoryState({required this.onStart});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(maxWidth: 384), // max-w-sm
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.05),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 256,
                height: 256,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Image.network(
                      'https://lh3.googleusercontent.com/aida/AP1WRLs3GOa9AZbXG-X4LvRN9963C2qXNm0ieSXnza43CXsBxH4RAA7IfzeaVqnoqzbL26mR9kcU27h0cuQyRv91ptw9KNO_AAVm7WLNwAk0xJ3eRnQwKbHwGgWtzfT700UrRaoqDw6BF8P_ZvUk63d-LYoP-zfz4u1LtNsRABytDrRTIIpr6pHfkpOEmuzOJYZyNK1o-PPJQySUKAHqQLYSUIQCWjYqZNfTYFF1sPBUSUUtbbCwc99SN6H1yko',
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => const Icon(Icons.history, size: 80, color: AppColors.border),
                    ),
                    // Pinging dots
                    Positioned(
                      top: 60,
                      right: 60,
                      child: const _PingingDot(),
                    ),
                    Positioned(
                      bottom: 80,
                      left: 80,
                      child: const _PingingDot(delay: Duration(milliseconds: 500)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Belum Ada Riwayat',
                style: AppTextStyles.heading1.copyWith(
                  color: AppColors.onSurface,
                  fontSize: 28,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Selesaikan asesmen pertamamu untuk melihat progres belajarmu di sini.',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onStart,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.onPrimary,
                  minimumSize: const Size(double.infinity, 48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                ),
                icon: const Icon(Icons.play_arrow),
                label: Text(
                  'Mulai Asesmen Sekarang',
                  style: AppTextStyles.labelLarge.copyWith(color: AppColors.onPrimary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PingingDot extends StatefulWidget {
  final Duration delay;
  const _PingingDot({this.delay = Duration.zero});

  @override
  State<_PingingDot> createState() => _PingingDotState();
}

class _PingingDotState extends State<_PingingDot> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );

    _scaleAnimation = Tween<double>(begin: 1.0, end: 2.5).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutQuad),
    );
    _opacityAnimation = Tween<double>(begin: 0.8, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutQuad),
    );

    Future.delayed(widget.delay, () {
      if (mounted) {
        _controller.repeat();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            Opacity(
              opacity: _opacityAnimation.value,
              child: Transform.scale(
                scale: _scaleAnimation.value,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.kuningEmas, // secondary
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.kuningEmas,
                shape: BoxShape.circle,
              ),
            ),
          ],
        );
      },
    );
  }
}

// ── BOTTOM SHEET DETAIL ─────────────────────────────────────────────────────────────

void _showDetailBottomSheet(BuildContext context, StudentAssessmentHistoryItem item) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (ctx) {
      return Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLowest,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.08),
              offset: const Offset(0, -8),
              blurRadius: 30,
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Handle bar
                Container(
                  width: 48,
                  height: 6,
                  decoration: BoxDecoration(
                    color: AppColors.outlineVariant.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                const SizedBox(height: 24),
                
                // Header
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerHigh,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.surfaceTint.withValues(alpha: 0.1)),
                    boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                  ),
                  alignment: Alignment.center,
                  child: const Icon(Icons.menu_book, color: AppColors.primary, size: 32),
                ),
                const SizedBox(height: 16),
                Text(
                  item.categoryName,
                  style: AppTextStyles.heading2.copyWith(color: AppColors.onSurface),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  'Detail hasil pengerjaan asesmen',
                  style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant),
                ),
                const SizedBox(height: 24),
                
                // Details Grid
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.2)),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _detailRow('Kategori', item.subjectArea),
                      _detailDivider(),
                      _detailRow('Fase / Sesi', '${item.phase} / ${item.levelName ?? 'Selesai'}'),
                      _detailDivider(),
                      _detailRow('Level Dicapai', item.levelName ?? '-'),
                      _detailDivider(),
                      _detailRow('Waktu Pengerjaan', item.formattedTimeSpent),
                      _detailDivider(),
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Status Sinkronisasi',
                              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant),
                            ),
                            _buildSyncStatusBadge(item.syncStatus),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                
                // Action Button
                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.onPrimary,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: Text(
                    'Tutup',
                    style: AppTextStyles.labelLarge.copyWith(color: AppColors.onPrimary),
                  ),
                ),
              ],
            ),
          ),
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
          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant),
        ),
        Text(
          value,
          style: AppTextStyles.labelLarge.copyWith(color: AppColors.onSurface),
        ),
      ],
    ),
  );
}

Widget _detailDivider() {
  return Container(
    height: 1,
    color: AppColors.outlineVariant.withValues(alpha: 0.1),
  );
}

Widget _buildSyncStatusBadge(String status) {
  final isSynced = status == 'synced';
  final isPending = status == 'pending';

  Color pillBg;
  Color pillBorder;
  Color pillText;
  IconData pillIcon;
  String pillLabel;

  if (isSynced) {
    pillBg = const Color(0xFFECFDF5);
    pillBorder = const Color(0xFFD1FAE5);
    pillText = const Color(0xFF059669);
    pillIcon = Icons.cloud_done;
    pillLabel = 'Tersinkron';
  } else if (isPending) {
    pillBg = const Color(0xFFFEFCE8);
    pillBorder = const Color(0xFFFEF08A);
    pillText = const Color(0xFFCA8A04);
    pillIcon = Icons.hourglass_empty;
    pillLabel = 'Lokal';
  } else {
    pillBg = const Color(0xFFFEF2F2);
    pillBorder = const Color(0xFFFECACA);
    pillText = const Color(0xFFDC2626);
    pillIcon = Icons.error;
    pillLabel = 'Gagal';
  }

  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: pillBg,
      border: Border.all(color: pillBorder),
      borderRadius: BorderRadius.circular(12),
      boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2)],
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(pillIcon, size: 14, color: pillText),
        const SizedBox(width: 6),
        Text(
          pillLabel,
          style: AppTextStyles.labelSmall.copyWith(
            color: pillText,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    ),
  );
}

// ── STICKY HEADER DELEGATE ─────────────────────────────────────────────────────────

class _StickyHeaderDelegate extends SliverPersistentHeaderDelegate {
  final double minHeight;
  final double maxHeight;
  final Widget child;

  _StickyHeaderDelegate({
    required this.minHeight,
    required this.maxHeight,
    required this.child,
  });

  @override
  double get minExtent => minHeight;

  @override
  double get maxExtent => maxHeight;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return SizedBox.expand(child: child);
  }

  @override
  bool shouldRebuild(_StickyHeaderDelegate oldDelegate) {
    return maxHeight != oldDelegate.maxHeight ||
        minHeight != oldDelegate.minHeight ||
        child != oldDelegate.child;
  }
}
