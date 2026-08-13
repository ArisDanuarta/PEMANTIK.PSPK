import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'dart:math' hide log;
import 'package:collection/collection.dart';
import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/database/database.dart';
import '../../../core/sync/sync_service.dart';
import '../../../core/utils/uuid_helper.dart';

part 'assessment_provider.g.dart';

// Plain Dart Object agar tidak bentrok dengan Riverpod Generator
class QuestionData {
  final String id;
  final String type;
  final String text;
  final String? instruction; // Teks instruksi DI ATAS media
  final Map<String, dynamic> options;
  final Map<String, dynamic> correctAnswer;
  final int version;
  final int timeLimitSec;
  final String levelId;
  // Media URLs - diambil dari kolom native database (bukan dari options JSON)
  final String? audioUrl;
  final String? videoUrl;
  final String? imageUrl;

  QuestionData({
    required this.id,
    required this.type,
    required this.text,
    this.instruction,
    required this.options,
    required this.correctAnswer,
    this.version = 1,
    this.timeLimitSec = 60,
    this.levelId = '',
    this.audioUrl,
    this.videoUrl,
    this.imageUrl,
  });
}

class AssessmentState {
  final List<QuestionData> questions;
  final int currentIndex;
  final Map<String, String> answers;
  final PageController pageController;
  final int remainingSeconds;
  final bool isTimeUp;

  AssessmentState({
    required this.questions,
    required this.currentIndex,
    required this.answers,
    required this.pageController,
    this.remainingSeconds = 0,
    this.isTimeUp = false,
  });

  bool get isLastQuestion => currentIndex == questions.length - 1;

  AssessmentState copyWith({
    List<QuestionData>? questions,
    int? currentIndex,
    Map<String, String>? answers,
    PageController? pageController,
    int? remainingSeconds,
    bool? isTimeUp,
  }) {
    return AssessmentState(
      questions: questions ?? this.questions,
      currentIndex: currentIndex ?? this.currentIndex,
      answers: answers ?? this.answers,
      pageController: pageController ?? this.pageController,
      remainingSeconds: remainingSeconds ?? this.remainingSeconds,
      isTimeUp: isTimeUp ?? this.isTimeUp,
    );
  }
}

Map<String, dynamic>? _tryParseAnswerJson(String? raw) {
  if (raw == null) return null;
  try {
    final decoded = jsonDecode(raw);
    if (decoded is Map<String, dynamic>) return decoded;
  } catch (_) {
    // bukan JSON valid - berarti tipe soal selain voice_recording, aman diabaikan
  }
  return null;
}

class LevelTransitionResult {
  final bool passed;
  final double scorePercent;
  final String? nextLevelId;

  LevelTransitionResult({
    required this.passed,
    required this.scorePercent,
    this.nextLevelId,
  });
}

List<LocalQuestion> _shuffleQuestionsPerLevel(
  List<LocalQuestion> questions,
  String sessionId,
) {
  final seed = sessionId.hashCode;
  final rng = Random(seed);

  final grouped = groupBy(questions, (q) => q.levelId);
  final result = <LocalQuestion>[];

  // We sort levels assuming string ID doesn't matter or assuming single level per category
  // Ideally we sort by levelNumber, but LocalQuestion may not have levelNumber
  // In Pemantik, each category may represent a single Level or multiple.
  final sortedLevelIds = grouped.keys.toList();

  for (final levelId in sortedLevelIds) {
    final group = List<LocalQuestion>.from(grouped[levelId]!)..shuffle(rng);
    result.addAll(group);
  }

  return result;
}

@riverpod
class AssessmentController extends _$AssessmentController {
  Timer? _countdownTimer;
  // ✅ FIX #4: Guard untuk mencegah submitAssessment dipanggil dua kali
  // (contoh: forced exit saat timer habis → dua submit bersamaan → jawaban duplikat)
  bool _isSubmitting = false;

  @override
  Future<AssessmentState> build(String sessionId) async {
    PageController? pageCtrl;
    ref.onDispose(() {
      _countdownTimer?.cancel();
      pageCtrl?.dispose();
    });
    
    final db = ref.read(databaseProvider);
    final session = await db.sessionDao.getSessionById(sessionId);
    if (session == null) throw Exception('Sesi tidak valid atau belum dibuat');

    // Tarik soal real dari database lokal berdasarkan levelId
    final rawQuestions = await db.questionDao.getQuestionsForLevel(
      session.levelId ?? session.currentLevelId ?? "",
    );

    // Shuffle deterministik per session (jika mode ujian biasa)
    final localQuestions = _shuffleQuestionsPerLevel(rawQuestions, sessionId);

    final questions = localQuestions.map((q) {
      Map<String, dynamic> parseJsonMap(String? jsonStr, String defaultKey) {
        if (jsonStr == null || jsonStr.isEmpty) return {};
        try {
          final decoded = jsonDecode(jsonStr);
          if (decoded is Map<String, dynamic>) {
            return decoded;
          } else if (decoded is List) {
            return {defaultKey: decoded};
          } else if (decoded is String) {
            return {defaultKey: decoded};
          }
        } catch (_) {}
        return {};
      }

      return QuestionData(
        id: q.id,
        type: q.questionType,
        text: q.questionText ?? '',
        instruction: q.questionInstruction,
        options: parseJsonMap(q.optionsJson, 'choices'),
        correctAnswer: parseJsonMap(q.correctAnswerJson, 'answers'),
        version: q.version,
        timeLimitSec: q.timeLimitSec ?? 60,
        levelId: q.levelId,
        // Isi URL media langsung dari kolom SQLite native
        audioUrl: q.questionAudioUrl,
        videoUrl: q.questionVideoUrl,
        imageUrl: q.questionImageUrl,
      );
    }).toList();

    pageCtrl = PageController(initialPage: session.currentQuestionIndex);

    return AssessmentState(
      questions: questions,
      currentIndex: session.currentQuestionIndex,
      answers: {},
      pageController: pageCtrl,
    );
  }

