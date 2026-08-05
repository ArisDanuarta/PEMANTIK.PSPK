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

    // Gunakan _showDialogSafely dan cek mounted sebelum navigasi
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.error != null && next.error != previous?.error) {
        _showDialogSafely(
          title: 'Login Gagal',
          message: next.error!,
          isError: true,
          confirmText: 'Tutup',
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
          title: 'Selamat Datang!',
          message: 'Anda berhasil masuk ke Pemantik.',
          isError: false,
          confirmText: 'Lanjut',
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

    final bool isConfirmEnabled = _usernameController.text.trim().isNotEmpty && _pin.length == _pinLength;

    return Scaffold(
      backgroundColor: AppColors.primaryContainer,
      body: SafeArea(
        bottom: false,
        child: IgnorePointer(
          ignoring: authState.isLoading,
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight,
                  ),
                  child: Column(
                    children: [
                      // --- BAGIAN ATAS (Header) ---
                      Container(
                        width: double.infinity,
                        constraints: BoxConstraints(
                          minHeight: constraints.maxHeight * 0.35,
                        ),
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Image.asset(
                              'assets/images/LOGO_PEMANTIK_PUTIH_KUNING.png',
                              height: 64,
                              fit: BoxFit.contain,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Tingkatkan Literasi & Numerasi Sejak Dini',
                              style: AppTextStyles.bodyMedium.copyWith(
                                color: AppColors.onPrimaryContainer,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),

                      // --- BAGIAN BAWAH (Card) ---
                      Container(
                        width: double.infinity,
                        constraints: BoxConstraints(
                          minHeight: constraints.maxHeight * 0.65,
                        ),
                        padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                        decoration: const BoxDecoration(
                          color: AppColors.surfaceContainerLowest,
                          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black12,
                              blurRadius: 30,
                              offset: Offset(0, -8),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Username Input
                            Container(
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.outlineVariant),
                              ),
                              child: TextField(
                                controller: _usernameController,
                                autocorrect: false,
                                enableSuggestions: false,
                                textInputAction: TextInputAction.done,
                                decoration: InputDecoration(
                                  prefixIcon: const Icon(Icons.person_outline, color: AppColors.outlineVariant),
                                  hintText: 'Username',
                                  hintStyle: AppTextStyles.bodyLarge.copyWith(
                                    color: AppColors.outlineVariant,
                                  ),
                                  border: InputBorder.none,
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 16,
                                  ),
                                ),
                                style: AppTextStyles.bodyLarge.copyWith(
                                  color: AppColors.onSurface,
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),

                            // PIN Indicator
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: List.generate(_pinLength, (index) {
                                final isFilled = index < _pin.length;
                                final isActive = index == _pin.length;
                                return AnimatedContainer(
                                  duration: const Duration(milliseconds: 150),
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: isFilled ? AppColors.primary : AppColors.surface,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isFilled
                                          ? AppColors.primary
                                          : (isActive ? AppColors.secondaryContainer : AppColors.outlineVariant),
                                      width: isActive ? 2 : 1,
                                    ),
                                  ),
                                  child: Center(
                                    child: isFilled
                                        ? Text(
                                            _pin[index],
                                            style: AppTextStyles.heading2.copyWith(
                                              color: AppColors.onPrimary,
                                              fontSize: 24,
                                            ),
                                          )
                                        : null,
                                  ),
                                );
                              }),
                            ),
                            const SizedBox(height: 32),

                            // Numpad
                            NumpadWidget(
                              onDigitPressed: _handleDigitPressed,
                              onDelete: _handleDelete,
                              onConfirm: _handleLogin,
                              confirmEnabled: isConfirmEnabled,
                              isLoading: authState.isLoading,
                            ),
                            
                            // Bottom SafeArea padding
                            SizedBox(height: MediaQuery.paddingOf(context).bottom),
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
      ),
    );
  }
}