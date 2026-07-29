import AppLayout from "@/components/layout/AppLayout";
import { createServerClient } from "@pemantik/supabase";
import type { NavSection } from "@/components/layout/Sidebar";

const superAdminNav: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/super-admin/dashboard", icon: "dashboard" },
    ],
  },
  {
    label: "Manajemen Akun",
    items: [
      { label: "Komunitas", href: "/super-admin/komunitas", icon: "users" },
      { label: "Sekolah", href: "/super-admin/sekolah", icon: "school" },
      { label: "Admin Soal", href: "/super-admin/admin-soal", icon: "class" },
    ],
  },
  {
    // Rekap Global = baca & export saja. Tombol create dipindah ke detail sekolah.
    label: "Rekap Global",
    items: [
      { label: "Semua Guru", href: "/super-admin/guru", icon: "teacher" },
      { label: "Semua Anak", href: "/super-admin/siswa", icon: "student" },
      { label: "Bank Soal", href: "/super-admin/soal", icon: "question" },
    ],
  },
  {
    label: "Manajemen Ujian",
    items: [
      { label: "Persetujuan Fase", href: "/super-admin/persetujuan", icon: "review" },
      { label: "Sesi Ujian Anak", href: "/super-admin/sesi-siswa", icon: "class" },
    ],
  },
  {
    label: "Laporan & Sistem",
    items: [
      { label: "Intervensi & Graph", href: "/super-admin/intervensi", icon: "activity" },
      { label: "Hasil Ujian", href: "/super-admin/laporan", icon: "activity" },
      { label: "Sebaran SES", href: "/super-admin/sebaran-ses", icon: "activity" },
      { label: "Log Sistem & Error", href: "/super-admin/log-sistem", icon: "activity" },
      { label: "Pengaturan SES", href: "/super-admin/pengaturan-ses", icon: "settings" },
      { label: "Pengaturan Platform", href: "/super-admin/pengaturan", icon: "settings" },
      { label: "Rilis Aplikasi", href: "/super-admin/pengaturan/rilis", icon: "smartphone" },
    ],
  },
];

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  let userName = "Super Admin";

  if (session?.user?.id) {
    const { data: userRecord } = await (supabase as any)
      .from("users")
      .select("full_name")
      .eq("id", session.user.id)
      .maybeSingle();
    if (userRecord?.full_name) {
      userName = userRecord.full_name;
    }
  }

  return (
    <AppLayout
      role="super_admin"
      roleName="Super Admin"
      roleChipClass="super-admin"
      roleLabel="Super Admin"
      userName={userName}
      sections={superAdminNav}
    >
      {children}
    </AppLayout>
  );
}
