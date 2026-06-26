import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

// Provider untuk memantau status jaringan secara real-time
final connectivityStreamProvider = StreamProvider<List<ConnectivityResult>>((
  ref,
) {
  return Connectivity().onConnectivityChanged;
});

class ConnectionBanner extends ConsumerWidget {
  const ConnectionBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectivity = ref.watch(connectivityStreamProvider);

    return connectivity.when(
      data: (results) {
        // Di versi 7.x, kita memeriksa apakah list mengandung 'none'
        final isOffline =
            results.contains(ConnectivityResult.none) && results.length == 1;

        if (isOffline) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            color: AppColors.kuningMuda,
            child: Row(
              children: [
                const Icon(
                  Icons.cloud_off_outlined,
                  size: 16,
                  color: AppColors.birNavy,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Tidak ada koneksi internet. Jawabanmu tetap tersimpan.',
                    style: AppTextStyles.label.copyWith(
                      color: AppColors.birNavy,
                    ),
                  ),
                ),
              ],
            ),
          );
        }
        return const SizedBox.shrink();
      },
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }
}
