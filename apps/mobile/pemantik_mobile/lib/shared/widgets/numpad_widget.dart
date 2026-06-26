import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

enum KeyVariant { normal, action, primary }

class NumpadWidget extends StatelessWidget {
  final Function(String) onDigitPressed;
  final VoidCallback onDelete;
  final VoidCallback onConfirm;
  final bool confirmEnabled;

  const NumpadWidget({
    super.key,
    required this.onDigitPressed,
    required this.onDelete,
    required this.onConfirm,
    this.confirmEnabled = false,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.6,
      children: [
        ...[
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
        ].map((d) => _NumpadKey(label: d, onPressed: () => onDigitPressed(d))),
        _NumpadKey(label: '⌫', onPressed: onDelete, variant: KeyVariant.action),
        _NumpadKey(label: '0', onPressed: () => onDigitPressed('0')),
        _NumpadKey(
          label: 'Masuk',
          onPressed: confirmEnabled ? onConfirm : null,
          variant: KeyVariant.primary,
        ),
      ],
    );
  }
}

class _NumpadKey extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final KeyVariant variant;

  const _NumpadKey({
    required this.label,
    this.onPressed,
    this.variant = KeyVariant.normal,
  });

  @override
  Widget build(BuildContext context) {
    final bg = switch (variant) {
      KeyVariant.primary =>
        onPressed != null ? AppColors.kuningEmas : AppColors.border,
      KeyVariant.action => AppColors.birNavyMuda,
      KeyVariant.normal => AppColors.surface,
    };

    final textColor = switch (variant) {
      KeyVariant.primary => Colors.white,
      KeyVariant.action => AppColors.birNavy,
      KeyVariant.normal => AppColors.birNavy,
    };

    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onPressed,
        child: Center(
          child: Text(
            label,
            style: AppTextStyles.buttonText.copyWith(
              color: textColor,
              fontSize: label.length > 1 ? 14 : 22,
            ),
          ),
        ),
      ),
    );
  }
}
