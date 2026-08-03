import 'dart:math';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../providers/assessment_provider.dart';
import 'components/question_header_widget.dart';

class ImageChoiceWidget extends ConsumerWidget {
  final QuestionData question;
  final String sessionId;

  const ImageChoiceWidget({
    super.key,
    required this.question,
    required this.sessionId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(selectedAnswerProvider(sessionId, question.id));

    // Admin menyimpan options sebagai List of {url, label}
    // Bisa juga berformat List langsung dari database native
    final rawChoices = List<dynamic>.from(
        question.options['choices'] as List<dynamic>? ??
        question.options['answers'] as List<dynamic>? ??
        []);
    
    final seed = sessionId.hashCode ^ question.id.hashCode;
    rawChoices.shuffle(Random(seed));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        QuestionHeaderWidget(question: question),
        const SizedBox(height: 24),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 0.85,
          ),
          itemCount: rawChoices.length,
          itemBuilder: (_, i) {
            final choice = rawChoices[i];

            // Admin saves image choices as {'url': '...', 'label': '...'}
            String url = '';
            String label = '';
            if (choice is Map) {
              url =
                  choice['url']?.toString() ??
                  choice['imageUrl']?.toString() ??
                  '';
              label =
                  choice['label']?.toString() ??
                  choice['text']?.toString() ??
                  '';
            } else {
              url = choice.toString();
            }

            // User's answer is the URL of the selected image
            final isSelected = selected == url;

            return GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                ref
                    .read(assessmentControllerProvider(sessionId).notifier)
                    .selectAnswer(question.id, url);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.birNavy.withValues(alpha: 0.1)
                      : AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? AppColors.birNavy : AppColors.border,
                    width: isSelected ? 3 : 1,
                  ),
                ),
                child: Column(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(14),
                        ),
                        child: url.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: url,
                                fit: BoxFit.contain,
                                width: double.infinity,
                                placeholder: (context, url) => const Center(
                                  child: CircularProgressIndicator(
                                    color: AppColors.kuningEmas,
                                  ),
                                ),
                                errorWidget: (context, url, error) =>
                                    const Center(
                                      child: Icon(
                                        Icons.broken_image_outlined,
                                        color: AppColors.textMuted,
                                        size: 40,
                                      ),
                                    ),
                              )
                            : Container(
                                color: AppColors.border,
                                child: const Center(
                                  child: Icon(
                                    Icons.image_outlined,
                                    color: AppColors.textMuted,
                                    size: 40,
                                  ),
                                ),
                              ),
                      ),
                    ),
                    if (label.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 6,
                        ),
                        child: Text(
                          label,
                          style: AppTextStyles.label.copyWith(
                            color: isSelected
                                ? AppColors.birNavy
                                : AppColors.textMuted,
                            fontWeight: isSelected
                                ? FontWeight.w600
                                : FontWeight.normal,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
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
