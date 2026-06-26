import 'dart:convert';
import '../database/database.dart';

class MediaExtractor {
  static List<String> extractUrls(LocalQuestion question) {
    final urls = <String>{}; // Use Set to avoid duplicates

    // 1. Check direct columns
    if (question.questionImageUrl != null &&
        question.questionImageUrl!.isNotEmpty) {
      urls.add(question.questionImageUrl!);
    }
    if (question.questionAudioUrl != null &&
        question.questionAudioUrl!.isNotEmpty) {
      urls.add(question.questionAudioUrl!);
    }
    if (question.questionVideoUrl != null &&
        question.questionVideoUrl!.isNotEmpty) {
      urls.add(question.questionVideoUrl!);
    }

    // 2. Parse optionsJson
    if (question.optionsJson != null && question.optionsJson!.isNotEmpty) {
      try {
        final options =
            jsonDecode(question.optionsJson!) as Map<String, dynamic>;

        // Cek root options
        if (options['imageUrl'] != null &&
            options['imageUrl'].toString().isNotEmpty) {
          urls.add(options['imageUrl'].toString());
        }
        if (options['audioUrl'] != null &&
            options['audioUrl'].toString().isNotEmpty) {
          urls.add(options['audioUrl'].toString());
        }
        if (options['videoUrl'] != null &&
            options['videoUrl'].toString().isNotEmpty) {
          urls.add(options['videoUrl'].toString());
        }

        // Cek 'choices' atau 'answers'
        final choices =
            options['choices'] as List<dynamic>? ??
            options['answers'] as List<dynamic>? ??
            [];
        for (var choice in choices) {
          if (choice is Map) {
            if (choice['url'] != null && choice['url'].toString().isNotEmpty) {
              urls.add(choice['url'].toString());
            }
            if (choice['imageUrl'] != null &&
                choice['imageUrl'].toString().isNotEmpty) {
              urls.add(choice['imageUrl'].toString());
            }
          }
        }

        // Cek drag_drop 'items' or 'pairs' or 'word_bank'
        final items = options['items'] as List<dynamic>? ?? [];
        for (var item in items) {
          if (item is Map &&
              item['imageUrl'] != null &&
              item['imageUrl'].toString().isNotEmpty) {
            urls.add(item['imageUrl'].toString());
          }
        }

        final pairs = options['pairs'] as List<dynamic>? ?? [];
        for (var pair in pairs) {
          if (pair is Map &&
              pair['imageUrl'] != null &&
              pair['imageUrl'].toString().isNotEmpty) {
            urls.add(pair['imageUrl'].toString());
          }
        }
      } catch (e) {
        // Abaikan error parsing JSON
      }
    }

    // 3. Parse correctAnswerJson
    if (question.correctAnswerJson.isNotEmpty) {
      try {
        final correctAnswer =
            jsonDecode(question.correctAnswerJson) as Map<String, dynamic>;
        if (correctAnswer['imageUrl'] != null &&
            correctAnswer['imageUrl'].toString().isNotEmpty) {
          urls.add(correctAnswer['imageUrl'].toString());
        }
        if (correctAnswer['audioUrl'] != null &&
            correctAnswer['audioUrl'].toString().isNotEmpty) {
          urls.add(correctAnswer['audioUrl'].toString());
        }
      } catch (e) {
        // Abaikan error parsing JSON
      }
    }

    // Filter out invalid URLs (e.g. empty or not starting with http)
    return urls.where((url) => url.startsWith('http')).toList();
  }
}
