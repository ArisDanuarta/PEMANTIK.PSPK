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
  ConsumerState<AssessmentLobbyPage> createState() => _AssessmentLobbyPageState();
}

class _AssessmentLobbyPageState extends ConsumerState<AssessmentLobbyPage> {
  final _accessCodeController = TextEditingController();
  
  bool _showTimeLockError = false;
  String _timeLockErrorTitle = '';
  String _timeLockErrorMsg = '';
  bool _showConfirmation = false;
  List<String> _questionTypes = [];
  bool _isLoadingTypes = true;

  @override
  void initState() {
    super.initState();
    _loadQuestionTypes();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final dlState = ref.read(mediaDownloadServiceProvider);
      if (!dlState.isDownloading && !dlState.isDone) {
        ref.read(mediaDownloadServiceProvider.notifier).downloadAllMedia();
      }
    });
  }

  Future<void> _loadQuestionTypes() async {
    final db = ref.read(databaseProvider);
    try {
      final questions = await (db.select(db.localQuestions)
            ..where((t) => t.levelId.equals(widget.levelId)))
          .get();
      
      final rawTypes = questions.map((q) => q.questionType).toSet().toList();
      
      final mappedTypes = rawTypes.map((type) {
        switch (type) {
          case 'multiple_choice': return 'Pilihan Ganda';
          case 'image_choice': return 'Pilihan Gambar';
          case 'audio_question': return 'Soal Audio';
          case 'video_question': return 'Soal Video';
          case 'drag_drop': return 'Drag & Drop';
          case 'voice_recording': return 'Voice Recording';
          default: return 'Lainnya';
        }
      }).toList();
      
      if (mounted) {
        setState(() {
          _questionTypes = mappedTypes;
          _isLoadingTypes = false;
        });
      }
    } catch (e) {
      log('Error loading question types: $e');
      if (mounted) {
        setState(() {
          _questionTypes = ['Campuran'];
          _isLoadingTypes = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _accessCodeController.dispose();
    super.dispose();
  }

  void _showErrorOverlay(String title, String message) {
    setState(() {
      _timeLockErrorTitle = title;
      _timeLockErrorMsg = message;
      _showTimeLockError = true;
    });
  }

  void _hideErrorOverlay() {
    setState(() {
      _showTimeLockError = false;
    });
  }

  void _startSession() async {
    log('Anak menekan tombol Mulai Asesmen, Membuat Sesi...');

    final db = ref.read(databaseProvider);
    final studentStr = await secureStorage.read(key: 'student_data');
    if (studentStr == null) return;

    final student = jsonDecode(studentStr);

    final sessionId = const Uuid().v4();

    final localCategory = await db.categoryDao.getCategoryById(widget.categoryId);
    final accessId = localCategory?.accessId;

    if (accessId == null) {
      log('PERINGATAN: access_id tidak ditemukan. Sesi tetap dibuat tanpa access_id.');
    }

    // ✅ FIX #3: Hitung attempt_number dari jumlah sesi yang sudah selesai sebelumnya
    //    Sebelumnya selalu di-hardcode 1, akibatnya statistik percobaan salah.
    final previousAttempts = await db.sessionDao.getTotalAttemptsCountForLevel(
      student['id'],
      widget.levelId,
      localCategory?.phase ?? 'Tahap 1',
    );
    final currentAttemptNumber = previousAttempts + 1;
    log('Attempt ke-$currentAttemptNumber untuk level ${widget.levelId}');

    try {
      await SupabaseConfig.client.from('assessment_sessions').insert({
        'id': sessionId,
        'student_id': student['id'],
        'school_id': student['school_id'],
        'category_id': widget.categoryId,
        'level_id': widget.levelId,
        'status': 'pending',
        'started_at': DateTime.now().toIso8601String(),
        'created_at': DateTime.now().toIso8601String(),
        'access_id': accessId,
        'current_level_id': widget.levelId,
        'phase': localCategory?.phase ?? 'Tahap 1',
        // ✅ FIX #3: Sertakan attempt_number yang sudah dihitung dengan benar
        'attempt_number': currentAttemptNumber,
      });
      log('Berhasil INSERT sesi ke Supabase secara real-time.');
    } catch (e) {
      log('Gagal membuat sesi di server: $e');
      if (e is PostgrestException && e.code == '42501') {
        log('Peringatan: RLS Supabase memblokir insert (42501). Mengabaikan error ini agar anak tetap bisa lanjut secara offline.');
      }
    }

    await db.sessionDao.createSession(
      LocalSessionsCompanion(
        id: drift.Value(sessionId),
        studentId: drift.Value(student['id']),
        categoryId: drift.Value(widget.categoryId),
        schoolId: drift.Value(student['school_id']),
        levelId: drift.Value(widget.levelId),
        startedAt: drift.Value(DateTime.now()),
        createdAt: drift.Value(DateTime.now()),
        accessId: drift.Value(accessId),
        currentLevelId: drift.Value(widget.levelId),
        phase: drift.Value(localCategory?.phase ?? 'Tahap 1'),
        // ✅ FIX #3: Simpan juga attempt_number yang benar di lokal
        attemptNumber: drift.Value(currentAttemptNumber),
      ),
    );

    if (mounted) {
      Navigator.of(context).pushReplacementNamed(AppRouter.questionPage, arguments: sessionId);
    }
  }

  void _onMulaiPressed() async {
    final db = ref.read(databaseProvider);
    final cats = await (db.select(db.localCategories)..where((t) => t.id.equals(widget.categoryId))).get();
    
    if (cats.isNotEmpty) {
      final cat = cats.first;
      final now = DateTime.now();
      
      if (cat.validUntil != null && now.isAfter(cat.validUntil!)) {
        _showErrorOverlay('Asesmen Berakhir', 'Maaf, waktu pengerjaan untuk asesmen ini sudah berakhir.');
        return;
      }
      if (cat.validFrom != null && now.isBefore(cat.validFrom!)) {
        _showErrorOverlay('Belum Dimulai', 'Asesmen ini belum bisa dimulai sekarang.');
        return;
      }
    }

    if (widget.accessCode != null && widget.accessCode!.isNotEmpty) {
      if (_accessCodeController.text.trim() != widget.accessCode) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kode akses salah atau kosong!'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
    }

    setState(() {
      _showConfirmation = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final minutes = widget.timeLimitSec ~/ 60;
    bool requiresCode = widget.accessCode != null && widget.accessCode!.isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                _buildHeader(context),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.only(left: 20, right: 20, top: 24, bottom: 120),
                    child: Column(
                      children: [
                        _buildBentoGrid(minutes, requiresCode),
                        const SizedBox(height: 16),
                        _buildCapaianBelajar(),
                        const SizedBox(height: 24),
                        _MediaDownloadStatusWidget(),
                        const SizedBox(height: 24),
                        if (requiresCode) _buildAccessCodeInput(),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).padding.bottom + 20),
              decoration: BoxDecoration(
                color: AppColors.surface.withValues(alpha: 0.9),
              ),
              child: ElevatedButton(
                onPressed: _onMulaiPressed,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFD700),
                  foregroundColor: AppColors.primary,
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 8,
                  shadowColor: const Color(0xFFFFD700).withValues(alpha: 0.4),
                ),
                child: Text(
                  'Mulai Sekarang',
                  style: AppTextStyles.heading2.copyWith(color: AppColors.primary),
                ),
              ),
            ),
          ),

          if (_showTimeLockError)
            Positioned.fill(
              child: Container(
                color: AppColors.primary.withValues(alpha: 0.4),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                alignment: Alignment.center,
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerLowest,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 20, spreadRadius: 5)],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: const BoxDecoration(
                          color: AppColors.surfaceContainerHighest,
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: const Icon(Icons.hourglass_empty, size: 40, color: AppColors.primary),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _timeLockErrorTitle,
                        style: AppTextStyles.heading1,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _timeLockErrorMsg,
                        style: AppTextStyles.bodyMedium.copyWith(color: const Color(0xFF74777F)),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _hideErrorOverlay,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: AppColors.onPrimary,
                          minimumSize: const Size(double.infinity, 48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: Text(
                          'Mengerti',
                          style: AppTextStyles.labelLarge.copyWith(color: AppColors.onPrimary),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          if (_showConfirmation)
            Positioned.fill(
              child: Container(
                color: AppColors.primary.withValues(alpha: 0.4),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                alignment: Alignment.center,
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerLowest,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 20, spreadRadius: 5)],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: const BoxDecoration(
                          color: Color(0xFFE6F4F1),
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: const Icon(Icons.help_outline, size: 40, color: Color(0xFF146C2E)),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Mulai Asesmen?',
                        style: AppTextStyles.heading1,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Waktu akan berjalan dan tidak bisa dijeda. Pastikan kamu sudah siap ya.',
                        style: AppTextStyles.bodyMedium.copyWith(color: const Color(0xFF74777F)),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFCE8E8),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.merahMarun),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.warning_amber_rounded, color: AppColors.merahMarun, size: 24),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'PERINGATAN: Jangan meminimalkan atau keluar dari aplikasi selama asesmen berlangsung, atau Anda akan otomatis dinyatakan GAGAL!',
                                style: AppTextStyles.bodySmall.copyWith(color: AppColors.merahMarun, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => setState(() => _showConfirmation = false),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.primary,
                                side: const BorderSide(color: AppColors.primary),
                                minimumSize: const Size(double.infinity, 48),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: Text('Batal', style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                setState(() => _showConfirmation = false);
                                _startSession();
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: AppColors.onPrimary,
                                minimumSize: const Size(double.infinity, 48),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                elevation: 0,
                              ),
                              child: Text('Ya, Mulai', style: AppTextStyles.labelLarge.copyWith(color: AppColors.onPrimary)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(0, 1)),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.primary),
            onPressed: () => Navigator.pop(context),
          ),
          Expanded(
            child: Text(
              'Persiapan Level ${widget.levelNumber}',
              style: AppTextStyles.heading1.copyWith(color: AppColors.primary, fontSize: 20),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildBentoGrid(int minutes, bool requiresCode) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildBentoCard(
                icon: Icons.schedule,
                iconBg: AppColors.primary.withValues(alpha: 0.1),
                iconColor: AppColors.primary,
                title: 'Waktu Maksimal',
                subtitle: '$minutes Menit',
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildBentoCard(
                icon: Icons.format_list_numbered,
                iconBg: const Color(0xFFEADDFF),
                iconColor: const Color(0xFF4F378B),
                title: 'Jumlah Soal',
                subtitle: '${widget.totalQuestions} Soal',
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildBentoCard(
                icon: requiresCode ? Icons.key : Icons.lock_open,
                iconBg: const Color(0xFFC4EED0),
                iconColor: const Color(0xFF146C2E),
                title: 'Status Akses',
                subtitle: requiresCode ? 'Diperlukan' : 'Terbuka',
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildBentoCard(
                icon: Icons.format_list_bulleted,
                iconBg: const Color(0xFFD3E3FD), // Soft Blue
                iconColor: const Color(0xFF0B57D0), // Deep Blue
                title: 'Tipe Soal',
                subtitle: _isLoadingTypes ? 'Memuat...' : (_questionTypes.isEmpty ? 'Campuran' : _questionTypes.join(', ')),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCapaianBelajar() {
    if (widget.learningObjective == null || widget.learningObjective!.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.05),
            blurRadius: 15,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(color: const Color(0xFF805600).withValues(alpha: 0.1), shape: BoxShape.circle),
                alignment: Alignment.center,
                child: const Icon(Icons.school, color: Color(0xFF805600), size: 18),
              ),
              const SizedBox(width: 12),
              Text('Capaian Belajar', style: AppTextStyles.labelSmall.copyWith(color: const Color(0xFF74777F))),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            widget.learningObjective!,
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurface, height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _buildBentoCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
  }) {
    return Container(
      height: 110,
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.05),
            blurRadius: 15,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            alignment: Alignment.center,
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const Spacer(),
          Text(
            title,
            style: AppTextStyles.labelSmall.copyWith(color: const Color(0xFF74777F)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600, color: AppColors.onSurface),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildAccessCodeInput() {
    return Column(
      children: [
        Text(
          'Masukkan Kode Akses',
          style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _accessCodeController,
          textAlign: TextAlign.center,
          style: AppTextStyles.heading1.copyWith(letterSpacing: 4, fontSize: 24, color: AppColors.primary),
          textCapitalization: TextCapitalization.characters,
          decoration: InputDecoration(
            filled: true,
            fillColor: AppColors.surfaceContainerLowest,
            hintText: '......',
            hintStyle: const TextStyle(letterSpacing: 4),
            contentPadding: const EdgeInsets.symmetric(vertical: 20),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Color(0xFFC4C6CF)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppColors.primary, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

class _MediaDownloadStatusWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dl = ref.watch(mediaDownloadServiceProvider);

    if (!dl.isDownloading && !dl.isDone) return const SizedBox.shrink();
    if (dl.isDone && dl.totalFiles == 0) return const SizedBox.shrink();

    String title = dl.isDownloading ? 'Menyiapkan Soal' : 'Materi Terunduh';
    String status = dl.isDownloading ? '${dl.downloadedFiles}/${dl.totalFiles}' : (dl.hasFailures ? 'Gagal' : 'Ready');
    Color statusColor = dl.isDownloading ? const Color(0xFFCA8A04) : (dl.hasFailures ? AppColors.error : const Color(0xFF146C2E));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.05),
            blurRadius: 15,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.cloud_download, color: Color(0xFF74777F)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                Text(status, style: AppTextStyles.labelSmall.copyWith(color: statusColor)),
              ],
            ),
          ),
          if (dl.isDownloading)
            SizedBox(
              width: 80,
              height: 8,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: dl.progress,
                  backgroundColor: AppColors.surfaceContainerHighest,
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                ),
              ),
            )
          else if (!dl.hasFailures)
            Container(
              width: 80,
              height: 8,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF008080)]),
              ),
            ),
        ],
      ),
    );
  }
}
