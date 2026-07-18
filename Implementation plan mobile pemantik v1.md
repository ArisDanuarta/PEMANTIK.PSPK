# Implementation Plan - Penyempurnaan Mobile App Pemantik

> **Scope:** `apps/mobile/pemantik_mobile`
> **Referensi:** `Blueprint_Sistem_Pemantik_v2.md`, Audit Report (Antigravity/Gemini)
> **Status:** Siap eksekusi - pseudocode & SQL sudah disiapkan
> **Stack terkonfirmasi:** Flutter · Riverpod (code-gen) · Drift (SQLite) · Supabase · connectivity_plus

---

## 0. Ringkasan Temuan (Konsolidasi Audit)

| # | Gap | File Terdampak | Severity |
|---|-----|-----------------|----------|
| 0 | `recordingLocalPath` tidak pernah di-mapping saat `submitAssessment()` - data path rekaman terkubur di JSON `answerData` | `assessment_provider.dart` | 🔴 Blocker untuk Phase 4 |
| 1 | Tidak ada Countdown Timer & force auto-submit | `assessment_provider.dart`, `question_page.dart` | 🔴 Tinggi |
| 2 | `connection_banner.dart` & `SyncService.uploadCompletedSessions()` belum terhubung (tidak ada auto-trigger) | `main.dart` | 🔴 Tinggi |
| 3 | Payload UPSERT `student_answers` tidak menyertakan `question_version` | `sync_service.dart` | 🟠 Menengah |
| 4 | Error handling sync masih generic `catch` - tidak membedakan `403 session_expired` | `sync_service.dart` | 🟠 Menengah |
| 5 | File `.m4a` voice recording tidak pernah diupload ke Supabase Storage | `sync_service.dart`, migration SQL | 🟠 Menengah (depend on #0) |

**Urutan eksekusi final** (gap #0 disisipkan sebagai prasyarat wajib sebelum Phase 4, sisanya sesuai prioritas yang sudah disepakati):

```
Phase 0  → Fix mapping recordingLocalPath           (prasyarat Phase 4)
Phase 1  → Timer & Force Auto-Submit
Phase 2  → Auto-Sync Background Listener
Phase 3  → question_version + Error Handling (403/expired)
Phase 4  → Upload Voice Recording ke Supabase Storage
```

---

## 1. Aturan Analisis & Coding Sebelum Eksekusi

Aturan ini berlaku di **setiap phase** di bawah, tanpa kecuali:

1. **Tidak menyentuh layer di luar scope phase.** Phase 1 hanya boleh menyentuh `assessment_provider.dart` + `question_page.dart`. Jangan refactor `sync_service.dart` di tengah-tengah Phase 1, walau "kelihatan rapi" - itu jadi scope Phase 3/4.
2. **Riverpod code-gen wajib di-regenerate setiap ada perubahan provider.** Setiap selesai edit file `*_provider.dart`, jalankan:
   ```bash
   dart run build_runner build --delete-conflicting-outputs
   ```
   Jangan commit kode yang `.g.dart`-nya belum sinkron.
3. **Setiap perubahan skema Drift wajib naik versi migration.** Jangan edit kolom existing tanpa `MigrationStrategy.onUpgrade`. Drift akan crash di device lama jika `schemaVersion` tidak dinaikkan.
4. **State timer/listener tidak boleh memicu rebuild seluruh halaman.** Gunakan `ref.watch(provider.select((s) => s.remainingSeconds))` di widget timer, jangan `ref.watch(assessmentProvider)` polos.
5. **Tidak ada `print()` untuk debug di kode final.** Gunakan logger yang sudah ada di project (atau `debugPrint` minimal, dengan guard `kDebugMode`).
6. **Setiap fungsi async yang menyentuh Supabase wajib dibungkus try-catch spesifik**, bukan `catch (e)` generik - lihat Phase 3 untuk pattern-nya.
7. **Tidak ada perubahan ke RLS Policy / SQL migration tanpa eksplisit ditandai sebagai "perlu dijalankan manual di Supabase Dashboard"** - karena migration lokal tidak otomatis sinkron ke Supabase project.
8. **Setiap phase wajib ada validasi manual sebelum lanjut ke phase berikutnya** (lihat bagian Validasi di tiap phase). Jangan menumpuk 2 phase sekaligus sebelum testing.

---

## 2. Phase 0 - Fix Mapping `recordingLocalPath` (Prasyarat)

### Root cause
`voice_recording_widget.dart` mengirim data sebagai string JSON gabungan:
```dart
'{"transcription": "$_transcription", "score": $_similarityScore, "path": "$_localAudioPath"}'
```
Tapi `assessment_provider.dart` membungkusnya lagi tanpa parsing:
```dart
answerData: drift.Value(jsonEncode({'value': userAnswer})), // double-encoded, path tidak terbaca
```

### Implementasi

**File: `lib/features/assessment/providers/assessment_provider.dart`**

```dart
// Tambahkan helper di atas submitAssessment()
Map<String, dynamic>? _tryParseAnswerJson(String raw) {
  try {
    final decoded = jsonDecode(raw);
    if (decoded is Map<String, dynamic>) return decoded;
  } catch (_) {
    // bukan JSON valid - berarti tipe soal selain voice_recording, aman diabaikan
  }
  return null;
}

// Di dalam submitAssessment(), sebelum membentuk LocalAnswersCompanion:
final parsed = _tryParseAnswerJson(userAnswer);
final isVoiceAnswer = q.type == 'voice_recording' && parsed != null;

final companion = LocalAnswersCompanion(
  id: drift.Value(UuidHelper.generateV4()),
  sessionId: drift.Value(sessionId),
  questionId: drift.Value(q.id),
  answerData: drift.Value(
    isVoiceAnswer ? jsonEncode(parsed) : jsonEncode({'value': userAnswer}),
  ),
  recordingLocalPath: isVoiceAnswer
      ? drift.Value(parsed['path'] as String?)
      : const drift.Value(null),
  isCorrect: drift.Value(isCorrect),
  syncStatus: const drift.Value('pending'),
  answeredAt: drift.Value(DateTime.now()),
);
```

> Catatan: jangan double-encode lagi - simpan `parsed` (sudah berupa Map asli dari widget) langsung sebagai `answerData`, bukan dibungkus `{'value': ...}` sekali lagi.

### Validasi Phase 0
- [ ] Kerjakan 1 soal `voice_recording` di emulator/device, submit assessment.
- [ ] Query manual ke SQLite lokal (lewat `drift_db_viewer` atau debug print sementara) - pastikan kolom `recordingLocalPath` **terisi path file**, bukan `null`.
- [ ] Pastikan kolom `answerData` berisi JSON bersih (`transcription`, `score`, `path`), bukan JSON yang ter-nested dua kali.
- [ ] Soal tipe lain (multiple_choice, drag_drop, dst) tetap tersimpan normal - tidak regresi.

---

## 3. Phase 1 - Timer & Force Auto-Submit

### File yang disentuh
- `lib/features/assessment/providers/assessment_provider.dart`
- `lib/features/assessment/pages/question_page.dart`

### Implementasi Provider

```dart
// State tambahan di AssessmentState
class AssessmentState {
  // ...existing fields
  final int remainingSeconds;
  final bool isTimeUp;
}

// Di dalam AssessmentProvider (Notifier)
Timer? _countdownTimer;

void startTimer(int timeLimitMin) {
  _countdownTimer?.cancel();
  state = state.copyWith(remainingSeconds: timeLimitMin * 60, isTimeUp: false);

  _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
    final remaining = state.remainingSeconds - 1;
    if (remaining <= 0) {
      timer.cancel();
      state = state.copyWith(remainingSeconds: 0, isTimeUp: true);
      forceSubmit();
      return;
    }
    state = state.copyWith(remainingSeconds: remaining);
  });
}

Future<void> forceSubmit() async {
  // panggil submitAssessment() yang sudah ada, dengan flag forced=true
  await submitAssessment(forced: true);
}

@override
void dispose() {
  _countdownTimer?.cancel();
  super.dispose();
}
```

> Panggil `startTimer(package.timeLimitMin)` sekali saja saat halaman soal pertama kali dibuka (di `initState` halaman, lewat `ref.read(...).startTimer(...)`), **jangan** di-trigger ulang setiap rebuild.

### Implementasi UI Timer

**File: `question_page.dart`**

```dart
// Widget khusus, watch dengan select agar TIDAK rebuild seluruh halaman soal
class _CountdownBadge extends ConsumerWidget {
  const _CountdownBadge();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final remaining = ref.watch(
      assessmentProvider.select((s) => s.remainingSeconds),
    );
    final minutes = (remaining ~/ 60).toString().padLeft(2, '0');
    final seconds = (remaining % 60).toString().padLeft(2, '0');
    final isWarning = remaining <= 60; // highlight merah di 1 menit terakhir

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isWarning ? AppColors.maroon : AppColors.navy,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '$minutes:$seconds',
        style: AppTextStyles.rubik.copyWith(color: Colors.white),
      ),
    );
  }
}
```

```dart
// Listener untuk auto-navigasi saat waktu habis (taruh di build() halaman utama)
ref.listen(assessmentProvider.select((s) => s.isTimeUp), (prev, next) {
  if (next == true) {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const ResultPage()),
    );
  }
});
```

### Validasi Phase 1
- [ ] Set `timeLimitMin` ke nilai kecil (misal 1 menit) di data test untuk mempercepat pengujian.
- [ ] Timer berjalan mundur tanpa nge-lag UI soal (cek dengan Flutter DevTools, pastikan rebuild hanya pada widget badge).
- [ ] Saat waktu = 0, assessment otomatis ter-submit dan navigasi ke `ResultPage` tanpa interaksi user.
- [ ] Tutup app saat timer berjalan, buka kembali - pastikan tidak crash (timer harus re-init dari state tersimpan, bukan dari nol lagi tanpa konteks).

---

## 4. Phase 2 - Auto-Sync Background Listener

### File yang disentuh
- `lib/main.dart` (atau root widget seperti `dashboard_page.dart` jika lebih tepat secara lifecycle)

### Implementasi

```dart
class _AppRootState extends ConsumerState<AppRoot> {
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  List<ConnectivityResult> _lastStatus = [ConnectivityResult.none];

  @override
  void initState() {
    super.initState();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((result) {
      final wasOffline = _lastStatus.every((r) => r == ConnectivityResult.none);
      final isNowOnline = result.any((r) => r != ConnectivityResult.none);

      if (wasOffline && isNowOnline) {
        // trigger sync sekali saat transisi none -> online, bukan setiap event
        ref.read(syncServiceProvider).uploadCompletedSessions();
      }
      _lastStatus = result;
    });
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }
}
```

> **Penting:** `connection_banner.dart` **tidak diubah fungsinya** - biarkan tetap sebagai pure UI indicator yang baca status koneksi. Jangan duplikasi listener di dua tempat (root + banner), karena akan memicu `uploadCompletedSessions()` dipanggil dobel setiap reconnect.

### Validasi Phase 2
- [ ] Matikan WiFi/data di device → kerjakan beberapa soal → status jawaban di Drift tetap `pending`.
- [ ] Nyalakan kembali koneksi → tunggu beberapa detik → cek log/SQLite, status berubah jadi `synced` **tanpa** user membuka halaman sync manual.
- [ ] Toggle koneksi on/off berulang dengan cepat (flaky network simulation) → pastikan `uploadCompletedSessions()` **tidak terpanggil berkali-kali secara beruntun** untuk event yang sama.

---

## 5. Phase 3 - `question_version` & Error Handling (403/Expired)

### File yang disentuh
- `lib/core/sync/sync_service.dart`
- `lib/core/database/tables/local_answers.dart` (+ migration)

### 5.1 Tambah kolom `questionVersion` di Drift

```dart
// local_answers.dart
class LocalAnswers extends Table {
  // ...existing columns
  TextColumn get questionVersion => text().nullable()();
}
```

```dart
// database.dart - naikkan schemaVersion dan tambahkan migration step
@override
int get schemaVersion => /* versi lama + 1 */;

@override
MigrationStrategy get migration => MigrationStrategy(
  onUpgrade: (m, from, to) async {
    if (from < /* versi baru */) {
      await m.addColumn(localAnswers, localAnswers.questionVersion);
    }
  },
);
```

### 5.2 Sertakan `question_version` saat UPSERT

```dart
// sync_service.dart, di dalam fungsi upload jawaban
await supabase.from('student_answers').upsert(
  {
    'session_id': answer.sessionId,
    'question_id': answer.questionId,
    'answer_data': answer.answerData,
    'is_correct': answer.isCorrect,
    'question_version': answer.questionVersion, // ← baru
    // media_url ditambahkan di Phase 4
  },
  onConflict: 'session_id,question_id',
);
```

> Nilai `questionVersion` diisi saat soal pertama kali di-cache (Tahap 1 offline-first) - ambil dari kolom versi/updated_at soal yang sudah ada di tabel `Questions` lokal, lalu salin ke `LocalAnswers.questionVersion` saat jawaban disimpan (di `assessment_provider.dart`, bersamaan dengan perubahan Phase 0).

### 5.3 Error handling spesifik

```dart
Future<void> uploadCompletedSessions() async {
  final pending = await _db.localAnswersDao.getPendingAnswers();

  for (final answer in pending) {
    try {
      await _uploadSingleAnswer(answer); // berisi upsert di atas
      await _db.localAnswersDao.markSynced(answer.id);
    } on PostgrestException catch (e) {
      if (e.code == '403' || e.message.contains('session_expired')) {
        await _db.localAnswersDao.markFailedSync(
          answer.id,
          reason: 'session_expired',
        );
        // tampilkan notifikasi ke siswa, jangan retry otomatis
        _notifySessionExpired(answer.sessionId);
      } else {
        // error lain (network blip, dll) - biarkan tetap 'pending' untuk retry
        debugPrint('Sync error (will retry): ${e.message}');
      }
    } catch (e) {
      // error tak terduga - tetap pending, log untuk investigasi
      debugPrint('Unexpected sync error: $e');
    }
  }
}
```

```dart
// local_answers_dao.dart - tambah method baru
Future<void> markFailedSync(String id, {required String reason}) {
  return (update(localAnswers)..where((t) => t.id.equals(id))).write(
    LocalAnswersCompanion(
      syncStatus: const drift.Value('failed_sync'),
      failReason: drift.Value(reason), // tambahkan kolom ini juga jika belum ada
    ),
  );
}
```

> Jika kolom `failReason` belum ada di tabel, tambahkan bersamaan dengan migration `questionVersion` di langkah 5.1 - jangan buat migration terpisah untuk dua kolom yang ditambahkan di phase yang sama.

### Validasi Phase 3
- [ ] Kerjakan soal, edit soal yang sama dari panel Admin Soal **saat siswa masih offline** → reconnect → cek di database Supabase, kolom `question_version` terisi versi lama, dan server (atau log) menandainya sebagai `answered_on_old_version` bukan error.
- [ ] Simulasikan sesi expired (tutup akses dari panel Guru sebelum siswa sync) → pastikan status di Drift berubah ke `failed_sync`, **bukan** stuck retry tanpa henti.
- [ ] Matikan internet di tengah upload (network blip) → pastikan status tetap `pending` dan otomatis di-retry oleh listener Phase 2 saat online lagi.

---

## 6. Phase 4 - Upload Voice Recording ke Supabase Storage

### 6.1 Migration SQL (jalankan manual di Supabase Dashboard / SQL editor)

> ⚠️ **Wajib dijalankan manual** - tidak otomatis sinkron dari migration lokal project.

```sql
-- Bucket baru khusus jawaban siswa (terpisah dari question_media)
insert into storage.buckets (id, name, public)
values ('answers_media', 'answers_media', false)
on conflict (id) do nothing;

-- Policy: siswa (authenticated) boleh INSERT/UPDATE file miliknya sendiri
create policy "students_can_upload_own_recordings"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'answers_media'
);

create policy "students_can_upsert_own_recordings"
on storage.objects for update
to authenticated
using (
  bucket_id = 'answers_media'
);

-- Policy: guru & admin boleh SELECT untuk review
create policy "teachers_admin_can_read_recordings"
on storage.objects for select
to authenticated
using (
  bucket_id = 'answers_media'
  and (
    select role from public.users where id = auth.uid()
  ) in ('teacher', 'school', 'community', 'super_admin')
);
```

> Catatan keamanan: policy insert di atas masih cukup terbuka (semua `authenticated` boleh insert ke bucket ini). Jika butuh isolasi lebih ketat (siswa hanya bisa upload ke folder dengan prefix `student_id`-nya sendiri), tambahkan kondisi `using (storage.foldername(name)[1] = auth.uid()::text)` - didiskusikan dulu apakah path upload akan distrukturkan per siswa.

### 6.2 Implementasi Upload di `sync_service.dart`

```dart
Future<String?> _uploadVoiceFile(LocalAnswer answer) async {
  if (answer.recordingLocalPath == null) return null;

  final file = File(answer.recordingLocalPath!);
  if (!await file.exists()) {
    debugPrint('Recording file missing on device: ${answer.recordingLocalPath}');
    return null;
  }

  final remotePath = '${answer.sessionId}/${answer.questionId}.m4a';

  await supabase.storage.from('answers_media').upload(
    remotePath,
    file,
    fileOptions: const FileOptions(upsert: true), // idempoten untuk retry
  );

  return supabase.storage.from('answers_media').getPublicUrl(remotePath);
  // jika bucket private tanpa public URL, gunakan createSignedUrl() sebagai gantinya
}
```

```dart
// Integrasi ke _uploadSingleAnswer() - dipanggil SEBELUM upsert ke student_answers
Future<void> _uploadSingleAnswer(LocalAnswer answer) async {
  String? mediaUrl;

  if (answer.recordingLocalPath != null) {
    mediaUrl = await _uploadVoiceFile(answer);
  }

  await supabase.from('student_answers').upsert(
    {
      'session_id': answer.sessionId,
      'question_id': answer.questionId,
      'answer_data': answer.answerData,
      'is_correct': answer.isCorrect,
      'question_version': answer.questionVersion,
      'media_url': mediaUrl, // null jika bukan soal voice_recording
    },
    onConflict: 'session_id,question_id',
  );
}
```

> Bucket dideklarasikan `public: false` pada migration di atas - jadi `getPublicUrl()` tidak akan menghasilkan URL yang bisa diakses langsung. Pilih salah satu sesuai kebutuhan:
> - Jika panel guru boleh akses langsung tanpa expiry → ubah bucket jadi `public: true` (lebih sederhana, tapi semua link bisa diakses siapa saja yang punya URL).
> - Jika ingin tetap private → ganti `getPublicUrl()` dengan `createSignedUrl(remotePath, expiresInSeconds)` dan simpan **signed URL akan expired**, sehingga panel web sebaiknya generate signed URL on-demand saat guru membuka halaman review, bukan menyimpan URL statis di `media_url`. *(Keputusan ini perlu disepakati sebelum eksekusi.)*

### Validasi Phase 4
- [ ] Jalankan migration SQL di Supabase Dashboard, konfirmasi bucket `answers_media` muncul di tab Storage.
- [ ] Kerjakan soal `voice_recording` secara offline → reconnect → file `.m4a` muncul di bucket Supabase Storage dengan path `{session_id}/{question_id}.m4a`.
- [ ] Kolom `media_url` di tabel `student_answers` terisi (URL atau signed URL, sesuai keputusan di atas).
- [ ] Putar ulang file dari panel Guru (atau langsung dari Storage Dashboard) → audio bisa diakses dan terdengar jelas.
- [ ] Retry skenario: gagalkan upload di tengah jalan (matikan koneksi saat upload berjalan) → pastikan status tetap `pending`, dan saat retry, `upsert: true` mencegah duplikat/error "file already exists".

---

## 7. Checklist Rilis (Sebelum Merge ke Main Branch)

- [ ] Semua 5 phase (0–4) sudah lolos validasi masing-masing secara berurutan.
- [ ] `dart run build_runner build --delete-conflicting-outputs` dijalankan terakhir kali sebelum commit final.
- [ ] Migration Drift (`schemaVersion` baru) sudah diuji upgrade dari versi lama tanpa kehilangan data lokal (test di device dengan data existing, bukan fresh install).
- [ ] Migration SQL Supabase (bucket `answers_media` + policy) sudah dijalankan di environment staging **dan** production.
- [ ] Tidak ada `print()`/debug log yang tersisa di kode final.
- [ ] Regression check: 5 tipe soal selain `voice_recording` (multiple_choice, image_choice, audio_question, video_question, drag_drop) masih berjalan normal dan tidak terdampak oleh perubahan Phase 0–4.
- [ ] Keputusan terbuka sudah difinalisasi dan dicatat:
  - [ ] Bucket `answers_media`: public atau signed URL?
  - [ ] Struktur path upload per siswa (perlu isolasi folder per `student_id` atau tidak)?

---

*Dokumen ini disusun sebagai kelanjutan dari Audit Report & Implementation Plan (Antigravity/Gemini) dan Blueprint Sistem Pemantik v2.0 - fokus penyempurnaan eksklusif pada `apps/mobile/pemantik_mobile`.*