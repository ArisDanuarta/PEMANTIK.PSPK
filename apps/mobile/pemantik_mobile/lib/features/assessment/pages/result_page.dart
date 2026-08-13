import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/router/app_router.dart';
import 'package:lottie/lottie.dart';

class ResultPage extends StatelessWidget {
  final bool isPassed;
  final String? customMessage;
  final Map<String, dynamic>? nextLevelArgs;

  const ResultPage({
    super.key,
    required this.isPassed,
    this.customMessage,
    this.nextLevelArgs,
  });

  @override
  Widget build(BuildContext context) {
    final hasNextLevel = isPassed && nextLevelArgs != null;
    final nextLevelNumber = nextLevelArgs?['levelNumber'] as int?;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isPassed
                ? [
                    AppColors.kuningEmas.withValues(alpha: 0.2),
                    AppColors.background
                  ]
                : [
                    const Color(0xFFE0E6ED),
                    Colors.white,
                  ],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                child: Container(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // --- Animasi ---
                      SizedBox(
                        width: 200,
                        height: 200,
                        child: Lottie.asset(
                          isPassed
                              ? 'assets/animations/Success.json'
                              : 'assets/animations/Failed.json',
                          repeat: false,
                          fit: BoxFit.contain,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // --- Judul ---
                      Text(
                        isPassed ? 'Bagus Sekali!' : 'Belum Tepat',
                        style: AppTextStyles.heading1.copyWith(
                          color: AppColors.primary,
                          fontSize: 32,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),

                      // --- Kartu Info ---
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryContainer.withValues(alpha: 0.08),
                              blurRadius: 30,
                              offset: const Offset(0, 8),
                            )
                          ],
                          border: isPassed
                              ? null
                              : Border.all(
                                  color: AppColors.surfaceVariant.withValues(alpha: 0.3),
                                ),
                        ),
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            // Accent Graphic (Flame Motif)
                            Positioned(
                              top: -40,
                              right: -40,
                              child: Transform.rotate(
                                angle: isPassed ? 0 : 0.2,
                                child: Icon(
                                  Icons.local_fire_department,
                                  size: 120,
                                  color: isPassed
                                      ? AppColors.kuningEmas.withValues(alpha: 0.2)
                                      : AppColors.surfaceTint.withValues(alpha: 0.1),
                                ),
                              ),
                            ),
                            // Isi Kartu
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                if (isPassed) ...[
                                  Text(
                                    'CAPAIAN LEVEL',
                                    style: AppTextStyles.labelMedium.copyWith(
                                      color: AppColors.onSurfaceVariant,
                                      letterSpacing: 2,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  if (customMessage != null && customMessage!.isNotEmpty)
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.star, color: AppColors.kuningEmas),
                                        const SizedBox(width: 8),
                                        Flexible(
                                          child: Text(
                                            customMessage!,
                                            style: AppTextStyles.heading2.copyWith(
                                              color: AppColors.primary,
                                            ),
                                            textAlign: TextAlign.center,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        const Icon(Icons.star, color: AppColors.kuningEmas),
                                      ],
                                    ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Luar biasa! Kamu telah menyelesaikan penilaian ini dengan sangat baik. Terus pertahankan semangat belajarmu!',
                                    style: AppTextStyles.bodyMedium.copyWith(
                                      color: AppColors.onSurfaceVariant,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ] else ...[
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.lightbulb, color: AppColors.jingga),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Catatan Belajar',
                                        style: AppTextStyles.heading2.copyWith(
                                          color: AppColors.jingga,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    (customMessage != null && customMessage!.isNotEmpty)
                                        ? customMessage!
                                        : 'Tidak apa-apa, setiap kesalahan adalah proses belajar. Jangan menyerah, ayo coba pelajari materinya lagi!',
                                    style: AppTextStyles.bodyMedium.copyWith(
                                      color: AppColors.onSurfaceVariant,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 48),

                      // --- Tombol Level Berikutnya ---
                      // Hanya muncul jika anak lulus DAN ada level berikutnya yang tersedia
                      if (hasNextLevel) ...[
                        ElevatedButton(
                          onPressed: () {
                            Navigator.of(context).pushNamedAndRemoveUntil(
                              AppRouter.assessmentLobby,
                              // Hapus semua route sampai ke halaman daftar level
                              (route) => route.settings.name == AppRouter.assessmentLevels,
                              arguments: nextLevelArgs,
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.kuningEmas,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 56),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(100),
                            ),
                            elevation: 8,
                            shadowColor: AppColors.kuningEmas.withValues(alpha: 0.4),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.arrow_forward_rounded, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                nextLevelNumber != null
                                    ? 'Lanjut ke Level $nextLevelNumber'
                                    : 'Level Berikutnya',
                                style: AppTextStyles.labelLarge.copyWith(color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // --- Tombol Kembali ke Beranda ---
                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(context)
                              .pushNamedAndRemoveUntil(AppRouter.home, (_) => false);
                        },
                        style: ElevatedButton.styleFrom(
                          // Jika ada tombol next level, jadikan tombol home lebih subtle
                          backgroundColor: hasNextLevel ? Colors.white : AppColors.primary,
                          foregroundColor:
                              hasNextLevel ? AppColors.primary : AppColors.onPrimary,
                          minimumSize: const Size(double.infinity, 56),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(100),
                            side: hasNextLevel
                                ? BorderSide(
                                    color: AppColors.primary.withValues(alpha: 0.3))
                                : BorderSide.none,
                          ),
                          elevation: hasNextLevel ? 0 : 8,
                          shadowColor: AppColors.primaryContainer.withValues(alpha: 0.3),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.home,
                              size: 20,
                              color: hasNextLevel ? AppColors.primary : Colors.white,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Kembali ke Beranda',
                              style: AppTextStyles.labelLarge.copyWith(
                                color: hasNextLevel ? AppColors.primary : Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
