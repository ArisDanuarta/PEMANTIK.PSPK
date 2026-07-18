import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../providers/assessment_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

/// DragDropWidget mendukung 3 subtype yang dibuat di Admin Soal:
/// 1. fill_blank  - seret kata ke dalam kalimat rumpang
/// 2. sorting     - urutkan item dengan tap atau drag
/// 3. matching    - pasangkan kolom kiri dengan kolom kanan
class DragDropWidget extends ConsumerStatefulWidget {
  final QuestionData question;
  final String sessionId;

  const DragDropWidget({
    super.key,
    required this.question,
    required this.sessionId,
  });

  @override
  ConsumerState<DragDropWidget> createState() => _DragDropWidgetState();
}

class _DragDropWidgetState extends ConsumerState<DragDropWidget> {
  late String _subtype;

  // Fill Blank state
  Map<int, String> _filledWords = {};

  // Sorting state - list indeks dari sortItems dalam urutan yang dipilih user
  late List<Map<String, dynamic>> _sortItems;
  late List<Map<String, dynamic>> _sortAnswer;

  // Matching state - map leftId → rightId
  late Map<String, String> _matchMap;
  String? _selectedLeftId;

  @override
  void initState() {
    super.initState();
    _subtype = widget.question.options['subtype'] as String? ?? 'fill_blank';
    _initState();
  }

