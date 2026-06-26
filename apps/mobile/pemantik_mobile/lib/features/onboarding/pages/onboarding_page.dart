import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';

class OnboardingData {
  final String title;
  final String subtitle;
  final String imagePath;
  final Color backgroundColor;
  final Color textColor;
  final bool isDark;

  OnboardingData({
    required this.title,
    required this.subtitle,
    required this.imagePath,
    required this.backgroundColor,
    required this.textColor,
    required this.isDark,
  });
}

class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({super.key});

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends ConsumerState<OnboardingPage> with TickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  late final AnimationController _logoAnimController;
  late final Animation<double> _logoScaleAnim;

  final List<OnboardingData> _pages = [
    OnboardingData(
      title: 'Menyiapkan...',
      subtitle: 'Mempersiapkan pengalaman terbaik untuk Anda.',
      imagePath: 'assets/images/LOGO_ANDROID.png',
      backgroundColor: AppColors.birNavy, // Dark Blue
      textColor: Colors.white,
      isDark: true,
    ),
    OnboardingData(
      title: '#BerpihakKepadaAnak',
      subtitle: 'Asesmen yang adil dan menyenangkan.',
      imagePath: 'assets/images/LOGO_PEMANTIK_BERWARNA.png',
      backgroundColor: Colors.white,
      textColor: AppColors.birNavy,
      isDark: false,
    ),
    OnboardingData(
      title: 'Mengukur Mandiri',
      subtitle: 'Evaluasi akurat sesuai dengan fase pembelajaran.',
      imagePath: 'assets/images/LOGO_ANDROID.png',
      backgroundColor: AppColors.birNavy,
      textColor: Colors.white,
      isDark: true,
    ),
    OnboardingData(
      title: 'Memantik Potensi',
      subtitle: 'Membuka wawasan untuk masa depan yang lebih baik.',
      imagePath: 'assets/images/LOGO_PEMANTIK_BERWARNA.png',
      backgroundColor: Colors.white,
      textColor: AppColors.birNavy,
      isDark: false,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _logoAnimController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _logoScaleAnim = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _logoAnimController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    _logoAnimController.dispose();
    super.dispose();
  }

  void _onNext() {
    if (_currentIndex < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOutCubic,
      );
    } else {
      _finishOnboarding();
    }
  }

  Future<void> _finishOnboarding() async {
    await secureStorage.write(key: 'has_seen_onboarding', value: 'true');
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, AppRouter.login);
  }

  @override
  Widget build(BuildContext context) {
    final currentPage = _pages[_currentIndex];

    return Scaffold(
      body: AnimatedContainer(
        duration: const Duration(milliseconds: 500),
        color: currentPage.backgroundColor,
        child: Stack(
          children: [
            PageView.builder(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() {
                  _currentIndex = index;
                });
              },
              itemCount: _pages.length,
              itemBuilder: (context, index) {
                final page = _pages[index];
                return Padding(
                  padding: const EdgeInsets.all(40.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Animated Logo
                      ScaleTransition(
                        scale: _logoScaleAnim,
                        child: Container(
                          width: 200,
                          height: 200,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: page.isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.05),
                                blurRadius: 40,
                                spreadRadius: 10,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Image.asset(
                              page.imagePath,
                              width: 160,
                              height: 160,
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 60),
                      // Title with Slide & Fade
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 400),
                        transitionBuilder: (Widget child, Animation<double> animation) {
                          return FadeTransition(
                            opacity: animation,
                            child: SlideTransition(
                              position: Tween<Offset>(
                                begin: const Offset(0.0, 0.2),
                                end: Offset.zero,
                              ).animate(animation),
                              child: child,
                            ),
                          );
                        },
                        child: Text(
                          page.title,
                          key: ValueKey<String>(page.title),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: page.textColor,
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Subtitle
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 400),
                        child: Text(
                          page.subtitle,
                          key: ValueKey<String>(page.subtitle),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: page.textColor.withOpacity(0.8),
                            fontSize: 16,
                            height: 1.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 80), // Space for bottom controls
                    ],
                  ),
                );
              },
            ),

            // Bottom Controls
            Positioned(
              bottom: 40,
              left: 20,
              right: 20,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Dot Indicators
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_pages.length, (index) {
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 8,
                        width: _currentIndex == index ? 24 : 8,
                        decoration: BoxDecoration(
                          color: _currentIndex == index 
                              ? (currentPage.isDark ? AppColors.kuningEmas : AppColors.birNavy)
                              : (currentPage.isDark ? Colors.white38 : Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 32),
                  // Button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _onNext,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: currentPage.isDark ? AppColors.kuningEmas : AppColors.birNavy,
                        foregroundColor: currentPage.isDark ? AppColors.birNavy : Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: currentPage.isDark ? 0 : 4,
                      ),
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 300),
                        child: Text(
                          _currentIndex == _pages.length - 1 ? 'Mulai Sekarang' : 'Lanjut',
                          key: ValueKey<int>(_currentIndex),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