  void selectAnswer(String questionId, String answerValue) {
    if (state.value == null) return;

    final currentState = state.value!;
    final newAnswers = Map<String, String>.from(currentState.answers);
    newAnswers[questionId] = answerValue;

    state = AsyncData(currentState.copyWith(answers: newAnswers));
  }

  Future<void> nextQuestion(String sessionId) async {
    if (state.value == null) return;
    final currentState = state.value!;

    if (currentState.currentIndex < currentState.questions.length - 1) {
      final nextIndex = currentState.currentIndex + 1;
      currentState.pageController.animateToPage(
        nextIndex,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );

      final db = ref.read(databaseProvider);
      await db.sessionDao.updateQuestionIndex(sessionId, nextIndex);

      state = AsyncData(currentState.copyWith(currentIndex: nextIndex));
    }
  }

  Future<void> previousQuestion(String sessionId) async {
    if (state.value == null) return;
    final currentState = state.value!;

    if (currentState.currentIndex > 0) {
      final prevIndex = currentState.currentIndex - 1;
      currentState.pageController.animateToPage(
        prevIndex,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );

      final db = ref.read(databaseProvider);
      await db.sessionDao.updateQuestionIndex(sessionId, prevIndex);

      state = AsyncData(currentState.copyWith(currentIndex: prevIndex));
    }
  }

  Future<void> jumpToQuestion(int index) async {
    if (state.value == null) return;
    final currentState = state.value!;

    if (index >= 0 && index < currentState.questions.length) {
      currentState.pageController.animateToPage(
        index,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );

      final db = ref.read(databaseProvider);
      await db.sessionDao.updateQuestionIndex(sessionId, index);

      state = AsyncData(currentState.copyWith(currentIndex: index));
    }
  }

