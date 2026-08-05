import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/router/app_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../../core/sync/sync_service.dart';
import '../../../core/database/database.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  // Kontrol state untuk expansion (expand/collapse) Data Orang Tua dan Alamat
  bool _isParentsExpanded = false;
  bool _isAddressExpanded = false;

  /// Baca nama langsung dari nested objek FK yang sudah di-join di Edge Function
  /// Format: student['father_occupation'] = { 'name': 'Petani' } atau null
  String _getNestedName(Map<String, dynamic>? student, String key) {
    final nested = student?[key];
    if (nested == null) return '-';
    final name = nested['name']?.toString().trim();
    if (name == null || name.isEmpty) return '-';
    return name;
  }

  String _getValue(dynamic value, [String fallback = '-']) {
    if (value == null) return fallback;
    final str = value.toString().trim();
    if (str.isEmpty) return fallback;
    return str;
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref, int pendingCount) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss',
      barrierColor: AppColors.inverseSurface.withValues(alpha: 0.4),
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (ctx, anim1, anim2) {
        return Align(
          alignment: Alignment.center,
          child: Material(
            color: Colors.transparent,
            child: Container(
              width: MediaQuery.of(context).size.width * 0.9,
              constraints: const BoxConstraints(maxWidth: 400),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryContainer.withValues(alpha: 0.12),
                    blurRadius: 30,
                    offset: const Offset(0, 8),
                  )
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                children: [
                  // Flame accent
                  Positioned(
                    right: -40,
                    top: -40,
                    child: Container(
                      width: 128,
                      height: 128,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.secondaryFixed.withValues(alpha: 0.1),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Header
                        Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: const BoxDecoration(
                                color: AppColors.errorContainer,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.logout,
                                color: AppColors.error,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Text(
                                pendingCount > 0 ? 'Data Offline Belum Sinkron!' : 'Yakin ingin keluar?',
                                style: AppTextStyles.heading2.copyWith(color: AppColors.primary),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        // Body
                        Text(
                          pendingCount > 0
                              ? 'Ada $pendingCount ujian offline yang belum tersinkron. Sesi belajar akan diakhiri. Pastikan tersinkronisasi untuk menghindari kehilangan data jika Anda berganti perangkat.'
                              : 'Sesi belajar Anda saat ini akan diakhiri. Pastikan semua tugas telah tersinkronisasi sebelum keluar.',
                          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant),
                        ),
                        const SizedBox(height: 32),
                        // Actions
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => Navigator.pop(ctx),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: AppColors.primary, width: 2),
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                ),
                                child: Text('Batal', style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () async {
                                  Navigator.pop(ctx);
                                  await ref.read(authProvider.notifier).logout();
                                  if (context.mounted) {
                                    Navigator.of(context).pushNamedAndRemoveUntil(AppRouter.login, (route) => false);
                                  }
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF8E130B),
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  elevation: 0,
                                ),
                                child: Text('Ya, Keluar', style: AppTextStyles.labelLarge.copyWith(color: AppColors.onError)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
      transitionBuilder: (ctx, anim1, anim2, child) {
        return FadeTransition(
          opacity: anim1,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.95, end: 1.0).animate(CurvedAnimation(parent: anim1, curve: Curves.easeOutBack)),
            child: child,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final studentAsync = ref.watch(currentStudentProvider);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceContainerLowest,
        elevation: 0.5,
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                color: AppColors.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person, color: AppColors.onPrimaryContainer),
            ),
            const SizedBox(width: 16),
            Text('Profil Siswa', style: AppTextStyles.heading2.copyWith(color: AppColors.primary)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.cloud_sync, color: AppColors.primary),
            onPressed: () async {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Memulai sinkronisasi...')));
              try {
                await ref.read(syncServiceProvider).uploadCompletedSessions();
                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sinkronisasi berhasil!'), backgroundColor: Colors.green));
              } catch (e) {
                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Gagal sinkronisasi'), backgroundColor: Colors.red));
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.edit, color: AppColors.primary),
            onPressed: () {
              Navigator.pushNamed(context, AppRouter.editProfile);
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: studentAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (_, _) => const Center(child: Text('Gagal memuat profil')),
        data: (student) {
          debugPrint('=== [ProfilePage] BUILD dengan nama: ${student?['full_name']} ===');
          final fullName = _getValue(student?['full_name'], 'Anak');
          final username = _getValue(student?['username']);
          final nisn = _getValue(student?['nisn']);
          
          String gender = '-';
          if (student?['gender'] == 'L') {
            gender = 'Laki-laki';
          } else if (student?['gender'] == 'P') {
            gender = 'Perempuan';
          }

          final schoolName = _getValue(student?['schools']?['name']);
          final className = _getValue(student?['classes']?['name'] ?? student?['ses_class']);
          
          String formattedDob = '-';
          final birthDate = student?['birth_date'];
          if (birthDate != null && birthDate.toString().isNotEmpty) {
            try {
              final dob = DateTime.parse(birthDate.toString());
              formattedDob = '${dob.day.toString().padLeft(2, '0')}/${dob.month.toString().padLeft(2, '0')}/${dob.year}';
            } catch (_) {}
          }
          
          final fatherJob = _getNestedName(student, 'father_occupation');
          final fatherEd = _getNestedName(student, 'father_education');
          final motherJob = _getNestedName(student, 'mother_occupation');
          final motherEd = _getNestedName(student, 'mother_education');
          
          final prov = _getValue(student?['province']);
          final city = _getValue(student?['city']);
          final district = _getValue(student?['district']);
          final village = _getValue(student?['village']);

          // Initials
          String initials = 'S';
          if (fullName.isNotEmpty) {
            final parts = fullName.split(' ');
            if (parts.length > 1) {
              initials = '${parts[0][0]}${parts[1][0]}'.toUpperCase();
            } else {
              initials = fullName[0].toUpperCase();
            }
          }

          return Stack(
            children: [
              // Flame Pattern background
              Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.topRight,
                    radius: 1.5,
                    colors: [
                      AppColors.secondaryContainer.withValues(alpha: 0.08),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.4],
                  ),
                ),
              ),
              Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.bottomLeft,
                    radius: 1.5,
                    colors: [
                      AppColors.error.withValues(alpha: 0.04),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.4],
                  ),
                ),
              ),

              ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
                children: [
                  // Header
                  Column(
                    children: [
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          Container(
                            width: 192,
                            height: 192,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.secondaryContainer.withValues(alpha: 0.2),
                            ),
                          ),
                          Container(
                            width: 128,
                            height: 128,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.primaryContainer,
                              border: Border.all(color: AppColors.surface, width: 4),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primaryContainer.withValues(alpha: 0.15),
                                  blurRadius: 30,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              initials,
                              style: AppTextStyles.heading1.copyWith(
                                fontSize: 40,
                                color: AppColors.surface,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(fullName, style: AppTextStyles.heading1.copyWith(color: AppColors.primary)),
                      const SizedBox(height: 4),
                      Text('@$username', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant)),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainer,
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2)],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle)),
                            const SizedBox(width: 8),
                            const Icon(Icons.cloud_done, color: Colors.green, size: 16),
                            const SizedBox(width: 4),
                            Text('Tersinkron', style: AppTextStyles.labelMedium.copyWith(color: AppColors.onSurface)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),

                  // Data Akademik Card (Default Expanded, Not Collapsible)
                  _buildStaticCard(
                    icon: Icons.school,
                    title: 'Data Akademik',
                    items: [
                      _buildListItem(Icons.badge, 'NISN', nisn),
                      _buildListItem(Icons.school, 'Sekolah', schoolName),
                      _buildListItem(Icons.meeting_room, 'Kelas', className),
                      _buildListItem(Icons.calendar_today, 'Tanggal Lahir', formattedDob),
                      _buildListItem(Icons.transgender, 'Jenis Kelamin', gender),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Data Orang Tua Card (Collapsible)
                  _buildCollapsibleCard(
                    icon: Icons.family_restroom,
                    title: 'Data Orang Tua',
                    isExpanded: _isParentsExpanded,
                    onToggle: () => setState(() => _isParentsExpanded = !_isParentsExpanded),
                    items: [
                      _buildListItem(Icons.work, 'Pekerjaan Ayah', fatherJob),
                      _buildListItem(Icons.school, 'Pendidikan Ayah', fatherEd),
                      _buildListItem(Icons.work, 'Pekerjaan Ibu', motherJob),
                      _buildListItem(Icons.school, 'Pendidikan Ibu', motherEd),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Alamat Lengkap Card (Collapsible)
                  _buildCollapsibleCard(
                    icon: Icons.location_on,
                    title: 'Alamat Lengkap',
                    isExpanded: _isAddressExpanded,
                    onToggle: () => setState(() => _isAddressExpanded = !_isAddressExpanded),
                    items: [
                      _buildListItem(Icons.home, 'Alamat (Kelurahan/Desa)', village),
                      _buildListItem(Icons.map, 'Kecamatan', district),
                      _buildListItem(Icons.location_city, 'Kabupaten/Kota', city),
                      _buildListItem(Icons.public, 'Provinsi', prov),
                    ],
                  ),
                  const SizedBox(height: 40),

                  // Logout Action
                  ElevatedButton.icon(
                    onPressed: () async {
                      final studentId = student?['id'] as String?;
                      int pendingCount = 0;
                      if (studentId != null) {
                        try {
                          pendingCount = await ref.read(databaseProvider).sessionDao.countPendingSessionsForStudent(studentId);
                        } catch (_) {}
                      }
                      if (context.mounted) {
                        _showLogoutDialog(context, ref, pendingCount);
                      }
                    },
                    icon: const Icon(Icons.logout, color: AppColors.error),
                    label: Text('Keluar', style: AppTextStyles.labelLarge.copyWith(color: AppColors.error)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.errorContainer.withValues(alpha: 0.5),
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStaticCard({required IconData icon, required String title, required List<Widget> items}) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: AppColors.primaryContainer.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(title, style: AppTextStyles.heading3.copyWith(color: AppColors.primary)),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: AppColors.surfaceContainerHigh),
          const SizedBox(height: 24),
          ...items.expand((w) => [w, const SizedBox(height: 24)]).take(items.length * 2 - 1),
        ],
      ),
    );
  }

  Widget _buildCollapsibleCard({
    required IconData icon,
    required String title,
    required bool isExpanded,
    required VoidCallback onToggle,
    required List<Widget> items,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: AppColors.primaryContainer.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                children: [
                  Icon(icon, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(child: Text(title, style: AppTextStyles.heading3.copyWith(color: AppColors.primary))),
                  Icon(
                    isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    color: AppColors.onSurfaceVariant,
                  ),
                ],
              ),
            ),
          ),
          if (isExpanded)
            Padding(
              padding: const EdgeInsets.only(left: 24, right: 24, bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Divider(height: 1, color: AppColors.surfaceContainerHigh),
                  const SizedBox(height: 24),
                  ...items.expand((w) => [w, const SizedBox(height: 24)]).take(items.length * 2 - 1),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildListItem(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: const BoxDecoration(
            color: AppColors.surfaceContainerHigh,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: AppColors.primary, size: 20),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: AppTextStyles.labelSmall.copyWith(color: AppColors.onSurfaceVariant)),
              Text(value, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurface)),
            ],
          ),
        ),
      ],
    );
  }
}
