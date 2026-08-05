import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../providers/assessment_provider.dart';
import 'components/question_header_widget.dart';

class MultipleChoiceWidget extends ConsumerWidget {
  final QuestionData question;
  final String sessionId;

  const MultipleChoiceWidget({
    super.key,
    required this.question,
    required this.sessionId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(selectedAnswerProvider(sessionId, question.id));
    final seed = sessionId.hashCode ^ question.id.hashCode;
    final choices = List<dynamic>.from(question.options['choices'] as List<dynamic>? ?? [])
      ..shuffle(Random(seed));

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.outlineVariant),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tipe Soal Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Pilihan Ganda',
              style: AppTextStyles.labelMedium.copyWith(color: AppColors.onPrimaryContainer, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 16),
          QuestionHeaderWidget(question: question),
          const SizedBox(height: 24),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: choices.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (_, i) {
              final choice = choices[i];

              String value = '';
              String label = '';

              if (choice is Map) {
                value = choice['value']?.toString() ?? choice['id']?.toString() ?? choice['key']?.toString() ?? '';
                label = choice['label']?.toString() ?? choice['text']?.toString() ?? value;
              } else {
                value = choice.toString();
                label = choice.toString();
              }

              final isSelected = selected == value;
              final letter = String.fromCharCode(65 + i);

              return GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  ref.read(assessmentControllerProvider(sessionId).notifier).selectAnswer(question.id, value);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.secondaryContainer.withValues(alpha: 0.2) : AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppColors.secondaryContainer : AppColors.outlineVariant,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Letter indicator
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.secondaryContainer : AppColors.surface,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected ? AppColors.secondaryContainer : AppColors.outlineVariant,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          letter,
                          style: AppTextStyles.heading3.copyWith(
                            color: isSelected ? AppColors.onSecondaryFixed : AppColors.onSurfaceVariant,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(
                          label,
                          style: AppTextStyles.bodyLarge.copyWith(
                            color: AppColors.onSurface,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ),
                      if (isSelected) ...[
                        const SizedBox(width: 16),
                        const Icon(Icons.check_circle, color: AppColors.secondaryContainer, size: 24),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
