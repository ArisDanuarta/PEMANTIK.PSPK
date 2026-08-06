
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/router/app_router.dart';
import '../providers/assessment_levels_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../../core/database/database.dart';
import '../../../core/sync/sync_service.dart';

final categoryNameProvider = FutureProvider.family<String, String>((ref, id) async {
  final db = ref.watch(databaseProvider);
  final category = await db.categoryDao.getCategoryById(id);
  return category?.name ?? 'Kategori Asesmen';
});

class DiagonalStripesPainter extends CustomPainter {
  final Color color;
  final double width;
  final double space;

  DiagonalStripesPainter({
    required this.color,
    this.width = 1.0,
    this.space = 10.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = width
      ..style = PaintingStyle.stroke;

    final double maxDimension = size.width + size.height;

    for (double i = -maxDimension; i < maxDimension; i += space) {
      canvas.drawLine(
        Offset(i, 0),
        Offset(i + maxDimension, maxDimension),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class AssessmentLevelsPage extends ConsumerWidget {
  final String categoryId;

  const AssessmentLevelsPage({super.key, required this.categoryId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final levelsAsync = ref.watch(assessmentLevelsProvider(categoryId));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context, ref),
            Expanded(
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

                  return RefreshIndicator(
                    onRefresh: () async {
                      try {
                        await ref.read(syncServiceProvider).syncPastSessions();
                        // ignore: unused_result
                        ref.refresh(assessmentLevelsProvider(categoryId));
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Gagal sinkronisasi: $e')),
                          );
                        }
                      }
                    },
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(bottom: 24),
                            child: Text(
                              'Selesaikan level secara berurutan untuk menguasai materi.',
                              style: AppTextStyles.bodyMedium.copyWith(
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                          ),
                          // Roadmap Stack
                          Stack(
                            children: [
                              // Vertical Line
                              Positioned(
                                left: 28, // 56 / 2
                                top: 28,
                                bottom: 28,
                                child: Container(
                                  width: 2,
                                  color: AppColors.outlineVariant,
                                ),
                              ),
                              // Items
                              Column(
                                children: List.generate(levels.length, (index) {
                                  final info = levels[index];
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 24),
                                    child: _LevelRow(categoryId: categoryId, info: info, index: index),
                                  );
                                }),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
                loading: () => const Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
                error: (e, _) => Center(child: Text('Terjadi kesalahan: $e')),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, WidgetRef ref) {
    final nameAsync = ref.watch(categoryNameProvider(categoryId));

    String catName = nameAsync.value ?? 'Daftar Level';
    String initials = _getInitials(catName);

    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 2,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.primary),
            onPressed: () => Navigator.pop(context),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
          const SizedBox(width: 16),
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: AppColors.primaryContainer,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              initials,
              style: AppTextStyles.heading2.copyWith(
                color: AppColors.onPrimaryContainer,
                fontSize: 16,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              catName,
              style: AppTextStyles.heading1.copyWith(
                color: AppColors.primary,
                fontSize: 20,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.cloud_done, color: AppColors.primary),
            onPressed: () async {
              try {
                await ref.read(syncServiceProvider).syncPastSessions();
                // ignore: unused_result
                ref.refresh(assessmentLevelsProvider(categoryId));
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Sinkronisasi selesai!'),
                      backgroundColor: AppColors.sukses,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Gagal sinkronisasi: $e'),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              }
            },
          ),
        ],
      ),
    );
  }

  String _getInitials(String name) {
    final words = name.split(' ');
    if (words.isEmpty) return '??';
    if (words.length == 1) {
      return words[0].substring(0, 1).toUpperCase();
    }
    return '${words[0].substring(0, 1)}${words[1].substring(0, 1)}'.toUpperCase();
  }
}

class _LevelRow extends ConsumerWidget {
  final String categoryId;
  final LevelInfo info;
  final int index;

  const _LevelRow({
    required this.categoryId,
    required this.info,
    required this.index,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final level = info.level;
    bool isLocked = !info.isUnlocked;
    bool isPassed = info.isPassed;
    bool isFailed = info.isFailed;

    if (isFailed) isLocked = true; // Still locked from progressing to next, but shows failed state

    final String levelNumStr = level.levelNumber.toString().padLeft(2, '0');
    final String title = 'Level ${level.levelNumber}';

    // State Colors
    const Color softTeal = Color(0xFFE6F4F1);
    const Color softMaroon = Color(0xFFFDECEC);
    const Color gold = Color(0xFFFFD700);

    Widget indicator;
    Widget card;

    if (isPassed) {
      indicator = _buildIndicator(levelNumStr, AppColors.primary, softTeal, Colors.white);
      card = _buildCompletedCard(title);
    } else if (isFailed) {
      indicator = _buildIndicator(levelNumStr, AppColors.primary, softMaroon, Colors.white);
      card = _buildFailedCard(context, ref, title, level.id);
    } else if (!isLocked) {
      // Active
      indicator = _buildActiveIndicator(levelNumStr, AppColors.primary, Colors.white, gold);
      card = _buildActiveCard(context, title, level, info.totalQuestions);
    } else {
      // Locked
      indicator = _buildIndicator(levelNumStr, const Color(0xFF74777F), AppColors.surfaceContainer, Colors.white);
      card = _buildLockedCard(title);
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        indicator,
        const SizedBox(width: 16),
        Expanded(child: card),
      ],
    );
  }

  Widget _buildIndicator(String text, Color textColor, Color bgColor, Color borderColor) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: 2),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
      ),
      alignment: Alignment.center,
      child: Text(
        text,
        style: AppTextStyles.heading1.copyWith(color: textColor, fontSize: 24),
      ),
    );
  }

