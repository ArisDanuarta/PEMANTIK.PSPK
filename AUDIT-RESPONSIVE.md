# Audit Responsivitas Pemantik (Next.js Web)

## 1. Pemetaan Halaman per Role

### Role: Super Admin
| Role | Path route | File | Ada sidebar? | Layout breakpoint saat ini (px) | Masalah responsif (Temuan Awal) | Prioritas | Status |
|---|---|---|---|---|---|---|---|
| Super Admin | `/super-admin/dashboard` | `page.tsx` | Ya | `1024px`, `768px`, `480px` (CSS Custom) | Grid/Card sering overflow di mobile | Tinggi | Belum |
| Super Admin | `/super-admin/guru` | `page.tsx` | Ya | CSS Custom | Tabel berpotensi overflow-x | Tinggi | Belum |
| Super Admin | `/super-admin/siswa` | `page.tsx` | Ya | CSS Custom | Tabel berpotensi overflow-x | Tinggi | Belum |
| Super Admin | `/super-admin/sekolah` | `page.tsx` | Ya | CSS Custom | Tabel berpotensi overflow-x | Tinggi | Belum |
| Super Admin | `/super-admin/sekolah/[id]` | `page.tsx` | Ya | CSS Custom | Layout split/detail meluber di tablet | Sedang | Belum |
| Super Admin | `/super-admin/komunitas` | `page.tsx` | Ya | CSS Custom | Tabel berpotensi overflow-x | Sedang | Belum |
| Super Admin | `/super-admin/admin-soal` | `page.tsx` | Ya | CSS Custom | Tabel berpotensi overflow-x | Sedang | Belum |
| Super Admin | `/super-admin/soal` | `page.tsx` | Ya | CSS Custom | Tabel berpotensi overflow-x | Tinggi | Belum |
| Super Admin | `/super-admin/soal/new` | `page.tsx` | Ya | CSS Custom | Form kompleks, flex-wrap mungkin kurang | Tinggi | Belum |
| Super Admin | `/super-admin/soal/[id]/edit`| `page.tsx` | Ya | CSS Custom | Form kompleks, layout split-col kurang optimal di mobile | Tinggi | Belum |
| Super Admin | `/super-admin/soal/[id]` | `page.tsx` | Ya | CSS Custom | Detail soal mungkin meluber | Sedang | Belum |
| Super Admin | `/super-admin/sesi-siswa` | `page.tsx` | Ya | CSS Custom | Tabel berpotensi overflow-x | Sedang | Belum |
| Super Admin | `/super-admin/persetujuan` | `page.tsx` | Ya | CSS Custom | Form persetujuan layout | Sedang | Belum |
| Super Admin | `/super-admin/intervensi` | `page.tsx` | Ya | CSS Custom | Chart/Graph tidak resize dengan baik di layar kecil | Tinggi | Belum |
| Super Admin | `/super-admin/laporan` | `page.tsx` | Ya | CSS Custom | Tabel kompleks & filter bar overflow | Tinggi | Belum |
| Super Admin | `/super-admin/sebaran-ses` | `page.tsx` | Ya | CSS Custom | Chart/Graph responsif issue | Sedang | Belum |
| Super Admin | `/super-admin/log-sistem` | `page.tsx` | Ya | CSS Custom | Long text & table meluber | Rendah | Belum |
| Super Admin | `/super-admin/pengaturan` | `page.tsx` | Ya | CSS Custom | Form setting kurang padding di mobile | Rendah | Belum |
| Super Admin | `/super-admin/pengaturan-ses`| `page.tsx` | Ya | CSS Custom | Form setting | Rendah | Belum |
| Super Admin | `/super-admin/akses-ujian` | `page.tsx` | Ya | CSS Custom | Tabel manajemen akses meluber | Sedang | Belum |

