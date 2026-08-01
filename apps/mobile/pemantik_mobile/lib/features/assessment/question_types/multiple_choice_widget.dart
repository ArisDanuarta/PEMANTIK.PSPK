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
    // Memantau jawaban yang dipilih saat ini dari state provider
    final selected = ref.watch(selectedAnswerProvider(sessionId, question.id));
    final seed = sessionId.hashCode ^ question.id.hashCode;
    final choices = List<dynamic>.from(question.options['choices'] as List<dynamic>? ?? [])
      ..shuffle(Random(seed));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
              value =
                  choice['value']?.toString() ??
                  choice['id']?.toString() ??
                  choice['key']?.toString() ??
                  '';
              label =
                  choice['label']?.toString() ??
                  choice['text']?.toString() ??
                  value;
            } else {
              value = choice.toString();
              label = choice.toString();
            }

            final isSelected = selected == value;

            return GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                ref
                    .read(assessmentControllerProvider(sessionId).notifier)
                    .selectAnswer(question.id, value);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.birNavy : AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? AppColors.birNavy : AppColors.border,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    // Radio indicator
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected ? Colors.white : AppColors.border,
                          width: isSelected ? 5 : 2,
                        ),
                        color: isSelected
                            ? AppColors.birNavy
                            : Colors.transparent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        label,
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: isSelected ? Colors.white : AppColors.birNavy,
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
