import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/pspk_button.dart';
import '../../../shared/widgets/pspk_dialog.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../../core/sync/sync_service.dart';
import '../../../core/database/database.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentAsync = ref.watch(currentStudentProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: studentAsync.when(
        data: (student) {
          final fullName = student?['full_name'] ?? 'Siswa';
          final username = student?['username'] ?? '-';
          final nisn = student?['nisn'] ?? '-';
          final gender = student?['gender'] == 'L' ? 'Laki-laki' : (student?['gender'] == 'P' ? 'Perempuan' : '-');
          final schoolName = student?['schools']?['name'] ?? '-';
          final className = student?['classes']?['name'] ?? student?['ses_class'] ?? '-';

          // Get Initials
          String initials = 'S';
          if (fullName.isNotEmpty) {
            final parts = fullName.split(' ');
            if (parts.length > 1) {
              initials = '${parts[0][0]}${parts[1][0]}'.toUpperCase();
            } else {
              initials = fullName[0].toUpperCase();
            }
          }

          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: CustomScrollView(
                slivers: [
                  // Header
                  SliverToBoxAdapter(
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.only(top: 60, bottom: 40, left: 24, right: 24),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppColors.birNavy, AppColors.birNavyGelap],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.only(
                          bottomLeft: Radius.circular(32),
                          bottomRight: Radius.circular(32),
                        ),
                      ),
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 50,
                            backgroundColor: AppColors.kuningEmas,
                            child: Text(
                              initials,
                              style: AppTextStyles.heading1.copyWith(
                                color: AppColors.birNavyGelap,
                                fontSize: 36,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            fullName,
                            style: AppTextStyles.heading1.copyWith(color: Colors.white),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '@$username',
                              style: AppTextStyles.bodyMedium.copyWith(color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Detail Kartu
                  SliverPadding(
                    padding: const EdgeInsets.all(24.0),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        Text('Informasi Siswa', style: AppTextStyles.heading2),
                        const SizedBox(height: 16),
                        _buildInfoCard(Icons.badge_outlined, 'NISN', nisn),
                        _buildInfoCard(Icons.school_outlined, 'Asal Sekolah', schoolName),
                        _buildInfoCard(Icons.class_outlined, 'Kelas', className),
                        _buildInfoCard(Icons.person_outline, 'Jenis Kelamin', gender),

                        const SizedBox(height: 32),

                        // Tombol Sinkronisasi Manual
                        PspkButton(
                          label: 'Sinkronisasi Jawaban Manual',
                          outlined: false,
                          fullWidth: true,
                          onPressed: () async {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Memulai sinkronisasi...'),
                                duration: Duration(seconds: 2),
                              ),
                            );
                            
                            try {
                              await ref.read(syncServiceProvider).uploadCompletedSessions();
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('✅ Sinkronisasi berhasil!'),
                                    backgroundColor: AppColors.sukses,
                                  ),
                                );
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('❌ Gagal sinkronisasi. Coba lagi nanti.'),
                                    backgroundColor: AppColors.merahMarun,
                                  ),
                                );
                              }
                            }
                          },
                        ),
                        const SizedBox(height: 16),

                        // Tombol Logout menggunakan Dialog Kustom
                        PspkButton(
                          label: 'Keluar',
                          outlined: true,
                          fullWidth: true,
                          onPressed: () async {
                            final studentId = student?['id'] as String?;
                            int pendingCount = 0;
                            if (studentId != null) {
                              try {
                                pendingCount = await ref
                                    .read(databaseProvider)
                                    .sessionDao
                                    .countPendingSessionsForStudent(studentId);
                              } catch (_) {}
                            }

                            final title = pendingCount > 0
                                ? 'Perhatian: Ada Data Offline!'
                                : 'Keluar?';
                            final message = pendingCount > 0
                                ? 'Ada $pendingCount ujian offline kamu yang belum tersinkron ke server. Hasil tetap tersimpan aman di perangkat ini dan akan otomatis diupload saat kamu login kembali dengan koneksi internet.\n\nYakin ingin keluar?'
                                : 'Apakah kamu yakin ingin keluar dari aplikasi?';

                            if (!context.mounted) return;
                            showPspkDialog(
                              context,
                              title: title,
                              message: message,
                              isError: pendingCount > 0,
                              confirmText: 'Ya, Keluar',
                              onConfirm: () async {
                                await ref.read(authProvider.notifier).logout();
                                if (context.mounted) {
                                  Navigator.of(
                                    context,
                                  ).pushNamedAndRemoveUntil('/login', (route) => false);
                                }
                              },
                            );
                          },
                        ),
                        const SizedBox(height: 24),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.kuningEmas)),
        error: (_, _) => const Center(child: Text('Gagal memuat profil')),
      ),
    );
  }

  Widget _buildInfoCard(IconData icon, String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.birNavyMuda.withValues(alpha: 0.3),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.birNavy, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: AppTextStyles.label),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
