import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/pspk_button.dart';
import '../../../core/router/app_router.dart';
import 'package:lottie/lottie.dart';

class ResultPage extends StatelessWidget {
  final bool isPassed;
  final String? customMessage;

  const ResultPage({super.key, required this.isPassed, this.customMessage});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              child: Container(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight,
                ),
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const SizedBox(height: 20),

                    // --- BAGIAN TENGAH ---
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Ikon Status
                        SizedBox(
                          width: 120,
                          height: 120,
                          child: Lottie.asset(
                            isPassed 
                                ? 'assets/animations/Success.json' 
                                : 'assets/animations/Failed.json',
                            repeat: false,
                            fit: BoxFit.contain,
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Teks Konfirmasi
                        Text(
                          isPassed ? 'Bagus Sekali!' : 'Belum Tepat',
                          style: AppTextStyles.heading1,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          isPassed
                              ? 'Kamu sudah menyelesaikan asesmen ini dengan sangat baik. Jawabanmu sudah dikirim ke guru.'
                              : 'Tidak apa-apa, tetap semangat! Kamu bisa mempelajarinya lagi nanti.',
                          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textMuted),
                          textAlign: TextAlign.center,
                        ),
                        if (customMessage != null && customMessage!.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isPassed 
                                  ? AppColors.sukses.withValues(alpha: 0.1)
                                  : AppColors.merahMarun.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isPassed 
                                    ? AppColors.sukses.withValues(alpha: 0.3)
                                    : AppColors.merahMarun.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Column(
                              children: [
                                Text(
                                  isPassed ? 'Capaian Level:' : 'Catatan Tambahan:',
                                  style: AppTextStyles.bodyMedium.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: isPassed ? AppColors.sukses : AppColors.merahMarun,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  customMessage!,
                                  style: AppTextStyles.bodyMedium,
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),

                    // --- BAGIAN BAWAH ---
                    Padding(
                      padding: const EdgeInsets.only(top: 32.0),
                      child: PspkButton(
                        label: 'Kembali ke Beranda',
                        fullWidth: true,
                        onPressed: () {
                          Navigator.of(
                            context,
                          ).pushNamedAndRemoveUntil(AppRouter.home, (_) => false);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
