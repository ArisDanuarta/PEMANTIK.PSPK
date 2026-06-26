import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/pspk_button.dart';
import '../../../core/router/app_router.dart';

class ResultPage extends StatelessWidget {
  final bool isPassed;

  const ResultPage({super.key, required this.isPassed});

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
                        Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isPassed
                                ? AppColors.sukses.withValues(alpha: 0.12)
                                : AppColors.kuningEmas.withValues(alpha: 0.12),
                          ),
                          child: Icon(
                            isPassed ? Icons.check_outlined : Icons.refresh_outlined,
                            color: isPassed ? AppColors.sukses : AppColors.kuningEmas,
                            size: 48,
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
                          style: AppTextStyles.bodyLarge.copyWith(
                            color: AppColors.textMuted,
                          ),
                          textAlign: TextAlign.center,
                        ),
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