  void startTimer(int timeLimitSec) {
    _countdownTimer?.cancel();
    if (state.value == null) return;

    state = AsyncData(
      state.value!.copyWith(remainingSeconds: timeLimitSec, isTimeUp: false),
    );

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.value == null) {
        timer.cancel();
        return;
      }
      final remaining = state.value!.remainingSeconds - 1;
      if (remaining <= 0) {
        timer.cancel();
        state = AsyncData(
          state.value!.copyWith(remainingSeconds: 0, isTimeUp: true),
        );
        return;
      }
      state = AsyncData(state.value!.copyWith(remainingSeconds: remaining));
    });
  }

  Future<void> forceSubmit() async {
    // panggil submitAssessment() yang sudah ada, dengan flag forced=true
    await submitAssessment(sessionId, forced: true);
  }

  // Fungsi Baru: Mengunci jawaban dan simpan ke SQLite lokal
  Future<bool> submitAssessment(String sessionId, {bool forced = false}) async {
    // ✅ FIX #4: Tolak panggilan ganda — cegah duplikasi jawaban di local_answers
    if (_isSubmitting) {
      log('[Assessment] submitAssessment dipanggil dua kali — diabaikan (sudah dalam proses)');
      return false;
    }
    _isSubmitting = true;

    try {
      if (state.value == null) return false;
      final currentState = state.value!;
      final db = ref.read(databaseProvider);

      // ✅ FIX #4: Cek apakah jawaban untuk sesi ini sudah pernah disimpan sebelumnya
      //    (guard kedua jika flag _isSubmitting terlewati karena async)
      final existingAnswers = await db.answerDao.getAnswersForSession(sessionId);
      if (existingAnswers.isNotEmpty) {
        log('[Assessment] Sesi $sessionId sudah memiliki ${existingAnswers.length} jawaban — submit dibatalkan (sudah pernah submit)');
        // Hitung hasil dari jawaban yang sudah ada
        final correctCount = existingAnswers.where((a) => a.isCorrect == true).length;
        final sessionDataExisting = await db.sessionDao.getSessionById(sessionId);
        if (sessionDataExisting != null && sessionDataExisting.levelId != null) {
          final level = await db.levelDao.getLevelById(sessionDataExisting.levelId!);
          if (level != null) return correctCount >= level.passingThreshold;
        }
        return correctCount > 0;
      }

      int correctCount = 0;

      // 1. Simpan setiap jawaban ke tabel LocalAnswers
      for (final q in currentState.questions) {
        final userAnswer = currentState.answers[q.id];
        final parsed = _tryParseAnswerJson(userAnswer);
        final isVoiceAnswer = q.type == 'voice_recording' && parsed != null;

        // ─── Evaluasi benar/salah per tipe soal ────────────────────────────────
        bool isCorrect = false;
        if (userAnswer != null) {
          switch (q.type) {
            case 'multiple_choice':
            case 'audio_question':
            case 'video_question':
              // Admin menyimpan correct_answer sebagai string langsung (misal "A")
              // atau dalam map {'answers': "A"}
              final correctVal =
                  q.correctAnswer['answers'] ?? q.correctAnswer['value'];
              isCorrect = userAnswer == correctVal?.toString();
              break;
            case 'image_choice':
              // Admin menyimpan correct_answer berupa {"index": 0, "url": "..."}
              // User memilih dengan submit URL gambar
              final correctUrl =
                  q.correctAnswer['url'] ?? q.correctAnswer['answers'];
              isCorrect = userAnswer == correctUrl?.toString();
              break;
            case 'voice_recording':
              // Penilaian berdasarkan kemiripan (similarity score dari widget)
              final score = parsed?['score'] as num? ?? 0;
              final threshold =
                  (q.correctAnswer['threshold_pct'] as num?)?.toDouble() ?? 80;
              isCorrect = (score * 100) >= threshold;
              break;
            case 'drag_drop':
              // Dinilai oleh widget, jawaban sudah berisi hasil evaluasi
              final dragParsed = _tryParseAnswerJson(userAnswer);
              isCorrect = dragParsed?['is_correct'] == true;
              break;
            default:
              isCorrect = false;
          }
        }
        if (isCorrect) correctCount++;

        await db.answerDao
            .into(db.localAnswers)
            .insert(
              LocalAnswersCompanion(
                id: drift.Value(UuidHelper.generateV4()),
                sessionId: drift.Value(sessionId),
                questionId: drift.Value(q.id),
                answerData: drift.Value(
                  isVoiceAnswer
                      ? jsonEncode(parsed)
                      : jsonEncode({'value': userAnswer}),
                ),
                recordingLocalPath: isVoiceAnswer
                    ? drift.Value(parsed['path'] as String?)
                    : const drift.Value(null),
                questionVersion: drift.Value(q.version.toString()),
                isCorrect: drift.Value(isCorrect),
                score: drift.Value(isCorrect ? 1.0 : 0.0),
                syncStatus: const drift.Value('pending'),
                answeredAt: drift.Value(DateTime.now()),
              ),
            );
      }

      // 2. Tandai Sesi sebagai Selesai
      // Hitung waktu pengerjaan nyata dari startedAt sesi → sekarang
      final sessionData0 = await db.sessionDao.getSessionById(sessionId);
      final timeSpent = sessionData0?.startedAt != null
          ? DateTime.now().difference(sessionData0!.startedAt!).inSeconds
          : 0;

      await (db.update(db.localSessions)
            ..where((t) => t.id.equals(sessionId)))
          .write(
        LocalSessionsCompanion(
          status:       const drift.Value('completed'),
          completedAt:  drift.Value(DateTime.now()),
          syncStatus:   const drift.Value('pending'),
          timeSpentSec: drift.Value(forced ? -1 : timeSpent),
        ),
      );

      // 3. Panggil SyncService secara background untuk segera upload jika ada internet
      if (forced) {
        try {
          await ref.read(syncServiceProvider).uploadCompletedSessions();
        } catch (e) {
          log('Gagal upload sinkronisasi saat dipaksa (forced): $e');
        }
      } else {
        ref.read(syncServiceProvider).uploadCompletedSessions().catchError((e) {
          log('Upload jawaban background tertunda: $e');
        });
      }

      // Cek kelulusan berdasarkan passing_threshold dari local_levels
      final sessionData = await db.sessionDao.getSessionById(sessionId);
      if (sessionData != null && sessionData.levelId != null) {
        final level = await db.levelDao.getLevelById(sessionData.levelId!);
        if (level != null) {
          return correctCount >= level.passingThreshold;
        }
      }

      // Fallback jika tidak ada level (harusnya tidak terjadi)
      return correctCount > 0;
    } finally {
      // ✅ FIX #4: Selalu reset flag setelah submit selesai (berhasil atau error)
      _isSubmitting = false;
    }
  }
}

@riverpod
String? selectedAnswer(Ref ref, String sessionId, String questionId) {
  final stateAsync = ref.watch(assessmentControllerProvider(sessionId));
  return stateAsync.value?.answers[questionId];
}
