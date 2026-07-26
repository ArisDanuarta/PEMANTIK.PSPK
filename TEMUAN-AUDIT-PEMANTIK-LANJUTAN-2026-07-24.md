# AUDIT LANJUTAN MONOREPO PEMANTIK — PRA UJI COBA LAPANGAN
**Tanggal Audit:** 24 Juli 2026
**Auditor:** Agent (Antigravity)

Laporan ini merupakan kelanjutan (investigasi mendalam) dari Audit v2 untuk memastikan kesiapan sistem sebelum dibawa ke sesi uji coba lapangan nyata.

---

### A. Fitur Hilang / Belum Terimplementasi (Missing)

- **[Mobile/Guru] P2P Sync (Jalur A) via Nearby Connections**
  Referensi spec: "Keamanan P2P Sync (Nearby Connections)"
  File yang diperiksa: `apps/mobile/pemantik_mobile/pubspec.yaml`, codebase mobile
  Kesimpulan: **Benar-benar tidak ada.** Dependensi `nearby_connections` atau pustaka sejenis belum diinisialisasi dalam `pubspec.yaml`, dan modul komunikasi offline lokal antar-perangkat belum dibangun.

- **[Web/Super Admin] Validasi Ekspor Dapodik dengan Data Asli**
  Referensi spec: "Struktur baris export Dapodik"
  File yang diperiksa: `/apps/web/src/lib/parseDapodik.ts`, struktur test.
  Kesimpulan: **TIDAK DAPAT DIVERIFIKASI / Tidak Lengkap.** File sampel atau mock data asli Dapodik untuk testing tidak ditemukan di repositori (tidak ada suite `test` pada web). Parser Dapodik saat ini berisiko pecah di lapangan karena rentan gagal membaca variasi format kolom asli dari `.xlsx`.

- **[Mobile] Flutter Test Coverage**
  Referensi spec: "Flutter test coverage"
  File yang diperiksa: `/apps/mobile/pemantik_mobile/test/`
  Kesimpulan: **Benar-benar tidak ada.** Hanya ada 1 file *placeholder* bawaan (`widget_test.dart`), tidak ada satu pun pengujian terotomatisasi untuk modul aplikasi.

---

### B. Bug

- **[Severity: High] [Web/API] Multi-guru per Kelas Rusak akibat *Legacy Query***
  File: `apps/web/src/app/actions/teachers.ts` dan `apps/web/src/app/api/export/detailed-results/route.ts`
  Reproduksi/kondisi pemicu: Saat melakukan rekap/ekspor laporan, sistem menggunakan *filter* langsung `eq("teacher_id", userId)` ke tabel `classes`. Demikian juga pada *action* assign wali kelas.
  Dampak: Mengabaikan arsitektur *junction table* `class_teachers`. Guru kedua yang mengajar di kelas yang sama tidak akan mendeteksi kelasnya saat ekspor. *Action* UI juga secara tak konsisten merusak relasi dengan mencoba menimpa satu kolom lama `teacher_id`.

- **[Severity: Medium] [Web] Sampah Cache Dapodik (Storage Bloat)**
  File: `supabase/migrations/20260707000001_dapodik_import.sql` & `actions/schools.ts`
  Reproduksi/kondisi pemicu: Pengguna mengunggah Dapodik, melihat layar *preview* (data tersimpan di tabel `dapodik_parse_cache`), lalu membatalkan pendaftaran.
  Dampak: Nilai `expires_at` (TTL 30 menit) hanya bersifat dokumentasi belaka. Kenyataannya, tidak ada *cron job* aktual di *database* (`pg_cron`) maupun pembersihan di lapisan API yang otomatis menghapus baris usang. Beban *storage* akan membengkak dari waktu ke waktu akibat beban *file* JSON mentah.

---

### C. Kurang Optimal (Refactor Candidate)

- **[Security/Auth] Risiko Gabungan: PIN `123456` Tanpa Proteksi *Brute-force***
  File: `docs/Dokumentasi_Analisis_Lengkap_Role_Guru.md` & `authenticate-student/index.ts`
  Kondisi saat ini vs seharusnya: Dokumentasi menetapkan `123456` sebagai standar PIN anak. Sayangnya, karena Edge Function sama sekali tidak membatasi jumlah percobaan tebakan PIN yang gagal (Audit v2 temuan 2.2), *default* seragam ini menjadi celah peretasan massal akun anak jika digabung.
  Dampak jika dibiarkan: Penyerang bisa mengambil alih seluruh progres dan asesmen anak secara remote. Disarankan meminta pergantian PIN otomatis.

