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
      final accessResponse = await SupabaseConfig.client
          .from('assessment_access')
          .select(
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

  // ─── FIX #1: onConflict pakai 'id' (PK) bukan session_id,question_id
  // (student_answers tidak punya UNIQUE constraint pada session_id+question_id)
  Future<void> _uploadSingleAnswer(LocalAnswer answer) async {
    // Skip sesi lama yang format ID-nya belum UUID (menghindari error UUID dari DB)
    if (answer.sessionId.startsWith('ses_')) return;

    await SupabaseConfig.client.from('student_answers').upsert(
      {
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
      },
      // ✅ FIX #1: pakai primary key 'id' — pasti unik dan ada di schema
      onConflict: 'id',
    );
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
      //    HANYA MILIK ANAK YANG SEDANG LOGIN (encegah bentrok multi-user di 1 device)
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
          // ─── FIX #6: Jaga nilai -1 sebagai marker forced_exit saat upload ──────
          // Hanya kalkulasi ulang jika belum ada nilai (null/0) DAN bukan forced-exit (-1)
          if ((timeSpentSec == null || timeSpentSec == 0) &&
              session.startedAt != null &&
              session.completedAt != null) {
            timeSpentSec = session.completedAt!.difference(session.startedAt!).inSeconds;
          }

          // ✅ FIX #6: Kirim is_forced_exit menggunakan sentinel -1
          //    Agar ketika ditarik lagi oleh syncPastSessions nilainya tidak berubah menjadi null
          final bool isForcedExit = timeSpentSec == -1;
          final int? uploadedTimeSpent = isForcedExit ? -1 : timeSpentSec;

          // ✅ Restored: 'category_id' adalah kolom NOT NULL di assessment_sessions.
          // Error 42703 sebelumnya bukan karena kolom tidak ada, tapi bug posisi field.
          // Error 23502 (null constraint) membuktikan kolom ini WAJIB ada.
          await SupabaseConfig.client.from('assessment_sessions').upsert({
            'id': session.id,
            'student_id': session.studentId,
            'category_id': session.categoryId,
            'school_id': session.schoolId,
            'status': session.status,
            'score': correctCount,
            'time_spent_sec': uploadedTimeSpent,
            'phase': session.phase,
            'started_at': session.startedAt?.toIso8601String(),
            'completed_at': session.completedAt?.toIso8601String(),
            'sync_status': 'synced',
            'synced_at': DateTime.now().toIso8601String(),
            'attempt_number': session.attemptNumber,
            'cheat_strikes': session.cheatStrikes,
            if (session.accessId != null) 'access_id': session.accessId,
            if (session.currentLevelId != null || session.levelId != null)
              'current_level_id': session.currentLevelId ?? session.levelId,
            if (session.levelId != null || session.currentLevelId != null)
              'level_id': session.levelId ?? session.currentLevelId,
          });
          await _db.sessionDao.updateSyncStatus(session.id, 'synced');
          log('Sesi ${session.id} berhasil diupload. Skor: $correctCount/${sessionAnswers.length}${isForcedExit ? " [FORCED EXIT]" : ""}');
        } catch (e) {
          log('Gagal upload sesi ${session.id}: $e');
          // PENTING: Jangan lanjut ke advance_student_level jika upload sesi gagal.
          // Tandai sesi ini agar dilewati di step 3.
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
            log('Sync error (will retry): ${e.message}');
          }
        } catch (e) {
          log('Unexpected sync error: $e');
        }
      }

      // ─── FIX #2: Panggil advance_student_level SETELAH semua jawaban selesai diupload ──
      // Sekarang kita pastikan semua jawaban sudah tersinkron terlebih dahulu.
      // TAMBAHAN: Hanya panggil untuk sesi yang BERHASIL diupload (syncStatus sudah 'synced').
      for (final session in pendingSessions) {
        if (session.status == 'completed' && !session.id.startsWith('ses_')) {
          // ✅ Cek: sesi harus sudah berhasil diupload ke Supabase
          //    (jika masih 'pending', berarti upload sesi gagal, skip RPC)
          final latestSession = await _db.sessionDao.getSessionById(session.id);
          if (latestSession == null || latestSession.syncStatus != 'synced') {
            log('[Sync] Sesi ${session.id}: upload gagal atau belum sync, tunda advance_student_level');
            continue;
          }

          final levelId = session.currentLevelId ?? session.levelId;
          if (levelId == null) {
            log('[Sync] Sesi ${session.id}: tidak ada current_level_id, lewati advance_student_level');
            continue;
          }

          // ✅ FIX #2: Verifikasi jawaban sudah benar-benar terupload ke Supabase
          //    sebelum panggil RPC yang membaca student_answers dari server.
          final sessionAnswersAfterUpload = await _db.answerDao.getAnswersForSession(session.id);
          final allAnswersSynced = sessionAnswersAfterUpload.every(
            (a) => a.syncStatus == 'synced',
          );

          if (!allAnswersSynced) {
            log('[Sync] Sesi ${session.id}: ada jawaban yang belum sync, tunda advance_student_level ke siklus berikutnya');
            continue;
          }

          try {
            final result = await SupabaseConfig.client.rpc(
              'advance_student_level',
              params: {
                'p_session_id': session.id,
                'p_current_level_id': levelId,
              },
            );

            if (result is Map) {
              final action = result['action'] as String? ?? 'unknown';
              final levelScore = result['level_score'];
              final reason = result['reason'];

              if (action == 'advance') {
                final nextLevelNumber = result['next_level_number'];
                log('[Sync] Sesi ${session.id}: NAIK ke Level $nextLevelNumber (score: $levelScore%)');
              } else if (action == 'complete') {
                log('[Sync] Sesi ${session.id}: SELESAI (score: $levelScore%, reason: $reason)');
              } else if (action == 'fail') {
                log('[Sync] Sesi ${session.id}: GAGAL (score: $levelScore%, reason: $reason)');
              } else if (action == 'error') {
                // RPC mengembalikan action='error' — ini bisa terjadi karena:
                // - Sesi sudah pernah diproses (duplicate call) → aman, abaikan
                // - Data lama dengan enum 'void' status → abaikan, non-fatal
                // - Detail ada di result['detail']
                log('[Sync] Sesi ${session.id}: advance_student_level mengembalikan error (non-fatal) → reason: ${result['reason']}, detail: ${result['detail']}');
              } else {
                log('[Sync] Sesi ${session.id}: advance_student_level action tidak dikenal: $action');
              }
            }
          } on PostgrestException catch (rpcError) {
            // Error jaringan atau DB fatal — log tapi jangan crash
            log('[Sync] PostgrestException pada advance_student_level sesi ${session.id}: ${rpcError.message} (code: ${rpcError.code})');
          } catch (rpcError) {
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

      // ✅ FIX CORRUPT DB (Migrasi/Cleanup on-the-fly):
      // Bersihkan nilai NULL di kolom yang tidak boleh NULL akibat bug sebelumnya.
      await _db.customUpdate('UPDATE local_answers SET is_correct = 0 WHERE is_correct IS NULL');
      await _db.customUpdate("UPDATE local_sessions SET status = 'pending' WHERE status IS NULL");

      // ✅ FIX #5 & #8: Tarik semua sesi, termasuk yang di-void.
      // Jika di-void oleh admin (ujian ulang), kita harus menariknya ke lokal
      // dan mengubah statusnya menjadi 'void' agar tidak dihitung lagi sebagai attempt.
      final sessionsResponse = await SupabaseConfig.client
          .from('assessment_sessions')
          .select('*, student_answers(*)')
          .eq('student_id', studentId);
      for (final row in sessionsResponse) {
        // ✅ FIX B: Jangan timpa sesi lokal yang belum tersinkron (pending/syncing).
        //    Skenario berbahaya:
        //    1. Siswa selesai asesmen → sesi lokal jadi 'completed' + syncStatus='pending'
        //    2. Upload ke Supabase GAGAL → server masih simpan sesi lama dengan status='pending'
        //    3. syncPastSessions tarik data dari server → status='pending' menimpa 'completed' lokal
        //    4. Akibat: sesi seolah hilang, level terbuka kembali = BUG.
        //
        //    Solusi: jika ada sesi lokal dengan ID yang sama DAN syncStatus != 'synced',
        //    itu berarti data lokal adalah ground truth. Skip, jangan ditimpa.
        final sessionId = row['id'] as String;
        LocalSession? existingLocal;
        try {
          existingLocal = await _db.sessionDao.getSessionById(sessionId);
        } catch (e) {
          log('[SyncDown] Sesi $sessionId corrupt di lokal ($e). Akan ditimpa.');
          // Jika mapping gagal (misal karena ada kolom NOT NULL yang null di SQLite lama),
          // anggap tidak ada agar kita menimpanya dengan data server yang valid.
        }

        if (existingLocal != null && existingLocal.syncStatus != 'synced') {
          log('[SyncDown] Skip sesi $sessionId — ada data lokal yang belum tersinkron (${existingLocal.syncStatus}). Data lokal dipertahankan.');
          continue;
        }

        // ✅ FIX #8: Jika sesi di-void di Supabase (karena request ujian ulang), 
        // pastikan status lokalnya menjadi 'void'.
        final isVoid = row['is_void'] == true;
        final effectiveStatus = isVoid ? 'void' : (row['status'] ?? 'pending');

        await _db.sessionDao.upsertSession(
          LocalSessionsCompanion(
            id: Value(row['id']),
            studentId: Value(row['student_id']),
            categoryId: Value(row['category_id'] ?? ''),
            schoolId: Value(row['school_id'] ?? ''),
            levelId: Value(row['level_id'] ?? row['current_level_id']),
            currentLevelId: Value(row['current_level_id'] ?? row['level_id']),
            status: Value(effectiveStatus),
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
              isCorrect: Value(ans['is_correct'] ?? false),
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
