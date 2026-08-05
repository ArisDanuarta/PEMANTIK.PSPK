import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import 'pemantik_animated_logo.dart';

Future<void> showPspkDialog(
  BuildContext context, {
  required String title,
  required String message,
  bool isError = false,
  String confirmText = 'Mengerti',
  VoidCallback? onConfirm,
}) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false, // Memaksa user untuk menekan tombol
    builder: (BuildContext dialogContext) {
      return Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)), // 3xl
        backgroundColor: AppColors.surfaceContainerLowest,
        elevation: 0, // In modern Flutter, we might want to use shadowColor but the HTML uses shadow-2xl. We can just rely on Dialog's default shadow or set elevation.
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Ikon Status
              isError
                  ? Container(
                      width: 80,
                      height: 80,
                      decoration: const BoxDecoration(
                        color: AppColors.errorContainer,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.error_outline,
                        color: AppColors.onErrorContainer,
                        size: 40,
                      ),
                    )
                  : const PemantikAnimatedLogo(size: 120),
              const SizedBox(height: 24),

              // Judul
              Text(
                title,
                style: AppTextStyles.heading2,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),

              // Pesan
              Text(
                message,
                style: AppTextStyles.bodyLarge.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Tombol Konfirmasi
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(dialogContext).pop();
                    if (onConfirm != null) {
                      onConfirm();
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isError ? AppColors.surfaceVariant : AppColors.primary,
                    foregroundColor: isError ? AppColors.onSurfaceVariant : AppColors.onPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    confirmText,
                    style: AppTextStyles.bodyLarge.copyWith(
                      fontWeight: FontWeight.w500,
                      color: isError ? AppColors.onSurfaceVariant : Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}