  Widget _buildActiveIndicator(String text, Color textColor, Color bgColor, Color borderColor) {
    return SizedBox(
      width: 56,
      height: 56,
      child: Stack(
        alignment: Alignment.center,
        children: [
          const _PingingRing(color: Color(0xFFFFD700)),
          _buildIndicator(text, textColor, bgColor, borderColor),
        ],
      ),
    );
  }

  Widget _buildCompletedCard(String title) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFE6F4F1), // soft-teal
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            right: -20,
            bottom: -20,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
                boxShadow: const [BoxShadow(color: Colors.white24, blurRadius: 30)],
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.heading2.copyWith(color: AppColors.primary),
                  ),
                  const Icon(Icons.check_circle, color: AppColors.sukses, size: 32),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Selesai',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActiveCard(BuildContext context, String title, LocalLevel level, int totalQuestions) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFFD700)), // gold
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.08),
            blurRadius: 30,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: AppTextStyles.heading2.copyWith(color: AppColors.primary),
          ),
          const SizedBox(height: 4),
          Text(
            '$totalQuestions Soal • Estimasi ${level.timeLimitSec != null ? (level.timeLimitSec! ~/ 60) : 30} menit',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pushNamed(
                AppRouter.assessmentLobby,
                arguments: {
                  'categoryId': categoryId,
                  'levelId': level.id,
                  'levelNumber': level.levelNumber,
                  'accessCode': level.accessCode,
                  'totalQuestions': totalQuestions,
                  'passingThreshold': level.passingThreshold,
                  'timeLimitSec': level.timeLimitSec ?? 60,
                  'learningObjective': level.learningObjective,
                  'successMessage': level.successMessage,
                  'failureMessage': level.failureMessage,
                },
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.onPrimary,
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 0,
            ),
            child: Text(
              'Mulai',
              style: AppTextStyles.labelLarge.copyWith(color: AppColors.onPrimary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFailedCard(BuildContext context, WidgetRef ref, String title, String levelId) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFDECEC), // soft-maroon
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: AppTextStyles.heading2.copyWith(color: AppColors.primary),
              ),
              const Icon(Icons.cancel, color: AppColors.error, size: 32),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            info.isForcedExit
                ? 'Sesi digagalkan secara otomatis karena anak terdeteksi keluar dari aplikasi saat asesmen berlangsung.'
                : (info.level.failureMessage ?? 'Kamu Hebat, Tetap Memetik Potensi Kamu. Jangan menyerah, ayo coba lagi!'),
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.error),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () => _showHistoryModal(context, ref, levelId),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary, width: 2),
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text(
              'Cek Riwayat',
              style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLockedCard(String title) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: CustomPaint(
        painter: DiagonalStripesPainter(
          color: Colors.black.withValues(alpha: 0.02),
          width: 10,
          space: 20,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: AppTextStyles.heading2.copyWith(color: const Color(0xFF74777F)),
                ),
                const Icon(Icons.lock, color: Color(0xFF74777F), size: 28),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: null,
              style: ElevatedButton.styleFrom(
                disabledBackgroundColor: AppColors.outlineVariant,
                disabledForegroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: Text(
                'Terkunci',
                style: AppTextStyles.labelLarge.copyWith(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

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
                crossAxisAlignment: CrossAxisAlignment.center,
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
                  
                  Text('Riwayat & Sinkronisasi', style: AppTextStyles.heading2),
                  const SizedBox(height: 16),
                  
                  if (sessions.isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(32.0),
                      child: Text(
                        'Belum ada riwayat pengerjaan.',
                        style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant),
                      ),
                    )
                  else
                    Flexible(
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: sessions.length,
                        itemBuilder: (context, index) {
                          final item = sessions[index];
                          final session = item.session;

                          Color syncColor = const Color(0xFFCA8A04);
                          String syncText = 'Lokal';
                          IconData syncIcon = Icons.hourglass_empty;
                          Color pillBg = const Color(0xFFFEFCE8);
                          Color pillBorder = const Color(0xFFFEF08A);

                          if (session.syncStatus == 'synced') {
                            syncColor = const Color(0xFF059669);
                            syncText = 'Tersinkron';
                            syncIcon = Icons.cloud_done;
                            pillBg = const Color(0xFFECFDF5);
                            pillBorder = const Color(0xFFD1FAE5);
                          } else if (session.syncStatus == 'failed') {
                            syncColor = const Color(0xFFDC2626);
                            syncText = 'Gagal';
                            syncIcon = Icons.error;
                            pillBg = const Color(0xFFFEF2F2);
                            pillBorder = const Color(0xFFFECACA);
                          }

                          final dateStr = session.completedAt != null
                              ? '${session.completedAt!.day.toString().padLeft(2, '0')}/${session.completedAt!.month.toString().padLeft(2, '0')}/${session.completedAt!.year} ${session.completedAt!.hour.toString().padLeft(2, '0')}:${session.completedAt!.minute.toString().padLeft(2, '0')}'
                              : '-';

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.2)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Sesi Pengerjaan Selesai',
                                      style: AppTextStyles.heading2.copyWith(fontSize: 15, color: AppColors.primary),
                                    ),
                                    const SizedBox(height: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: pillBg,
                                        border: Border.all(color: pillBorder),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(syncIcon, size: 12, color: syncColor),
                                          const SizedBox(width: 4),
                                          Text(
                                            syncText,
                                            style: AppTextStyles.labelSmall.copyWith(
                                              color: syncColor,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  dateStr,
                                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.onSurfaceVariant),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
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
}

class _PingingRing extends StatefulWidget {
  final Color color;
  const _PingingRing({required this.color});

  @override
  State<_PingingRing> createState() => _PingingRingState();
}

class _PingingRingState extends State<_PingingRing> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.4).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
    _opacityAnimation = Tween<double>(begin: 0.5, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
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
        return Opacity(
          opacity: _opacityAnimation.value,
          child: Transform.scale(
            scale: _scaleAnimation.value,
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: widget.color, width: 2),
              ),
            ),
          ),
        );
      },
    );
  }
}
