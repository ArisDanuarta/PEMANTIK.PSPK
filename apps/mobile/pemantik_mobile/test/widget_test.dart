// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pemantik_mobile/main.dart';

void main() {
  testWidgets('TestScreen renders correctly smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    // Karena kita menggunakan Riverpod, kita harus membungkus aplikasi dengan ProviderScope di dalam pengujian.
    await tester.pumpWidget(
      const ProviderScope(
        child: PemantikApp(),
      ),
    );

    // Memverifikasi bahwa TestScreen kita berhasil dimuat dengan mencari teks spesifik
    // yang sudah kita buat di dalam lib/main.dart
    expect(find.text('Sistem Basis'), findsOneWidget);
    expect(find.text('Arsitektur Folder & Tema Siap!'), findsOneWidget);
    
    // Memastikan teks angka '0' dari aplikasi counter lama sudah tidak ada
    expect(find.text('0'), findsNothing);
  });
}