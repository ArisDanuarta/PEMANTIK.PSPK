import 'dart:convert';
import 'dart:developer';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../database/database.dart';
import '../supabase/supabase_client.dart';

final syncServiceProvider = Provider<SyncService>((ref) {
  return SyncService(ref.read(databaseProvider));
});

class SyncService {
  final AppDatabase _db;
  SyncService(this._db);

  // FASE 1: DOWNLOAD SOAL
  Future<void> syncCategoriesAndQuestions() async {
    try {
      final storage = secureStorage;
      final studentStr = await storage.read(key: 'student_data');
      if (studentStr == null) return;

      final student = jsonDecode(studentStr);
      final schoolId = student['school_id'];
      final classId = student['class_id'];
      final studentId = student['id'];

      List<String> conditions = [
        'target_id.eq.$schoolId',
        'target_id.eq.$studentId',
      ];
      if (classId != null) conditions.add('target_id.eq.$classId');

      final accessResponse = await SupabaseConfig.client
          .from('assessment_access')
          .select(
            'category_id, phase, valid_from, valid_until, question_categories ( id, name, subject_area )',
          )
          .eq('is_active', true)
          .or(conditions.join(','));

      for (final row in accessResponse) {
        final pkgData = row['question_categories'];
        if (pkgData == null) continue;

        await _db.categoryDao.upsertCategory(
          LocalCategoriesCompanion(
            id: Value(pkgData['id']),
            name: Value(pkgData['name']),
            subjectArea: Value(pkgData['subject_area']),
            phase: Value(row['phase'] ?? 'Tahap 1'),
            validFrom: Value(
              row['valid_from'] != null
                  ? DateTime.parse(row['valid_from'])
                  : null,
            ),
            validUntil: Value(
              row['valid_until'] != null
                  ? DateTime.parse(row['valid_until'])
                  : null,
            ),
          ),
        );

        final levelsResponse = await SupabaseConfig.client
            .from('question_levels')
            .select('*')
            .eq('category_id', pkgData['id']);

        for (final lvlRow in levelsResponse) {
          await _db.levelDao.upsertLevel(
            LocalLevelsCompanion(
              id: Value(lvlRow['id']),
              categoryId: Value(lvlRow['category_id']),
              levelNumber: Value(lvlRow['level_number']),
              timeLimitSec: Value(lvlRow['time_limit_sec']),
              passingThreshold: Value(lvlRow['passing_threshold'] ?? 0),
              accessCode: Value(lvlRow['access_code'] as String?),
            ),
          );
        }

        final questionsResponse = await SupabaseConfig.client
            .from('questions')
            .select('*, question_levels!inner(category_id, time_limit_sec)')
            .eq('question_levels.category_id', pkgData['id'])
            .eq('is_published', true);

        int orderIdx = 0;
        for (final qRow in questionsResponse) {
          final timeLimitSec = qRow['question_levels']?['time_limit_sec'];

          await _db.questionDao.upsertQuestion(
            LocalQuestionsCompanion(
              id: Value(qRow['id']),
              categoryId: Value(pkgData['id']),
              levelId: Value(qRow['level_id'] ?? ''),
              subjectArea: Value(qRow['subject_area']),
              questionType: Value(qRow['question_type']),
              questionText: Value(qRow['question_text']),
              questionAudioUrl: Value(qRow['question_audio_url']),
              questionVideoUrl: Value(qRow['question_video_url']),
              questionImageUrl: Value(qRow['question_image_url']),
              optionsJson: Value(
                qRow['options'] != null ? jsonEncode(qRow['options']) : null,
              ),
              correctAnswerJson: Value(
                jsonEncode(qRow['correct_answer'] ?? {}),
              ),
              version: Value(qRow['version'] ?? 1),
              orderIndex: Value(orderIdx++),
              timeLimitSec: Value(timeLimitSec),
              cachedAt: Value(DateTime.now()),
            ),
          );
        }
      }
      log('Sinkronisasi Download Selesai');
    } catch (e) {
      log('Gagal Sinkronisasi Download: $e');
    }
  }

  Future<void> _uploadSingleAnswer(LocalAnswer answer) async {
    // Skip sesi lama yang format ID-nya belum UUID (menghindari error UUID dari DB)
    if (answer.sessionId.startsWith('ses_')) return;

    await SupabaseConfig.client.from('student_answers').upsert({
      'id': answer.id,
      'session_id': answer.sessionId,
      'question_id': answer.questionId,
      'answer_data': jsonDecode(answer.answerData),
      'is_correct': answer.isCorrect,
      'score': answer.score ?? (answer.isCorrect == true ? 1 : 0),
      'time_spent_sec': answer.timeSpentSec,
      'status': 'answered',
      'sync_status': 'synced',
      'answered_at': answer.answeredAt.toIso8601String(),
    }, onConflict: 'session_id,question_id');
  }

