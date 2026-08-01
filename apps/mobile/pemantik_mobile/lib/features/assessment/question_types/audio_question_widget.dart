import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../providers/assessment_provider.dart';
import 'components/question_header_widget.dart';

class AudioQuestionWidget extends ConsumerWidget {
  final QuestionData question;
  final String sessionId;

  const AudioQuestionWidget({
    super.key,
    required this.question,
    required this.sessionId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(
      selectedAnswerProvider(sessionId, question.id),
    );
    // Admin menyimpan options sebagai array strings langsung - di-parse ke format umum
    final rawChoices =
        question.options['choices'] as List<dynamic>? ??
        question.options['answers'] as List<dynamic>? ??
        [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        QuestionHeaderWidget(question: question),
        const SizedBox(height: 24),

        // Pilihan Ganda Text di bawahnya - safe-parse setiap format choice
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: rawChoices.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (_, i) {
            final choice = rawChoices[i];

            String value = '';
            String label = '';
            if (choice is Map) {
              value =
                  choice['value']?.toString() ?? choice['id']?.toString() ?? '';
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
                    .read(
                      assessmentControllerProvider(sessionId).notifier,
                    )
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
