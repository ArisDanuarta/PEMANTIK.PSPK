import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/pspk_dialog.dart';
import '../providers/auth_provider.dart';
import '../../../shared/widgets/numpad_widget.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final TextEditingController _usernameController = TextEditingController();
  String _pin = '';
  static const int _pinLength = 6;

  // FIX 1: Flag untuk mencegah dialog/navigasi dipanggil lebih dari sekali
  bool _isDialogShowing = false;

  @override
  void initState() {
    super.initState();
    // FIX 2: Pasang listener ke _usernameController agar tombol confirm
    // di NumpadWidget ikut rebuild saat username berubah
    _usernameController.addListener(_onUsernameChanged);
  }

  void _onUsernameChanged() {
    // Trigger rebuild supaya confirmEnabled di NumpadWidget ter-update
    setState(() {});
  }

  void _handleDigitPressed(String digit) {
    if (_pin.length < _pinLength) {
      setState(() {
        _pin += digit;
      });
    }
  }

  void _handleDelete() {
    if (_pin.isNotEmpty) {
      setState(() {
        _pin = _pin.substring(0, _pin.length - 1);
      });
    }
  }

  void _handleLogin() {
    final username = _usernameController.text.trim();
    if (username.isEmpty || _pin.length != _pinLength) return;

    ref.read(authProvider.notifier).login(username, _pin);
  }

  // FIX 3: Helper untuk menampilkan dialog secara aman setelah frame selesai render
  void _showDialogSafely({
    required String title,
    required String message,
    required bool isError,
    required String confirmText,
    required VoidCallback onConfirm,
  }) {
    if (_isDialogShowing || !mounted) return;
    _isDialogShowing = true;

    // Tunda sampai frame saat ini selesai agar tidak konflik dengan build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        _isDialogShowing = false;
        return;
      }
      showPspkDialog(
        context,
        title: title,
        message: message,
        isError: isError,
        confirmText: confirmText,
        onConfirm: () {
          _isDialogShowing = false;
          onConfirm();
        },
      );
    });
  }

  @override
  void dispose() {
    _usernameController.removeListener(_onUsernameChanged);
    _usernameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    // FIX 4: Gunakan _showDialogSafely dan cek mounted sebelum navigasi
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.error != null && next.error != previous?.error) {
        _showDialogSafely(
          title: 'Ups, Gagal',
          message: next.error!,
          isError: true,
          confirmText: 'Coba Lagi',
          onConfirm: () {
            if (mounted) {
              setState(() {
                _pin = '';
              });
            }
          },
        );
      }

      if (next.isAuthenticated && (previous?.isAuthenticated != true)) {
        _showDialogSafely(
          title: 'Berhasil!',
          message: 'Kamu berhasil masuk. Siap untuk memulai asesmen?',
          isError: false,
          confirmText: 'Mulai',
          onConfirm: () {
            if (mounted) {
              Navigator.of(
                context,
              ).pushNamedAndRemoveUntil('/home', (route) => false);
            }
          },
        );
      }
    });

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: IgnorePointer(
          ignoring: authState.isLoading,
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                child: Container(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // --- BAGIAN ATAS ---
                      Column(
                        children: [
                          const SizedBox(height: 60),

                          // Logo Pemantik
                          Image.asset(
                            'assets/images/LOGO_PEMANTIK_BERWARNA.png',
                            height: 60,
                            fit: BoxFit.contain,
                          ),
                          const SizedBox(height: 12),

                          // Tagline
                          Text(
                            'Asesmen Literasi & Numerasi',
                            style: AppTextStyles.heading2.copyWith(
                              color: AppColors.birNavy,
                              fontStyle: FontStyle.italic,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Masukkan kredensial untuk memulai asesmen',
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: AppColors.textMuted,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 40),

                          // Form Username
                          Container(
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: TextField(
                              controller: _usernameController,
                              autocorrect: false,
                              enableSuggestions: false,
                              textInputAction: TextInputAction.done,
                              decoration: InputDecoration(
                                hintText: 'Nama Pengguna',
                                hintStyle: AppTextStyles.bodyMedium.copyWith(
                                  color: AppColors.textMuted,
                                ),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 16,
                                ),
                              ),
                              style: AppTextStyles.bodyLarge,
                            ),
                          ),
                          const SizedBox(height: 32),

                          // Indikator PIN
                          Text(
                            'PIN Akses',
                            style: AppTextStyles.label.copyWith(
                              color: AppColors.birNavy,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(_pinLength, (index) {
                                final isFilled = index < _pin.length;
                                return AnimatedContainer(
                                  duration: const Duration(milliseconds: 150),
                                  margin: const EdgeInsets.symmetric(horizontal: 6),
                                  width: 48,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    color: isFilled
                                        ? AppColors.birNavy
                                        : AppColors.surface,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isFilled
                                          ? AppColors.birNavy
                                          : AppColors.border,
                                      width: 2,
                                    ),
                                  ),
                                  child: Center(
                                    child: isFilled
                                        ? const Icon(
                                            Icons.circle,
                                            size: 12,
                                            color: Colors.white,
                                          )
                                        : null,
                                  ),
                                );
                              }),
                            ),
                          ),
                          const SizedBox(height: 16),

                          if (authState.isLoading)
                            const CircularProgressIndicator(
                                color: AppColors.kuningEmas)
                          else
                            const SizedBox(height: 20),
                        ],
                      ),

                      // --- BAGIAN BAWAH ---
                      Column(
                        children: [
                          const SizedBox(height: 20),
                          NumpadWidget(
                            onDigitPressed: _handleDigitPressed,
                            onDelete: _handleDelete,
                            onConfirm: _handleLogin,
                            confirmEnabled:
                                _usernameController.text.trim().isNotEmpty &&
                                _pin.length == _pinLength,
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}