  Future<void> uploadCompletedSessions() async {
    try {
      log('Memulai Sinkronisasi Upload...');

      // 1. Upload status Sesi yang berstatus pending (baik in_progress maupun completed)
      // HARUS DILAKUKAN LEBIH DULU agar session_id sudah ada sebelum jawaban di-insert,
      // sehingga tidak melanggar foreign key constraint "student_answers_session_id_fkey".
      final pendingSessions = await _db.sessionDao.getSessionsByStatus('pending');
      for (final session in pendingSessions) {
        // Skip sesi lama yang ID-nya bukan UUID untuk menghindari error di DB
        if (session.id.startsWith('ses_')) {
          await _db.sessionDao.updateSyncStatus(session.id, 'synced');
          continue;
        }

        try {
          // Hitung score total dari jumlah jawaban benar untuk sesi ini
          final sessionAnswers = await _db.answerDao.getAnswersForSession(session.id);
          final correctCount = sessionAnswers.where((a) => a.isCorrect == true).length;

          // Hitung waktu pengerjaan (detik) antara started_at dan completed_at
          int? timeSpentSec = session.timeSpentSec;
          if (timeSpentSec == null || timeSpentSec == 0) {
            if (session.startedAt != null && session.completedAt != null) {
              timeSpentSec = session.completedAt!.difference(session.startedAt!).inSeconds;
            }
          }

          await SupabaseConfig.client.from('assessment_sessions').upsert({
            'id': session.id,
            'student_id': session.studentId,
            'category_id': session.categoryId,
            'school_id': session.schoolId,
            'status': session.status,
            'score': correctCount,
            'time_spent_sec': timeSpentSec,
            'phase': session.phase,
            'started_at': session.startedAt?.toIso8601String(),
            'completed_at': session.completedAt?.toIso8601String(),
            'sync_status': 'synced',
            'synced_at': DateTime.now().toIso8601String(),
            'attempt_number': session.attemptNumber,
          });
          await _db.sessionDao.updateSyncStatus(session.id, 'synced');
          log('Sesi ${session.id} berhasil diupload. Skor: $correctCount/${sessionAnswers.length}');
        } catch (e) {
          log('Gagal upload sesi ${session.id}: $e');
        }
      }

      // 2. Upload semua jawaban yang berstatus pending (sekarang parent session_id dijamin sudah ada)
      final pendingAnswers = await _db.answerDao.getAnswersByStatus('pending');
      for (final answer in pendingAnswers) {
        try {
          await _uploadSingleAnswer(answer);
          await _db.answerDao.updateSyncStatus(answer.id, 'synced');
        } on PostgrestException catch (e) {
          if (e.code == '403' || e.message.contains('session_expired')) {
            await _db.answerDao.markFailedSync(
              answer.id,
              reason: 'session_expired',
            );
            log('Sesi kedaluwarsa untuk jawaban ${answer.id}');
          } else {
            // error lain (network blip, dll) — biarkan tetap 'pending' untuk retry
            log('Sync error (will retry): ${e.message}');
          }
        } catch (e) {
          // error tak terduga — tetap pending, log untuk investigasi
          log('Unexpected sync error: $e');
        }
      }

      // 3. Panggil RPC validasi HANYA untuk sesi yang statusnya 'completed'
      // Ini dilakukan setelah semua jawaban berhasil diupload.
      for (final session in pendingSessions) {
        if (session.status == 'completed' && !session.id.startsWith('ses_')) {
          try {
            final validationResult = await SupabaseConfig.client.rpc(
              'validate_level_completion',
              params: {'p_session_id': session.id},
            );
            log('Hasil validasi kelulusan level: $validationResult');
          } catch (rpcError) {
            log('Gagal validasi kelulusan level via RPC: $rpcError');
          }
        }
      }

      log('Sinkronisasi Upload Selesai');
    } catch (e) {
      log('Gagal Sinkronisasi Upload Keseluruhan: $e');
    }
  }

  Future<void> syncPastSessions() async {
    try {
      final storage = secureStorage;
      final studentStr = await storage.read(key: 'student_data');
      if (studentStr == null) return;

      final student = jsonDecode(studentStr);
      final studentId = student['id'];
      
      if (studentId == null) return;

      log('Memulai Sinkronisasi Tarik Data Lama (Sync Down)...');
      
      final sessionsResponse = await SupabaseConfig.client
          .from('assessment_sessions')
          .select('*, student_answers(*)')
          .eq('student_id', studentId);

      for (final row in sessionsResponse) {
        await _db.sessionDao.upsertSession(
          LocalSessionsCompanion(
            id: Value(row['id']),
            studentId: Value(row['student_id']),
            categoryId: Value(row['category_id']),
            schoolId: Value(row['school_id'] ?? ''),
            levelId: Value(row['level_id']),
            status: Value(row['status']),
            attemptNumber: Value(row['attempt_number'] ?? 1),
            currentQuestionIndex: Value(row['current_question_index'] ?? 0),
            startedAt: Value(row['started_at'] != null ? DateTime.parse(row['started_at']) : null),
            completedAt: Value(row['completed_at'] != null ? DateTime.parse(row['completed_at']) : null),
            timeSpentSec: Value(row['time_spent_sec']),
            phase: Value(row['phase'] ?? 'Tahap 1'),
            syncStatus: const Value('synced'),
            createdAt: Value(row['created_at'] != null ? DateTime.parse(row['created_at']) : DateTime.now()),
          ),
        );

        final answers = row['student_answers'] as List<dynamic>? ?? [];
        for (final ans in answers) {
          final scoreDynamic = ans['score'];
          double? scoreValue;
          if (scoreDynamic != null) {
            scoreValue = (scoreDynamic is int) ? scoreDynamic.toDouble() : (scoreDynamic as double);
          }

          await _db.answerDao.upsertAnswer(
            LocalAnswersCompanion(
              id: Value(ans['id']),
              sessionId: Value(ans['session_id']),
              questionId: Value(ans['question_id']),
              answerData: Value(jsonEncode(ans['answer_data'] ?? {})),
              isCorrect: Value(ans['is_correct']),
              score: Value(scoreValue),
              timeSpentSec: Value(ans['time_spent_sec']),
              answeredAt: Value(ans['answered_at'] != null ? DateTime.parse(ans['answered_at']) : DateTime.now()),
              syncStatus: const Value('synced'),
            ),
          );
        }
      }
      
      log('Sinkronisasi Tarik Data Selesai (Ditemukan ${sessionsResponse.length} sesi)');
    } catch (e) {
      log('Gagal Sinkronisasi Tarik Data Lama: $e');
    }
  }
}