### Role: Admin Soal
| Role | Path route | File | Ada sidebar? | Layout breakpoint saat ini (px) | Masalah responsif (Temuan Awal) | Prioritas | Status |
|---|---|---|---|---|---|---|---|
| Admin Soal | `/admin-soal/dashboard` | `page.tsx` | Ya | CSS Custom | Grid Card responsif | Tinggi | Belum |
| Admin Soal | `/admin-soal/soal` | `page.tsx` | Ya | CSS Custom | Tabel berpotensi overflow-x | Tinggi | Belum |
| Admin Soal | `/admin-soal/soal/new` | `page.tsx` | Ya | CSS Custom | Form + split preview sidebar | Tinggi | Belum |
| Admin Soal | `/admin-soal/soal/[id]/edit` | `page.tsx` | Ya | CSS Custom | Form + split preview sidebar | Tinggi | Belum |
| Admin Soal | `/admin-soal/soal/[id]` | `page.tsx` | Ya | CSS Custom | Detail view | Sedang | Belum |
| Admin Soal | `/admin-soal/preview` | `page.tsx` | Ya | CSS Custom | Render preview meluber | Tinggi | Belum |
| Admin Soal | `/admin-soal/pengaturan` | `page.tsx` | Ya | CSS Custom | Form | Rendah | Belum |

### Role: Komunitas
| Role | Path route | File | Ada sidebar? | Layout breakpoint saat ini (px) | Masalah responsif (Temuan Awal) | Prioritas | Status |
|---|---|---|---|---|---|---|---|
| Komunitas | `/komunitas/dashboard` | `page.tsx` | Ya | CSS Custom | Grid stats responsif | Tinggi | Belum |
| Komunitas | `/komunitas/sekolah` | `page.tsx` | Ya | CSS Custom | Tabel sekolah | Tinggi | Belum |
| Komunitas | `/komunitas/sekolah/[id]` | `page.tsx` | Ya | CSS Custom | Detail page overflow | Sedang | Belum |
| Komunitas | `/komunitas/guru` | `page.tsx` | Ya | CSS Custom | Tabel guru | Tinggi | Belum |
| Komunitas | `/komunitas/siswa` | `page.tsx` | Ya | CSS Custom | Tabel anak/siswa | Tinggi | Belum |
| Komunitas | `/komunitas/intervensi` | `page.tsx` | Ya | CSS Custom | Tabel intervensi | Tinggi | Belum |
| Komunitas | `/komunitas/intervensi/graph` | `page.tsx` | Ya | CSS Custom | Graph overflow pada mobile/tablet | Tinggi | Belum |
| Komunitas | `/komunitas/laporan` | `page.tsx` | Ya | CSS Custom | Tabel hasil laporan | Tinggi | Belum |
| Komunitas | `/komunitas/dapodik` | `page.tsx` | Ya | CSS Custom | Sinkronisasi page log | Sedang | Belum |
| Komunitas | `/komunitas/akses-ujian` | `page.tsx` | Ya | CSS Custom | Tabel manajemen | Sedang | Belum |

### Role: Sekolah
| Role | Path route | File | Ada sidebar? | Layout breakpoint saat ini (px) | Masalah responsif (Temuan Awal) | Prioritas | Status |
|---|---|---|---|---|---|---|---|
| Sekolah | `/sekolah/dashboard` | `page.tsx` | Ya | CSS Custom | Grid stats | Tinggi | Belum |
| Sekolah | `/sekolah/kelas` | `page.tsx` | Ya | CSS Custom | Tabel kelas / grid | Tinggi | Belum |
| Sekolah | `/sekolah/guru` | `page.tsx` | Ya | CSS Custom | Tabel guru | Tinggi | Belum |
| Sekolah | `/sekolah/siswa` | `page.tsx` | Ya | CSS Custom | Tabel siswa | Tinggi | Belum |
| Sekolah | `/sekolah/intervensi` | `page.tsx` | Ya | CSS Custom | Tabel intervensi & tracking | Tinggi | Belum |
| Sekolah | `/sekolah/laporan` | `page.tsx` | Ya | CSS Custom | Laporan hasil ujian | Tinggi | Belum |
| Sekolah | `/sekolah/dapodik` | `page.tsx` | Ya | CSS Custom | Log sinkronisasi | Sedang | Belum |
| Sekolah | `/sekolah/akses-ujian` | `page.tsx` | Ya | CSS Custom | Form & table manajemen ujian | Sedang | Belum |