- **[Web] Variabel Lokal `media_url` Menghambat Ekspansi Media Ganda**
  File: `apps/web/src/app/admin-soal/preview/PreviewPageClient.tsx`
  Kondisi saat ini vs seharusnya: Walaupun *schema* database sukses dipecah (`question_image_url`, `question_video_url`), state frontend masih membungkus pengelolaan input URL pada satu variabel lokal `mediaUrl`.
  Dampak jika dibiarkan: Jika nantinya satu soal membutuhkan gabungan dari audio + gambar sekaligus, state manajemen React saat ini tidak bisa memfasilitasinya secara simultan.

---

### D. Memory Leak / Performance

- **[Mobile] Race Condition Sinkronisasi Dashboard** *(Dikonfirmasi ulang dari Audit v2)*
  File: `apps/mobile/pemantik_mobile/lib/features/dashboard/providers/dashboard_provider.dart`
  Penyebab: `syncCategoriesAndQuestions` tidak dibatasi state *flag* atau *mutual exclusion* `isSyncing`. Me-*refresh* UI beberapa kali akan menembakkan permintaan asinkron ganda.
  Cara verifikasi: Lihat panel `network_inspector` (atau server log), akan muncul banyak HTTP/RPC duplikat jika tab cepat berpindah-pindah sebelum proses `Future.then` rampung.

---

### Status 7 Isu Diketahui

1. Tabel `profiles`: **Sisa** (Tinggal di `cron-auto-transition`, lainnya bersih).
2. PIN default `123456`: **Ada/Risiko** (Merupakan keputusan final, butuh layer *rate limiting* segera).
3. Struktur baris Dapodik: **Masih ada / Berisiko** (Tidak ada bukti pengetesan file *spreadsheet* sesungguhnya).
4. JWT siswa: **Tuntas** (Token memiliki *signature* yang otomatis diverifikasi PostgREST).
5. `class_teachers` (multi-guru): **Masih ada / Kritis** (Banyak API *export* & modifikasi yang kembali menggunakan *legacy pattern* tabel `classes.teacher_id`).
6. `media_url`: **Tuntas sebagian** (Berada dalam ranah penamaan lokal State UI).
7. Test coverage Flutter: **Masih ada** (Tidak terimplementasi).

---

### Kesimpulan Kesiapan Uji Coba Lapangan: **NO-GO**

Berbekal dua penemuan fatal yaitu absennya keseluruhan infrastruktur Jalur A (Sinkronisasi Offline Guru - P2P/Nearby Connections) yang mana merupakan pilar nilai produk, serta kacaunya tarikan data agregat laporan guru gara-gara API yang tidak mengenali multi-wali kelas; aplikasi **TIDAK SIAP** dibawa ke simulasi sekolah nyata. Merilis aplikasi saat ini ke lapangan hanya akan mengakibatkan hilangnya progres belajar akibat data *sync* yang putus, disusul kebingungan manajemen sekolah karena data hasil di dashboard salah hitung.

### 5 Prioritas Tertinggi Sebelum Uji Coba:
1. **Rombak Logika Laporan Guru:** Tulis ulang kueri `.eq("teacher_id")` di *API Export* menggunakan INNER JOIN yang benar terhadap tabel _junction_ `class_teachers`.
2. **Implementasi Nearby Connections (P2P):** Kerjakan modul *Flutter P2P Relay* Jalur A. Tanpa ini, anak-anak tanpa gawai berkuota internet tidak dapat mengumpulkan hasil asesmen.
3. **Sampah Penyimpanan Cache Dapodik:** Tulis deklarasi *Job Cron Database* untuk membersihkan tabel `dapodik_parse_cache`.
4. **Keamanan Login Anak:** Terapkan setidaknya pembatasan login (mis. maksimal 5 kegagalan/jam) atau pemaksaan *reset* sandi saat login perdana.
5. **Validasi Template Dapodik Asli:** Susun *test suite* nyata yang mencoba mencerna sampel `.xlsx` valid Dapodik milik sekolah riil untuk mencegah kejatuhan operasional massal di awal hari.
