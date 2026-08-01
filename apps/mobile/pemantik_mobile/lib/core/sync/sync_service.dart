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

      // Baca data anak dari SecureStorage untuk dipakai di Minggu 2
      // (binding session ke access_id, dll.)
      final student = jsonDecode(studentStr);
      // Variabel ini akan dipakai di Minggu 2 (insert session + access_id tracking)
      // ignore: unused_local_variable
      final String? schoolId = student['school_id'] as String?;
      // ignore: unused_local_variable
      final String? classId = student['class_id'] as String?;
      // ignore: unused_local_variable
      final String? studentId = student['id'] as String?;


      // Query assessment_access untuk school anak ini.
      // RLS policy 'student_view_own_access' sudah memfilter berdasarkan:
      //   - school_id dari JWT claims (via jwt_school_id())
      //   - is_active = true
      //   - valid_from <= now() <= valid_until
      // Sehingga kita tidak perlu filter manual di sini - cukup pakai .select().
      // Catatan: target_id di assessment_access adalah school_id atau community_id,
      //          BUKAN student_id, sehingga student_id tidak relevan di sini.
      final accessResponse = await SupabaseConfig.client
          .from('assessment_access')
          .select(
            // Tambah 'id' (access_id) untuk binding sesi ke akses ujian (Minggu 2)
            'id, category_id, phase, valid_from, valid_until, question_categories ( id, name, subject_area )',
          )
          .eq('is_active', true);

      final List<String> activeCategoryIds = [];

      for (final row in accessResponse) {
        final pkgData = row['question_categories'];
        if (pkgData == null) continue;
        
        final categoryId = pkgData['id'] as String;
        activeCategoryIds.add(categoryId);

        await _db.categoryDao.upsertCategory(
          LocalCategoriesCompanion(
            id: Value(categoryId),
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
            // Minggu 2: simpan access_id lokal agar sesi baru bisa terikat ke akses
            accessId: Value(row['id'] as String?),
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
              learningObjective: Value(lvlRow['learning_objective'] as String?),
              successMessage: Value(lvlRow['success_message'] as String?),
              failureMessage: Value(lvlRow['failure_message'] as String?),
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
              questionInstruction: Value(qRow['question_instruction']),
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
      
      // Hapus kategori lokal yang sudah tidak ada di Supabase (akses dicabut atau kedaluwarsa)
      final allLocalCategories = await _db.categoryDao.getAllCategories();
      for (final localCat in allLocalCategories) {
        if (!activeCategoryIds.contains(localCat.id)) {
          await _db.categoryDao.deleteCategory(localCat.id);
          log('Kategori ${localCat.name} dihapus dari lokal karena akses tidak valid lagi.');
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
      final storage = secureStorage;
      final studentStr = await storage.read(key: 'student_data');
      if (studentStr == null) {
        log('Upload dibatalkan: tidak ada sesi anak yang aktif (belum login).');
        return;
      }
      final student = jsonDecode(studentStr);
      final String? currentStudentId = student['id'] as String?;
      if (currentStudentId == null) return;

      log('Memulai Sinkronisasi Upload untuk anak $currentStudentId...');

      // 1. Upload status Sesi yang berstatus pending (baik in_progress maupun completed)
      // HANYA MILIK ANAK YANG SEDANG LOGIN (encegah bentrok multi-user di 1 device)
      final pendingSessions = await _db.sessionDao.getPendingSessionsForStudent(currentStudentId);
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
            // ── Minggu 2: sertakan access_id dan current_level_id ─────────
            // null jika sesi dibuat sebelum Minggu 2 (backward compat)
            if (session.accessId != null) 'access_id': session.accessId,
            if (session.currentLevelId != null || session.levelId != null) 'current_level_id': session.currentLevelId ?? session.levelId,
            if (session.levelId != null || session.currentLevelId != null) 'level_id': session.levelId ?? session.currentLevelId,
          });
          await _db.sessionDao.updateSyncStatus(session.id, 'synced');
          log('Sesi ${session.id} berhasil diupload. Skor: $correctCount/${sessionAnswers.length}');
        } catch (e) {
          log('Gagal upload sesi ${session.id}: $e');
        }
      }

      // 2. Upload semua jawaban yang berstatus pending MILIK ANAK YANG SEDANG LOGIN
      final pendingAnswers = await _db.sessionDao.getPendingAnswersForStudent(currentStudentId);
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
            // error lain (network blip, dll) - biarkan tetap 'pending' untuk retry
            log('Sync error (will retry): ${e.message}');
          }
        } catch (e) {
          // error tak terduga - tetap pending, log untuk investigasi
          log('Unexpected sync error: $e');
        }
      }

      // 3. Panggil advance_student_level HANYA untuk sesi 'completed' yang sudah terupload.
      // Fungsi ini menggantikan validate_level_completion() (Minggu 1) - versi baru ini
      // juga melakukan UPDATE di database (current_level_id atau status=completed).
      for (final session in pendingSessions) {
        if (session.status == 'completed' && !session.id.startsWith('ses_')) {
          // Butuh current_level_id - ambil dari levelId yang disimpan lokal
          final levelId = session.currentLevelId ?? session.levelId;
          if (levelId == null) {
            log('[Sync] Sesi ${session.id}: tidak ada current_level_id, lewati advance_student_level');
            continue;
          }

          try {
            final result = await SupabaseConfig.client.rpc(
              'advance_student_level',
              params: {
                'p_session_id':       session.id,
                'p_current_level_id': levelId,
              },
            );

            if (result is Map) {
              final action     = result['action'] as String? ?? 'unknown';
              final levelScore = result['level_score'];
              final reason     = result['reason'];

              if (action == 'advance') {
                final nextLevelId     = result['next_level_id'];
                final nextLevelNumber = result['next_level_number'];
                log('[Sync] Sesi ${session.id}: NAIK ke Level $nextLevelNumber (score: $levelScore%)');

                // Update local session currentLevelId untuk sinkronisasi di masa depan
                await (_db.update(_db.localSessions)
                  ..where((t) => t.id.equals(session.id)))
                  .write(LocalSessionsCompanion(
                    currentLevelId: Value(nextLevelId?.toString()),
                  ));
              } else if (action == 'complete') {
                log('[Sync] Sesi ${session.id}: SELESAI (score: $levelScore%, reason: $reason)');
              } else if (action == 'error') {
                log('[Sync] Sesi ${session.id}: advance_student_level error → reason: ${result['reason']}, detail: ${result['detail']}');
              }
            }
          } catch (rpcError) {
            // Jangan crash sync karena error RPC - sesi tetap tersimpan lokal
            log('[Sync] Gagal panggil advance_student_level untuk sesi ${session.id}: $rpcError');
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
            levelId: Value(row['level_id'] ?? row['current_level_id']),
            currentLevelId: Value(row['current_level_id'] ?? row['level_id']),
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