  void _initState() {
    // Buat seed unik per sesi dan pertanyaan agar acakannya konsisten selama satu sesi
    final seed = widget.sessionId.hashCode ^ widget.question.id.hashCode;

    // Ambil jawaban yang sudah tersimpan sebelumnya (kalau ada)
    final savedAnswerStr = ref.read(selectedAnswerProvider(widget.sessionId, widget.question.id));
    Map<String, dynamic> savedAnswer = {};
    if (savedAnswerStr != null && savedAnswerStr.isNotEmpty) {
      try {
        savedAnswer = jsonDecode(savedAnswerStr);
      } catch (_) {}
    }

    switch (_subtype) {
      case 'sorting':
        final rawItems =
            widget.question.options['items'] as List<dynamic>? ?? [];
        _sortItems = rawItems
            .map<Map<String, dynamic>>(
              (e) => Map<String, dynamic>.from(e as Map),
            )
            .toList();
        _sortItems.shuffle(Random(seed));
        _sortAnswer = [];
        
        // Restore saved answer
        if (savedAnswer.containsKey('order')) {
          final orderIds = (savedAnswer['order'] as List<dynamic>).map((e) => e.toString()).toList();
          for (final id in orderIds) {
            final idx = _sortItems.indexWhere((item) => item['id']?.toString() == id);
            if (idx != -1) {
              _sortAnswer.add(_sortItems.removeAt(idx));
            }
          }
        }
        break;
      case 'matching':
        _matchMap = {};
        _selectedLeftId = null;
        
        // Restore saved answer
        if (savedAnswer.containsKey('pairs')) {
          final pairs = savedAnswer['pairs'] as List<dynamic>;
          for (final pair in pairs) {
            if (pair is Map) {
              final leftId = pair['left_id']?.toString();
              final rightId = pair['right_id']?.toString();
              if (leftId != null && rightId != null) {
                _matchMap[leftId] = rightId;
              }
            }
          }
        }
        break;
      default:
        _filledWords = {};
        
        // Restore saved answer
        if (savedAnswer.containsKey('words')) {
          final words = savedAnswer['words'] as List<dynamic>;
          for (int i = 0; i < words.length; i++) {
            if (words[i] != null) {
              _filledWords[i] = words[i].toString();
            }
          }
        }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  void _submitAnswer(Map<String, dynamic> answer) {
    ref
        .read(assessmentControllerProvider(widget.sessionId).notifier)
        .selectAnswer(widget.question.id, jsonEncode(answer));
  }

  // ── Fill Blank ─────────────────────────────────────────────────────────────

  Widget _buildFillBlank() {
    final sentence = widget.question.options['sentence'] as String? ?? '';
    final seed = widget.sessionId.hashCode ^ widget.question.id.hashCode;
    final wordBank =
        (widget.question.options['word_bank'] as List<dynamic>? ?? [])
            .map<Map<String, dynamic>>(
              (e) => Map<String, dynamic>.from(e as Map),
            )
            .toList()
          ..shuffle(Random(seed));

    // Split kalimat per "___" untuk di-render dengan kotak drop
    final parts = sentence.split('___');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.question.text, style: AppTextStyles.questionText),
        if (widget.question.imageUrl != null &&
            widget.question.imageUrl!.isNotEmpty) ...[
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: CachedNetworkImage(
              imageUrl: widget.question.imageUrl!,
              width: double.infinity,
              fit: BoxFit.contain,
              placeholder: (context, url) =>
                  const Center(child: CircularProgressIndicator()),
              errorWidget: (context, url, error) => const Center(
                child: Icon(Icons.broken_image, size: 48, color: Colors.grey),
              ),
            ),
          ),
        ],
        const SizedBox(height: 24),

        // Kalimat dengan slot drop
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 4,
            runSpacing: 8,
            children: [
              for (int i = 0; i < parts.length; i++) ...[
                Text(parts[i], style: AppTextStyles.bodyLarge),
                if (i < parts.length - 1)
                  DragTarget<String>(
                    onAcceptWithDetails: (details) {
                      HapticFeedback.mediumImpact();
                      setState(() => _filledWords[i] = details.data);
                      _checkAndSubmitFillBlank();
                    },
                    builder: (context, candidateData, _) {
                      final isHovering = candidateData.isNotEmpty;
                      final filledWord = _filledWords[i];
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        constraints: const BoxConstraints(minWidth: 80),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: isHovering
                              ? AppColors.kuningMuda.withValues(alpha: 0.4)
                              : (filledWord != null
                                    ? AppColors.birNavyMuda
                                    : Colors.transparent),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isHovering
                                ? AppColors.kuningEmas
                                : AppColors.birNavy,
                            width: 2,
                            style: BorderStyle.solid,
                          ),
                        ),
                        child: filledWord != null
                            ? Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    filledWord,
                                    style: AppTextStyles.bodyLarge.copyWith(
                                      color: AppColors.birNavy,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  GestureDetector(
                                    onTap: () {
                                      setState(() => _filledWords.remove(i));
                                      _checkAndSubmitFillBlank();
                                    },
                                    child: const Icon(
                                      Icons.close,
                                      size: 16,
                                      color: AppColors.birNavy,
                                    ),
                                  ),
                                ],
                              )
                            : Text(
                                '  ...  ',
                                style: AppTextStyles.bodyLarge.copyWith(
                                  color: AppColors.textMuted,
                                ),
                              ),
                      );
                    },
                  ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 32),

        // Bank kata untuk di-drag
        Wrap(
          spacing: 12,
          runSpacing: 12,
          alignment: WrapAlignment.center,
          children: wordBank.map((w) {
            final wordText = w['text']?.toString() ?? '';
            // Sebuah kata dianggap terpakai jika ada di salah satu blank
            final isUsed = _filledWords.values.contains(wordText);
            if (isUsed) return const SizedBox.shrink();
            return Draggable<String>(
              data: wordText,
              feedback: Material(
                color: Colors.transparent,
                child: _Chip(label: wordText, isDragging: true),
              ),
              childWhenDragging: Opacity(
                opacity: 0.3,
                child: _Chip(label: wordText),
              ),
              child: _Chip(label: wordText),
            );
          }).toList(),
        ),
      ],
    );
  }

  void _checkAndSubmitFillBlank() {
    final order =
        widget.question.correctAnswer['order'] as List<dynamic>? ?? [];
    final wordBank =
        (widget.question.options['word_bank'] as List<dynamic>? ?? [])
            .map<Map<String, dynamic>>(
              (e) => Map<String, dynamic>.from(e as Map),
            )
            .toList();

    bool isCorrect = true;
    List<String?> words = [];

    // Periksa setiap slot (jumlah slot = order.length)
    for (int i = 0; i < order.length; i++) {
      final filled = _filledWords[i];
      words.add(filled);

      if (filled == null) {
        isCorrect = false;
        continue;
      }

      final correctId = order[i]?.toString();
      final match = wordBank.where((w) => w['id'] == correctId).firstOrNull;
      if (match?['text']?.toString() != filled) {
        isCorrect = false;
      }
    }

    // Jika belum semua slot terisi, bisa kirim false saja dengan data word
    _submitAnswer({'words': words, 'is_correct': isCorrect});
  }

  // ── Sorting ────────────────────────────────────────────────────────────────

  Widget _buildSorting() {

    final correctOrder =
        (widget.question.correctAnswer['order'] as List<dynamic>? ?? [])
            .map((e) => e.toString())
            .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.question.text, style: AppTextStyles.questionText),
        if (widget.question.imageUrl != null &&
            widget.question.imageUrl!.isNotEmpty) ...[
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: CachedNetworkImage(
              imageUrl: widget.question.imageUrl!,
              width: double.infinity,
              fit: BoxFit.contain,
              placeholder: (context, url) =>
                  const Center(child: CircularProgressIndicator()),
              errorWidget: (context, url, error) => const Center(
                child: Icon(Icons.broken_image, size: 48, color: Colors.grey),
              ),
            ),
          ),
        ],
        const SizedBox(height: 8),
        Text(
          'Urutkan dari yang paling sesuai',
          style: AppTextStyles.label.copyWith(color: AppColors.textMuted),
        ),
        const SizedBox(height: 24),

        // Area urutan yang dipilih user
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: _sortAnswer.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'Ketuk item di bawah untuk memasukkan urutan',
                      style: AppTextStyles.label.copyWith(
                        color: AppColors.textMuted,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : Column(
                  children: _sortAnswer.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final item = entry.value;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.birNavyMuda,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.birNavy),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: AppColors.birNavy,
                              shape: BoxShape.circle,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '${idx + 1}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              item['text']?.toString() ?? '',
                              style: AppTextStyles.bodyMedium,
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                _sortAnswer.removeAt(idx);
                                _sortItems.add(item);
                              });
                              _saveSortAnswer(correctOrder);
                            },
                            child: const Icon(
                              Icons.remove_circle_outline,
                              color: AppColors.merahMarun,
                              size: 20,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
        ),

        const SizedBox(height: 24),

        Text('Pilihan:', style: AppTextStyles.label),
        const SizedBox(height: 12),

        // Item yang bisa dipilih
        Column(
          children: _sortItems.map((item) {
            return GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() {
                  _sortAnswer.add(item);
                  _sortItems.remove(item);
                });
                _saveSortAnswer(correctOrder);
              },
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.drag_handle,
                      color: AppColors.textMuted,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        item['text']?.toString() ?? '',
                        style: AppTextStyles.bodyMedium,
                      ),
                    ),
                    const Icon(
                      Icons.add_circle_outline,
                      color: AppColors.birNavy,
                      size: 20,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  void _saveSortAnswer(List<String> correctOrder) {
    final userOrder = _sortAnswer
        .map((i) => i['id']?.toString() ?? '')
        .toList();
    final isCorrect = userOrder.join(',') == correctOrder.join(',');
    _submitAnswer({'order': userOrder, 'is_correct': isCorrect});
  }

  // ── Matching ───────────────────────────────────────────────────────────────

  Widget _buildMatching() {
    final pairs = (widget.question.options['pairs'] as List<dynamic>? ?? [])
        .map<Map<String, dynamic>>((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final correctPairs =
        (widget.question.correctAnswer['pairs'] as List<dynamic>? ?? [])
            .map<Map<String, dynamic>>(
              (e) => Map<String, dynamic>.from(e as Map),
            )
            .toList();

    final seed = widget.sessionId.hashCode ^ widget.question.id.hashCode;

    final leftItems = pairs
        .map((p) => {'id': p['id'], 'text': p['left']})
        .toList();
    final rightItems =
        pairs.map((p) => {'id': p['id'], 'text': p['right']}).toList()
          ..shuffle(Random(seed));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.question.text, style: AppTextStyles.questionText),
        if (widget.question.imageUrl != null &&
            widget.question.imageUrl!.isNotEmpty) ...[
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: CachedNetworkImage(
              imageUrl: widget.question.imageUrl!,
              width: double.infinity,
              fit: BoxFit.contain,
              placeholder: (context, url) =>
                  const Center(child: CircularProgressIndicator()),
              errorWidget: (context, url, error) => const Center(
                child: Icon(Icons.broken_image, size: 48, color: Colors.grey),
              ),
            ),
          ),
        ],
        const SizedBox(height: 8),
        Text(
          'Pasangkan setiap item di kiri dengan yang tepat di kanan',
          style: AppTextStyles.label.copyWith(color: AppColors.textMuted),
        ),
        const SizedBox(height: 24),

        // Grid pasangan
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Kolom kiri
            Expanded(
              child: Column(
                children: leftItems.map((left) {
                  final leftId = left['id']?.toString() ?? '';
                  final isSelected = _selectedLeftId == leftId;
                  final matchedRightId = _matchMap[leftId];
                  final matchedRight = pairs.firstWhere(
                    (p) => p['id']?.toString() == matchedRightId,
                    orElse: () => {},
                  );

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedLeftId = isSelected ? null : leftId;
                      });
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.birNavy
                            : AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: matchedRightId != null
                              ? AppColors.kuningEmas
                              : (isSelected
                                    ? AppColors.birNavy
                                    : AppColors.border),
                          width: isSelected || matchedRightId != null ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            left['text']?.toString() ?? '',
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (matchedRightId != null &&
                              matchedRight.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              '→ ${matchedRight['right'] ?? ''}',
                              style: AppTextStyles.label.copyWith(
                                color: isSelected
                                    ? Colors.white70
                                    : AppColors.kuningEmas,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(width: 8),

            // Kolom kanan
            Expanded(
              child: Column(
                children: rightItems.map((right) {
                  final rightId = right['id']?.toString() ?? '';
                  final isMatched = _matchMap.values.contains(rightId);

                  return GestureDetector(
                    onTap: () {
                      if (_selectedLeftId == null) return;
                      HapticFeedback.selectionClick();
                      setState(() {
                        _matchMap[_selectedLeftId!] = rightId;
                        _selectedLeftId = null;
                      });
                      _saveMatchAnswer(correctPairs);
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: isMatched
                            ? AppColors.kuningMuda.withValues(alpha: 0.3)
                            : (_selectedLeftId != null
                                  ? AppColors.birNavyMuda
                                  : AppColors.surface),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isMatched
                              ? AppColors.kuningEmas
                              : (_selectedLeftId != null
                                    ? AppColors.birNavy
                                    : AppColors.border),
                          width: 1.5,
                        ),
                      ),
                      child: Text(
                        right['text']?.toString() ?? '',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: isMatched
                              ? AppColors.kuningEmas
                              : AppColors.textPrimary,
                          fontWeight: isMatched
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),

        if (_matchMap.isNotEmpty) ...[
          const SizedBox(height: 16),
          TextButton.icon(
            onPressed: () {
              setState(() {
                _matchMap.clear();
                _selectedLeftId = null;
              });
              _submitAnswer({'pairs': [], 'is_correct': false});
            },
            icon: const Icon(Icons.refresh, size: 16),
            label: const Text('Reset semua pasangan'),
            style: TextButton.styleFrom(foregroundColor: AppColors.merahMarun),
          ),
        ],
      ],
    );
  }

  void _saveMatchAnswer(List<Map<String, dynamic>> correctPairs) {
    final userPairs = _matchMap.entries
        .map((e) => {'left_id': e.key, 'right_id': e.value})
        .toList();

    // Setiap pasangan benar: leftId (kiri) harus dipasangkan ke rightId (kanan)
    // Admin menyimpan pairs sebagai [{id, left, right}] - pasangan benar adalah
    // ketika user memetakan sebuah leftId ke rightId yang memiliki id yang SAMA.
    // Karena rightItems diacak namun tetap menggunakan p['id'] sebagai identifier,
    // pasangan benar adalah _matchMap[leftId] == leftId (yaitu id baris yang sama).
    bool isCorrect = correctPairs.isNotEmpty;
    for (final correct in correctPairs) {
      final leftId = correct['id']?.toString() ?? '';
      // Jawaban benar: user harus memetakan leftId → rightId dengan id yang sama
      final userRightId = _matchMap[leftId];
      if (userRightId != leftId) {
        isCorrect = false;
        break;
      }
    }

    _submitAnswer({'pairs': userPairs, 'is_correct': isCorrect});
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return switch (_subtype) {
      'sorting' => _buildSorting(),
      'matching' => _buildMatching(),
      _ => _buildFillBlank(),
    };
  }
}

// ── Internal Chip Widget ───────────────────────────────────────────────────────

class _Chip extends StatelessWidget {
  final String label;
  final bool isDragging;

  const _Chip({required this.label, this.isDragging = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: isDragging ? AppColors.kuningEmas : AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDragging ? AppColors.kuningEmas : AppColors.birNavy,
          width: 2,
        ),
        boxShadow: isDragging
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 10,
                  offset: const Offset(0, 5),
                ),
              ]
            : null,
      ),
      child: Text(
        label,
        style: AppTextStyles.bodyLarge.copyWith(
          color: isDragging ? Colors.white : AppColors.birNavy,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
