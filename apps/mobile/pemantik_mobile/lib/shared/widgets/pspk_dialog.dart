import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import 'pspk_button.dart';

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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Ikon Status
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: isError
                      ? AppColors.merahMarun.withValues(alpha: 0.1)
                      : AppColors.sukses.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isError ? Icons.error_outline : Icons.check_circle_outline,
                  color: isError ? AppColors.merahMarun : AppColors.sukses,
                  size: 36,
                ),
              ),
              const SizedBox(height: 20),

              // Judul
              Text(
                title,
                style: AppTextStyles.heading2,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),

              // Pesan
              Text(
                message,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textMuted,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),

              // Tombol Konfirmasi
              PspkButton(
                label: confirmText,
                fullWidth: true,
                onPressed: () {
                  Navigator.of(dialogContext).pop(); // Tutup dialog dulu
                  if (onConfirm != null) {
                    onConfirm(); // Jalankan aksi lanjutan jika ada
                  }
                },
              ),
            ],
          ),
        ),
      );
    },
  );
}
