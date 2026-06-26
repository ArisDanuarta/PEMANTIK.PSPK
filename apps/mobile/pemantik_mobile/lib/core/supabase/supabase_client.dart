import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String supabaseUrl = 'https://bhrqorbjdmlewwmlajfg.supabase.co';
  static const String supabaseAnonKey =
      'sb_publishable_SzhpIVvCr63y2FuU4fAAHg_pUw-rB7u';

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      publishableKey: supabaseAnonKey,
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}
