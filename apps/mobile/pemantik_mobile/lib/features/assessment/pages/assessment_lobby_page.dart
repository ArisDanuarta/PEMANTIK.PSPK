import 'dart:convert';
import 'dart:developer';
import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/secure_storage.dart';
import 'package:uuid/uuid.dart';
import '../../../core/database/database.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/pspk_button.dart';
import '../../../shared/widgets/pspk_dialog.dart';
import '../../../core/router/app_router.dart';
import '../../../core/supabase/supabase_client.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/sync/media_download_service.dart';

class AssessmentLobbyPage extends ConsumerStatefulWidget {
  final String categoryId;
  final String levelId;
  final int levelNumber;
  final String? accessCode;
  final int totalQuestions;
  final int passingThreshold;
  final int timeLimitSec;
  final String? learningObjective;
  final String? successMessage;
  final String? failureMessage;

  const AssessmentLobbyPage({
    super.key,
    required this.categoryId,
    required this.levelId,
    required this.levelNumber,
    this.accessCode,
    required this.totalQuestions,
    required this.passingThreshold,
    required this.timeLimitSec,
    this.learningObjective,
    this.successMessage,
    this.failureMessage,
  });

  @override
  ConsumerState<AssessmentLobbyPage> createState() =>
      _AssessmentLobbyPageState();
}