### Role: Guru
| Role | Path route | File | Ada sidebar? | Layout breakpoint saat ini (px) | Masalah responsif (Temuan Awal) | Prioritas | Status |
|---|---|---|---|---|---|---|---|
| Guru | `/guru/dashboard` | `page.tsx` | Ya | CSS Custom | Dashboard overview | Tinggi | Belum |
| Guru | `/guru/kelas` | `page.tsx` | Ya | CSS Custom | Detail/List kelas | Tinggi | Belum |
| Guru | `/guru/siswa` | `page.tsx` | Ya | CSS Custom | Tabel daftar siswa | Tinggi | Belum |
| Guru | `/guru/siswa/riwayat` | `page.tsx` | Ya | CSS Custom | Timeline/History ujian siswa meluber | Sedang | Belum |
| Guru | `/guru/intervensi` | `page.tsx` | Ya | CSS Custom | Form & daftar intervensi | Tinggi | Belum |

---

## 2. Temuan Komponen Shared / Layout

1. **Sidebar (`src/components/layout/Sidebar.tsx`) & AppLayout (`src/components/layout/AppLayout.tsx`)**
   - **State Collapse/Expand**: Belum ada untuk desktop. Di desktop sidebar selebar `260px` fix.
   - **Default State**: Di desktop selalu terbuka penuh (push content). Di mobile (`< 768px`), sidebar default tertutup (`sidebarOpen = false`), dan terbuka sebagai overlay / off-canvas drawer dengan backdrop blur jika hamburger ditekan.
   - **Shared/Per-role**: 1 komponen `AppLayout` + `Sidebar` digunakan (shared) untuk semua role. Setiap role mempassing `sections` dan `roleLabel` dari file layout masing-masing. Ini sangat baik secara arsitektur (satu sumber kebenaran).
   - **Breakpoints Sidebar**: Di-handle via custom CSS di `globals.css` (media query `max-width: 768px`).

2. **Table / DataGrid**
   - Menggunakan table HTML standar dengan wrapper `.table-wrapper`.
   - Di breakpoint `< 768px`, wrapper mendapat `overflow-x: auto;` sehingga bisa discroll horizontal, tapi masih bisa lebih nyaman jika di-refactor menggunakan pola stack atau cards untuk layar sempit (small mobile). Terdapat class `.col-hide-mobile` namun penerapannya mungkin belum konsisten.

3. **Form / Split Layout (Soal)**
   - Tersedia `.layout-content--split` di `globals.css` yang akan menjadi stack vertikal di `< 1024px`. Ini pendekatan responsif yang bagus tapi perlu diverifikasi apakah ada masalah scroll di dalamnya.

4. **Breakpoints Standar yang Saat Ini Dipakai (Berdasarkan `globals.css`)**
   - Proyek menggunakan campuran Tailwind CSS (lewat `@import "tailwindcss";`) dengan custom native media queries di `globals.css`:
     - `<= 1024px` (Tablet)
     - `<= 768px` (Mobile)
     - `<= 480px` (Small Mobile)
   - Pendekatan custom media query ini berpotensi membingungkan jika developer lain menggunakan Tailwind prefix (seperti `md:`, `lg:`) di komponen.

---

## Kesimpulan Audit (Fase 1)
- Terdapat 45+ halaman dengan sidebar di 5 role (Super Admin, Admin Soal, Komunitas, Sekolah, Guru).
- Arsitektur layout sudah terpusat di `AppLayout` dan `Sidebar`, tidak copy-paste tiap role, memudahkan refactoring.
- Fitur collapse sidebar (menjadi sekadar ikon di sisi kiri) untuk desktop **BELUM ADA**, baru ada fitur show/hide di mobile.
- Banyak halaman membutuhkan audit mendalam (terutama pada grid, chart, dan complex tables) setelah sidebar collapsible diterapkan.
