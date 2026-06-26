import 'dart:math';

class Levenshtein {
  /// Mengembalikan nilai akurasi dari 0.0 (tidak mirip sama sekali) hingga 1.0 (identik)
  static double calculateSimilarity(String input, String target) {
    // Hapus tanda baca agar komparasi teks dari STT lebih adil
    final punctuation = RegExp(r'[^\w\s]');
    final s1 = input.toLowerCase().replaceAll(punctuation, '').trim();
    final s2 = target.toLowerCase().replaceAll(punctuation, '').trim();

    if (s1 == s2) return 1.0;
    if (s1.isEmpty || s2.isEmpty) return 0.0;

    final dist = _levenshteinDistance(s1, s2);
    final maxLength = max(s1.length, s2.length);

    return 1.0 - (dist / maxLength);
  }

  static int _levenshteinDistance(String s, String t) {
    final m = s.length;
    final n = t.length;
    final dp = List.generate(m + 1, (_) => List.filled(n + 1, 0));

    for (int i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (int j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    for (int i = 1; i <= m; i++) {
      for (int j = 1; j <= n; j++) {
        final cost = s[i - 1] == t[j - 1] ? 0 : 1;
        dp[i][j] = [
          dp[i - 1][j] + 1, // Deletion
          dp[i][j - 1] + 1, // Insertion
          dp[i - 1][j - 1] + cost, // Substitution
        ].reduce(min);
      }
    }
    return dp[m][n];
  }
}