class _AssessmentLobbyPageState extends ConsumerState<AssessmentLobbyPage> {
  final _accessCodeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Mulai download media di background segera saat lobby dibuka
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final dlState = ref.read(mediaDownloadServiceProvider);
      if (!dlState.isDownloading && !dlState.isDone) {
        ref.read(mediaDownloadServiceProvider.notifier).downloadAllMedia();
      }
    });
  }

  @override
  void dispose() {
    _accessCodeController.dispose();
    super.dispose();
  }

  void _startSession() async {
    log('Anak menekan tombol Mulai Asesmen, Membuat Sesi...');

    final db = ref.read(databaseProvider);
    final studentStr = await secureStorage.read(key: 'student_data');
    final student = jsonDecode(studentStr!);

    // Membuat Session ID yang unik dengan standar UUIDv4
    final sessionId = const Uuid().v4();

    // ── Minggu 2: ambil access_id dari cache lokal ────────────────────────
    // CategoryDao menyimpan access_id dari assessment_access saat sync
    final localCategory = await db.categoryDao.getCategoryById(
      widget.categoryId,
    );
    final accessId = localCategory?.accessId;

    if (accessId == null) {
      log(
        'PERINGATAN: access_id tidak ditemukan untuk categoryId=${widget.categoryId}. '
        'Pastikan sync sudah berjalan. Sesi tetap dibuat tanpa access_id (backward compat).',
      );
    }
    // ── Minggu 2: Online Check (Force Insert ke Supabase) ──────────────
    // Ini adalah 'best implementation' untuk mencegah sesi tersangkut jika
    // dikerjakan offline namun akses ditarik (dicabut) di server.
    bool canProceed = true;
    try {
      // Coba INSERT langsung ke Supabase. RLS akan memvalidasi is_active
      // secara real-time di server.
      await SupabaseConfig.client.from('assessment_sessions').insert({
        'id': sessionId,
        'student_id': student['id'],
        'category_id': widget.categoryId,
        'school_id': student['school_id'],
        'level_id': widget.levelId,
        'status': 'pending',
        'started_at': DateTime.now().toIso8601String(),
        'created_at': DateTime.now().toIso8601String(),
        'access_id': accessId,
        'current_level_id': widget.levelId,
        'phase': localCategory?.phase ?? 'Tahap 1',
      });
      log('Berhasil INSERT sesi ke Supabase secara real-time.');
    } catch (e) {
      log('Gagal membuat sesi di server (RLS / Jaringan): $e');
      if (e is PostgrestException && e.code == '42501') {
        // 42501 adalah RLS Violation (Akses Dicabut atau Kedaluwarsa)
        canProceed = false;
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Akses asesmen ini telah ditutup atau dicabut oleh Admin.',
              ),
              backgroundColor: Colors.red,
            ),
          );
        }
      } else {
        // Error jaringan (Offline).
        // Sebagai aplikasi offline-first, kita tetap mengizinkan lanjut,
        // namun risiko sesi ditolak saat sync later tetap ada.
        log('Aplikasi offline, sesi akan disinkronisasikan nanti.');
      }
    }

    if (!canProceed) return;
    // ──────────────────────────────────────────────────────────────────────

    await db.sessionDao.createSession(
      LocalSessionsCompanion(
        id: drift.Value(sessionId),
        studentId: drift.Value(student['id']),
        categoryId: drift.Value(widget.categoryId),
        schoolId: drift.Value(student['school_id']),
        levelId: drift.Value(widget.levelId),
        startedAt: drift.Value(DateTime.now()),
        createdAt: drift.Value(DateTime.now()),
        // Minggu 2: bind sesi ke akses ujian + track level awal
        accessId: drift.Value(accessId),
        currentLevelId: drift.Value(widget.levelId),
        phase: drift.Value(localCategory?.phase ?? 'Tahap 1'),
      ),
    );

    if (mounted) {
      Navigator.of(
        context,
      ).pushReplacementNamed(AppRouter.questionPage, arguments: sessionId);
    }
  }

  void _promptAccessCode() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Text('Masukkan Kode Akses', style: AppTextStyles.heading2),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Level ini dilindungi dengan kode akses. Silakan minta kode dari guru/admin.',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _accessCodeController,
                decoration: InputDecoration(
                  hintText: 'Kode Akses',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.birNavy),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'Batal',
                style: AppTextStyles.buttonText.copyWith(
                  color: AppColors.textMuted,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                if (_accessCodeController.text.trim() == widget.accessCode) {
                  Navigator.pop(context);
                  _startSession();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('Kode akses salah!'),
                      backgroundColor: AppColors.merahMarun,
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.birNavy,
              ),
              child: const Text('Mulai'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final minutes = widget.timeLimitSec ~/ 60;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: const BackButton(color: AppColors.birNavy),
        title: const SizedBox.shrink(),
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              child: Container(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- BAGIAN ATAS ---
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Persiapan Level ${widget.levelNumber}',
                          style: AppTextStyles.heading1,
                        ),
                        const SizedBox(height: 24),

                        _InfoRow(
                          icon: Icons.timer_outlined,
                          label: 'Waktu Maksimal: $minutes Menit',
                        ),
                        _InfoRow(
                          icon: Icons.library_books_outlined,
                          label: 'Jumlah Soal: ${widget.totalQuestions}',
                        ),
                        if (widget.accessCode != null &&
                            widget.accessCode!.isNotEmpty)
                          const _InfoRow(
                            icon: Icons.lock_outline,
                            label: 'Membutuhkan Kode Akses',
                          ),

                        const SizedBox(height: 24),
                        const Divider(color: AppColors.border),
                        const SizedBox(height: 16),

                        if (widget.learningObjective != null &&
                            widget.learningObjective!.isNotEmpty) ...[
                          Text(
                            'Capaian Belajar:',
                            style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.learningObjective!,
                            style: AppTextStyles.bodyMedium,
                          ),
                          const SizedBox(height: 16),
                        ],

                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.birNavyMuda,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(
                                Icons.info_outline,
                                color: AppColors.birTeal,
                                size: 20,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Kerjakan semua soal dengan teliti. Kamu tidak bisa kembali ke soal sebelumnya.',
                                  style: AppTextStyles.bodyMedium,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // --- BAGIAN BAWAH ---
                    Padding(
                      padding: const EdgeInsets.only(top: 24.0),
                      child: Column(
                        children: [
                          // Widget status download media
                          _MediaDownloadStatusWidget(),
                          const SizedBox(height: 16),
                          PspkButton(
                            label: 'Mulai Sekarang',
                            fullWidth: true,
                            onPressed: () async {
                              final db = ref.read(databaseProvider);
                              final cats =
                                  await (db.select(db.localCategories)..where(
                                        (t) => t.id.equals(widget.categoryId),
                                      ))
                                      .get();
                              if (cats.isNotEmpty) {
                                final cat = cats.first;
                                final now = DateTime.now();
                                if (cat.validUntil != null &&
                                    now.isAfter(cat.validUntil!)) {
                                  if (context.mounted) {
                                    showPspkDialog(
                                      context,
                                      title: 'Akses Berakhir',
                                      message:
                                          'Maaf, waktu pengerjaan untuk asesmen ini sudah berakhir.',
                                      isError: true,
                                      confirmText: 'Kembali',
                                      onConfirm: () => Navigator.pop(context),
                                    );
                                  }
                                  return;
                                }
                                if (cat.validFrom != null &&
                                    now.isBefore(cat.validFrom!)) {
                                  if (context.mounted) {
                                    showPspkDialog(
                                      context,
                                      title: 'Belum Mulai',
                                      message:
                                          'Asesmen ini belum bisa dimulai sekarang.',
                                      isError: true,
                                      confirmText: 'Kembali',
                                      onConfirm: () => Navigator.pop(context),
                                    );
                                  }
                                  return;
                                }
                              }

                              if (widget.accessCode != null &&
                                  widget.accessCode!.isNotEmpty) {
                                if (context.mounted) _promptAccessCode();
                              } else {
                                if (context.mounted) {
                                  showPspkDialog(
                                    context,
                                    title: 'Mulai Asesmen?',
                                    message:
                                        'Waktu akan berjalan dan tidak bisa dijeda. Pastikan kamu sudah siap ya.',
                                    confirmText: 'Ya, Mulai',
                                    onConfirm: () => _startSession(),
                                  );
                                }
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoRow({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.textMuted),
          const SizedBox(width: 12),
          Text(label, style: AppTextStyles.bodyLarge),
        ],
      ),
    );
  }
}

/// Widget yang menampilkan status download aset soal di halaman lobby
class _MediaDownloadStatusWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dl = ref.watch(mediaDownloadServiceProvider);

    // Jika tidak ada aset yang perlu di-download, sembunyikan widget ini
    if (!dl.isDownloading && !dl.isDone) return const SizedBox.shrink();
    if (dl.isDone && dl.totalFiles == 0) return const SizedBox.shrink();

    // === Sedang mengunduh ===
    if (dl.isDownloading) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.birNavyMuda,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.birTeal.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.birTeal,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Menyiapkan soal... (${dl.downloadedFiles}/${dl.totalFiles})',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.birNavy,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: dl.progress,
                      minHeight: 4,
                      backgroundColor: AppColors.birNavy.withValues(alpha: 0.15),
                      valueColor: const AlwaysStoppedAnimation<Color>(AppColors.birTeal),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // === Selesai - ada file yang gagal ===
    if (dl.isDone && dl.hasFailures) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.orange.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.orange.shade300),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber_rounded,
                    color: Colors.orange.shade700, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${dl.failedUrls.length} file gagal diunduh. '
                    'Soal tetap bisa dikerjakan, namun media mungkin perlu koneksi internet.',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: Colors.orange.shade800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () =>
                  ref.read(mediaDownloadServiceProvider.notifier).retryFailed(),
              child: Text(
                'Coba Unduh Ulang',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.birNavy,
                  fontWeight: FontWeight.bold,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
      );
    }

    // === Selesai - semua berhasil ===
    if (dl.isDone && !dl.hasFailures && dl.totalFiles > 0) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.green.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.green.shade300),
        ),
        child: Row(
          children: [
            Icon(Icons.check_circle_outline_rounded,
                color: Colors.green.shade600, size: 20),
            const SizedBox(width: 10),
            Text(
              'Semua aset soal siap. Kamu bisa mulai!',
              style: AppTextStyles.bodyMedium.copyWith(
                color: Colors.green.shade700,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }
}
