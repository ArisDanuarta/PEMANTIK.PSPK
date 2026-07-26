# AUDIT MENDALAM: FITUR INTERVENSI & KNOWLEDGE GRAPH
Tanggal Audit: 25 Juli 2026

Dokumen ini merupakan laporan audit mendalam mengenai fitur **Intervensi** dan visualisasi **Knowledge Graph**, menelusuri alur data dari skema database, backend (Server Actions), hingga implementasi UI (React Flow & D3-Force) untuk setiap *Role*.

---

## 1. Arsitektur Database (Skema Supabase)

Fitur intervensi dikelola oleh tiga entitas tabel utama:
1. **`interventions` (Tabel Utama)**
   - Menyimpan payload narasi intervensi. Memiliki kolom wajib: `kondisi_awal`, `upaya_dilakukan`, `perubahan_signifikan`, dan `alasan_bermakna`.
   - Terikat dengan `school_id`, `community_id` (opsional), dan `stage_id`.
   - Terdapat penanda `submitted_by` (untuk melacak *role* submitter) dan keterangan `phase`.
2. **`intervention_tags` (Tabel Master Tag)**
   - Menyimpan *keywords* atau kategori (*tags*) untuk intervensi. Kolom `name` bersifat unik (*UNIQUE constraint*) agar tidak terjadi duplikasi *hashtag*.
3. **`intervention_tag_links` (Tabel Junction M:N)**
   - Menghubungkan 1 intervensi ke banyak tag, sehingga intervensi dari sekolah berbeda yang memiliki *tag* sama dapat terhubung dalam sebuah Knowledge Graph.

---

## 2. Alur Backend & Server Actions (`interventions.ts`)

Seluruh operasi bisnis dikelola secara terpusat di `apps/web/src/app/actions/interventions.ts`. 

### A. Alur Submit Intervensi (`submitInterventionAction`)
Fungsi ini bersifat transaksional dan adaptif terhadap *role*:
1. **Validasi Role & Akses**: Komunitas hanya bisa submit untuk sekolah binaannya. Sekolah/Guru hanya bisa submit untuk sekolahnya sendiri.
2. **Auto-Tagging (Create-or-Get)**: Jika user menginput *tag* baru, sistem memanggil `createOrGetTagAction`. Fungsi ini mencoba melakukan `INSERT`. Jika terjadi error *Unique Violation* (`23505`), fungsi akan melakukan `SELECT` untuk mengambil ID dari *tag* lama, sehingga menjaga data tetap normal.
3. **Auto-Completion Stage**: Setelah intervensi berhasil disimpan, sistem mengecek total submission di *stage* tersebut:
   - **Sekolah Mandiri (Independen)**: Cukup 1 submission (dari pihak Sekolah/Guru) untuk mengubah stage menjadi `selesai`.
   - **Sekolah Binaan**: Membutuhkan minimal 2 submission (1 dari pihak Komunitas DAN 1 dari pihak Sekolah/Guru) agar stage otomatis berubah menjadi `selesai`.

### B. Graph Data Builders
Terdapat tiga varian *Data Fetcher* untuk Graph:
1. `getGlobalInterventionGraph`: Menarik **seluruh data** (digunakan oleh Superadmin).
2. `getInterventionGraph`: Difilter berdasarkan `community_id` (digunakan oleh Komunitas).
3. `getSchoolInterventionGraph`: Difilter berdasarkan `school_id` tanpa node Komunitas (digunakan oleh Sekolah & Guru).

---

## 3. Fitur UI & Visualisasi (Frontend)

### A. Form Intervensi (`InterventionForm.tsx`)
Merupakan *Reusable Component* yang diimpor ke dalam halaman masing-masing role:
- `IntervensiKomunitasClient.tsx`
- `IntervensiSekolahClient.tsx`
- `IntervensiGuruClient.tsx`

Form ini mewajibkan pengguna mengisi 4 pertanyaan refleksi secara mendalam. Terdapat fitur input dinamis untuk *tags* (Topik Intervensi) yang divalidasi ke backend.

### B. Visualisasi Knowledge Graph (`InterventionGraph.tsx`)
Visualisasi *Knowledge Graph* merupakan elemen paling interaktif dalam fitur ini, yang dibangun dengan perpaduan pustaka **React Flow** (`@xyflow/react`) dan **D3-Force** (`d3-force`).

#### Hierarki Node (Alur Chart):
1. 🏛️ **Komunitas** (*Top-Level Root*) - Pusat bagi sekolah binaan.
2. 🏫 **Sekolah** (*Child Node*) - Terhubung langsung ke Komunitas. Untuk sekolah independen, ini menjadi node root-nya sendiri.
3. 📋 **Laporan Intervensi** - Laporan terhubung langsung ke node Sekolah. **Namun**, jika laporan disubmit oleh pihak Komunitas, sistem akan secara cerdas menarik garis (*edge*) langsung dari node Komunitas ke node Intervensi.
4. #️⃣ **Tag Topik** (*Leaf Node*) - Terhubung ke node Intervensi. Jika beberapa sekolah memiliki masalah yang sama (tag yang sama, contoh: "#literasi"), node tag ini akan menyatukan cabang-cabang intervensi tersebut menjadi sebuah *cluster*.

#### Cara Kerja Visualisasi (UI/UX):
- **Gaya Gravitasi (D3-Force)**: Node tidak di-render kaku secara statis, melainkan menggunakan `forceManyBody` (saling tolak) dan `forceLink` (gravitasi tarikan sesuai relasi edge). Hal ini membentuk peta intervensi yang menyebar secara organik.
- **Inspector Panel (Panel Kanan)**: Apabila pengguna meng-klik salah satu node 📋 (Intervensi), sebuah sidebar melayang akan terbuka dari kanan, memperlihatkan rincian penuh teks narasi (Kondisi Awal, Upaya, Dampak, dan Alasan).
- **Global Filter & Search**: Mendukung filter *highlight* untuk mencari pola intervensi khusus.

---

## 4. Evaluasi & Temuan Potensi Isu

Meskipun fitur ini dikembangkan dengan arsitektur canggih dan organik, ada dua temuan yang berpotensi menimbulkan masalah (perlu penanganan lebih lanjut):

1. ⚠️ **Batas Karakter Form Intervensi**: `InterventionForm.tsx` tidak menerapkan batasan jumlah kata/karakter (seperti *maxLength*) pada keempat input narasi. User berpotensi meng-copy-paste seluruh artikel yang menyebabkan payload *bloated* dan rendering graph melambat saat memuat string JSON dalam ukuran raksasa.
2. ⚠️ **Graph Rendering Bottleneck (Superadmin)**: Metode `getGlobalInterventionGraph` me-return 100% dari seluruh laporan secara *eager*. Saat ekosistem aplikasi ini membesar dan memiliki ribuan sekolah serta ratusan ribu *tags*, Superadmin *Dashboard* berisiko mengalami *freeze browser/Out of Memory* akibat D3-Force yang harus mengalkulasi benturan partikel (collision) dari puluhan ribu titik *node* secara *realtime* di pihak klien (React Flow).
