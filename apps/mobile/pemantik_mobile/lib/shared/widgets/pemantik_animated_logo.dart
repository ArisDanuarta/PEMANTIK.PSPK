// pemantik_animated_logo.dart
//
// Widget reusable untuk simbol api Pemantik yang bisa dipakai di banyak
// halaman: splash screen, loading indicator, tombol sync, empty state, dll.
//
// Animasi terdiri dari 2 fase berurutan:
//   1) FILL  - bentuk api "terisi" dari bawah ke atas (clip reveal), meniru
//      efek api menyala, bukan sekadar fade-in.
//   2) BOUNCE - setelah full terisi, logo memantul dengan sedikit overshoot
//      lalu settle (bukan bounce kaku/robotic ala Curves.bounceOut).
//
// Dependency yang dibutuhkan di pubspec.yaml:
//   dependencies:
//     flutter_svg: ^2.0.10+1
//
// Daftarkan asetnya juga:
//   flutter:
//     assets:
//       - assets/icons/pemantik_flame.svg
//
// -----------------------------------------------------------------------

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Path default aset SVG. Sesuaikan kalau kamu taruh di lokasi lain.
const String kPemantikFlameAsset = 'assets/icons/pemantik_flame.svg';

/// Widget animasi utama: fill dari bawah -> bounce pop.
///
/// Cocok dipakai untuk momen "branding entrance" — splash screen, dialog
/// sukses, atau saat sebuah kartu/halaman pertama kali muncul.
///
/// Gunakan [GlobalKey<PemantikAnimatedLogoState>] kalau kamu ingin memicu
/// ulang animasinya secara manual (misal saat user menekan tombol refresh):
///
/// ```dart
/// final logoKey = GlobalKey<PemantikAnimatedLogoState>();
/// ...
/// PemantikAnimatedLogo(key: logoKey, size: 96),
/// ...
/// logoKey.currentState?.replay();
/// ```
class PemantikAnimatedLogo extends StatefulWidget {
  const PemantikAnimatedLogo({
    super.key,
    this.size = 120,
    this.assetPath = kPemantikFlameAsset,
    this.fillDuration = const Duration(milliseconds: 850),
    this.bounceDuration = const Duration(milliseconds: 650),
    this.autoPlay = true,
    this.idlePulse = false,
    this.onComplete,
  });

  /// Lebar & tinggi widget (aset di-render bujur sangkar, proporsional).
  final double size;

  /// Path aset SVG di dalam project Flutter.
  final String assetPath;

  /// Durasi fase 1 (fill dari bawah ke atas).
  final Duration fillDuration;

  /// Durasi fase 2 (bounce/pop).
  final Duration bounceDuration;

  /// Kalau true, animasi otomatis jalan begitu widget pertama kali di-build.
  final bool autoPlay;

  /// Kalau true, setelah intro selesai logo akan "bernapas" pelan terus-
  /// menerus (skala naik-turun sangat halus). Cocok dipakai sebagai loading
  /// indicator supaya terasa hidup, bukan diam kaku menunggu.
  final bool idlePulse;

  /// Dipanggil setelah seluruh urutan animasi (fill + bounce) selesai.
  final VoidCallback? onComplete;

  @override
  State<PemantikAnimatedLogo> createState() => PemantikAnimatedLogoState();
}

