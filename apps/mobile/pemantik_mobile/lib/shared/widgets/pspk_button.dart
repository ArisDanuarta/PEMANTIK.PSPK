import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

enum ButtonSize { normal, small }

class PspkButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool fullWidth;
  final ButtonSize size;
  final bool outlined;

  const PspkButton({
    super.key,
    required this.label,
    this.onPressed,
    this.fullWidth = false,
    this.size = ButtonSize.normal,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;
    final height = size == ButtonSize.normal ? 52.0 : 40.0;
    final fontSize = size == ButtonSize.normal ? 16.0 : 14.0;

    final bg = outlined
        ? Colors.transparent
        : disabled
        ? AppColors.border
        : AppColors.kuningEmas;

    final textColor = outlined ? AppColors.birNavy : Colors.white;

    return SizedBox(
      height: height,
      width: fullWidth ? double.infinity : null,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: textColor,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: outlined
                ? const BorderSide(color: AppColors.birNavy, width: 1.5)
                : BorderSide.none,
          ),
          padding: EdgeInsets.symmetric(
            horizontal: size == ButtonSize.normal ? 24 : 16,
          ),
        ),
        child: Text(
          label,
          style: AppTextStyles.buttonText.copyWith(
            fontSize: fontSize,
            color: textColor,
          ),
        ),
      ),
    );
  }
}
