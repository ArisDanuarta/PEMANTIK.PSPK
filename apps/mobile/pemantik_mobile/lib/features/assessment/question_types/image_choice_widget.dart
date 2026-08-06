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

    final rawChoices = List<dynamic>.from(
        question.options['choices'] as List<dynamic>? ??
        question.options['answers'] as List<dynamic>? ??
        []);
    
    final seed = sessionId.hashCode ^ question.id.hashCode;
    rawChoices.shuffle(Random(seed));

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
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Pilihan Gambar',
              style: AppTextStyles.labelMedium.copyWith(color: AppColors.onPrimaryContainer, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 16),
          QuestionHeaderWidget(question: question),
          const SizedBox(height: 24),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            separatorBuilder: (_, _) => const SizedBox(height: 16),
            itemCount: rawChoices.length,
            itemBuilder: (_, i) {
              final choice = rawChoices[i];

              String url = '';
              String label = '';
              if (choice is Map) {
                url = choice['url']?.toString() ?? choice['imageUrl']?.toString() ?? '';
                label = choice['label']?.toString() ?? choice['text']?.toString() ?? '';
              } else {
                url = choice.toString();
              }

              final isSelected = selected == url;

              return GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  ref.read(assessmentControllerProvider(sessionId).notifier).selectAnswer(question.id, url);
                },
                child: Stack(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected ? AppColors.secondaryContainer : AppColors.outlineVariant,
                          width: isSelected ? 4 : 1,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Column(
                          children: [
                            url.isNotEmpty
                                ? CachedNetworkImage(
                                    imageUrl: url,
                                    fit: BoxFit.contain,
                                    width: double.infinity,
                                    placeholder: (context, url) => const Center(
                                      child: Padding(
                                        padding: EdgeInsets.all(32.0),
                                        child: CircularProgressIndicator(color: AppColors.secondaryContainer),
                                      ),
                                    ),
                                    errorWidget: (context, url, error) => const Center(
                                      child: Padding(
                                        padding: EdgeInsets.all(32.0),
                                        child: Icon(Icons.broken_image_outlined, color: AppColors.onSurfaceVariant, size: 40),
                                      ),
                                    ),
                                  )
                                : Container(
                                    color: AppColors.surfaceVariant,
                                    height: 150,
                                    child: const Center(
                                      child: Icon(Icons.image_outlined, color: AppColors.onSurfaceVariant, size: 40),
                                    ),
                                  ),
                            if (label.isNotEmpty)
                              Container(
                                width: double.infinity,
                                color: AppColors.surface,
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                                child: Text(
                                  label,
                                  style: AppTextStyles.labelSmall.copyWith(
                                    color: isSelected ? AppColors.primary : AppColors.onSurfaceVariant,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  ),
                                  textAlign: TextAlign.center,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),

                    // Check icon overlay
                    if (isSelected)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          decoration: const BoxDecoration(
                            color: AppColors.secondaryContainer,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.check_circle, color: AppColors.onSecondaryFixed, size: 24),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