class PemantikAnimatedLogoState extends State<PemantikAnimatedLogo>
    with TickerProviderStateMixin {
  late final AnimationController _fillController;
  late final AnimationController _bounceController;
  late final AnimationController _idleController;

  late final Animation<double> _fillProgress;
  late final Animation<double> _bounceScale;
  late final Animation<double> _idleScale;

  @override
  void initState() {
    super.initState();

    _fillController = AnimationController(
      vsync: this,
      duration: widget.fillDuration,
    );

    _bounceController = AnimationController(
      vsync: this,
      duration: widget.bounceDuration,
    );

    _idleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    _fillProgress = CurvedAnimation(
      parent: _fillController,
      curve: Curves.easeOutCubic,
    );

    // Bounce custom: overshoot ke atas, sedikit balik, settle ke 1.0.
    // Lebih hidup dibanding Curves.bounceOut yang terasa "mantul lantai".
    _bounceScale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.72, end: 1.14)
            .chain(CurveTween(curve: Curves.easeOutBack)),
        weight: 45,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.14, end: 0.93)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 25,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 0.93, end: 1.03)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 15,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.03, end: 1.0)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 15,
      ),
    ]).animate(_bounceController);

    _idleScale = Tween<double>(begin: 0.97, end: 1.03).animate(
      CurvedAnimation(parent: _idleController, curve: Curves.easeInOut),
    );

    if (widget.autoPlay) {
      // Dijadwalkan setelah frame pertama supaya aman dipanggil dari initState.
      WidgetsBinding.instance.addPostFrameCallback((_) => play());
    }
  }

  /// Mainkan urutan animasi dari awal: fill -> bounce -> (opsional) idle loop.
  Future<void> play() async {
    if (!mounted) return;
    _idleController.stop();
    _bounceController.reset();
    _fillController.reset();

    await _fillController.forward();
    if (!mounted) return;
    await _bounceController.forward();
    if (!mounted) return;

    if (widget.idlePulse) {
      _idleController.repeat(reverse: true);
    }

    widget.onComplete?.call();
  }

  /// Ulangi animasi dari awal (dipakai lewat GlobalKey, mis. tombol sync).
  Future<void> replay() => play();

  @override
  void dispose() {
    _fillController.dispose();
    _bounceController.dispose();
    _idleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge(
        [_fillController, _bounceController, _idleController],
      ),
      builder: (context, child) {
        final idleFactor = widget.idlePulse && _idleController.isAnimating
            ? _idleScale.value
            : 1.0;

        return Transform.scale(
          scale: _bounceScale.value * idleFactor,
          child: ClipRect(
            clipper: _BottomUpRevealClipper(_fillProgress.value),
            child: child,
          ),
        );
      },
      child: SvgPicture.asset(
        widget.assetPath,
        width: widget.size,
        height: widget.size,
        fit: BoxFit.contain,
      ),
    );
  }
}

/// Clipper yang membuka area gambar dari bawah ke atas sesuai [progress]
/// (0.0 = tersembunyi total, 1.0 = terlihat penuh). Ini yang bikin efek
/// "terisi seperti api menyala", bukan cuma fade opacity.
class _BottomUpRevealClipper extends CustomClipper<Rect> {
  const _BottomUpRevealClipper(this.progress);

  final double progress;

  @override
  Rect getClip(Size size) {
    final visibleHeight = size.height * progress.clamp(0.0, 1.0);
    return Rect.fromLTWH(
      0,
      size.height - visibleHeight,
      size.width,
      visibleHeight,
    );
  }

  @override
  bool shouldReclip(covariant _BottomUpRevealClipper oldClipper) {
    return oldClipper.progress != progress;
  }
}

/// Varian ringan: hanya ikon statis (tanpa animasi intro), tapi tetap punya
/// "napas" halus terus-menerus. Cocok dipakai sebagai loading indicator
/// pengganti CircularProgressIndicator generik, atau sebagai app-bar/nav icon
/// yang tidak butuh entrance animation setiap kali halaman dibuka.
class PemantikPulseLoader extends StatelessWidget {
  const PemantikPulseLoader({
    super.key,
    this.size = 56,
    this.assetPath = kPemantikFlameAsset,
  });

  final double size;
  final String assetPath;

  @override
  Widget build(BuildContext context) {
    return PemantikAnimatedLogo(
      size: size,
      assetPath: assetPath,
      fillDuration: const Duration(milliseconds: 500),
      bounceDuration: const Duration(milliseconds: 500),
      idlePulse: true,
      autoPlay: true,
    );
  }
}