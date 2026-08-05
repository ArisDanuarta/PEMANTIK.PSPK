import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../supabase/supabase_client.dart';

final updateServiceProvider = Provider<UpdateService>((ref) {
  return UpdateService();
});

class AppReleaseInfo {
  final String versionName;
  final int versionCode;
  final String releaseNotes;
  final String downloadUrl;
  final bool isMandatory;

  AppReleaseInfo({
    required this.versionName,
    required this.versionCode,
    required this.releaseNotes,
    required this.downloadUrl,
    required this.isMandatory,
  });

  factory AppReleaseInfo.fromJson(Map<String, dynamic> json) {
    return AppReleaseInfo(
      versionName: json['version_name'] as String,
      versionCode: json['version_code'] as int,
      releaseNotes: json['release_notes'] as String? ?? '',
      downloadUrl: json['download_url'] as String,
      isMandatory: json['is_mandatory'] as bool? ?? false,
    );
  }
}

class UpdateService {
  /// Memeriksa apakah ada pembaruan di database
  /// Mengembalikan objek rilis jika ada pembaruan, null jika aplikasi sudah yang terbaru.
  Future<AppReleaseInfo?> checkForUpdates() async {
    try {
      // Dapatkan versi aplikasi saat ini
      final packageInfo = await PackageInfo.fromPlatform();
      final currentBuildNumber = int.tryParse(packageInfo.buildNumber) ?? 0;

      // Ambil versi terbaru dari Supabase
      final response = await SupabaseConfig.client
          .from('app_releases')
          .select()
          .eq('is_active', true)
          .order('version_code', ascending: false)
          .limit(1)
          .maybeSingle();

      if (response == null) return null;

      final latestRelease = AppReleaseInfo.fromJson(response);

      // Jika versi di server lebih tinggi dari versi yang terpasang
      if (latestRelease.versionCode > currentBuildNumber) {
        return latestRelease;
      }

      return null;
    } catch (e) {
      debugPrint('Error checking for updates: $e');
      return null;
    }
  }

  /// Menampilkan popup pembaruan. 
  /// Mengembalikan true jika pengguna memilih Download (Atau jika mandatory dan user tidak bisa skip).
  Future<void> showUpdateDialog(BuildContext context, AppReleaseInfo release) async {
    return showDialog(
      context: context,
      barrierDismissible: !release.isMandatory,
      builder: (BuildContext context) {
        return PopScope(
          canPop: !release.isMandatory,
          child: AlertDialog(
            title: Text('Pembaruan Tersedia (${release.versionName})'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  release.isMandatory
                      ? 'Pembaruan ini diwajibkan untuk melanjutkan penggunaan aplikasi.'
                      : 'Ada versi aplikasi terbaru. Apakah Anda ingin mengunduhnya sekarang?',
                ),
                if (release.releaseNotes.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text('Catatan Rilis:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(release.releaseNotes, style: const TextStyle(fontSize: 14)),
                ],
              ],
            ),
            actions: [
              if (!release.isMandatory)
                TextButton(
                  child: const Text('Nanti', style: TextStyle(color: Colors.black)),
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFD700),
                  foregroundColor: Colors.black,
                ),
                child: const Text('Unduh Sekarang'),
                onPressed: () async {
                  final url = Uri.parse(release.downloadUrl);
                  try {
                    await launchUrl(url, mode: LaunchMode.externalApplication);
                  } catch (e) {
                    debugPrint('Gagal membuka URL: $e');
                  }
                  
                  // Jika tidak mandatory, biarkan mereka menutup popup setelah klik
                  if (!release.isMandatory) {
                    if (context.mounted) Navigator.of(context).pop();
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
