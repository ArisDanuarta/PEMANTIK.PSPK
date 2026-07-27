import AppLayout from "@/components/layout/AppLayout";
import { createServerClient } from "@pemantik/supabase";
import type { NavSection } from "@/components/layout/Sidebar";

const adminSoalNav: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin-soal/dashboard", icon: "dashboard" },
    ],
  },
  {
    label: "Konten Soal",
    items: [
      { label: "Daftar Soal", href: "/admin-soal/soal", icon: "question" },
      { label: "Input Soal Baru", href: "/admin-soal/soal/new", icon: "class" },
      { label: "Preview Soal", href: "/admin-soal/preview", icon: "review" },
    ],
  },
  {
    label: "Sistem",
    items: [
      { label: "Pengaturan Kategori & Level", href: "/admin-soal/pengaturan", icon: "settings" },
    ],
  },
];

export default async function AdminSoalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  let userName = "Admin Soal";

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
      role="question_admin"
      roleName="Admin Soal"
      roleChipClass="question-admin"
      roleLabel="Admin Soal"
      userName={userName}
      sections={adminSoalNav}
    >
      {children}
    </AppLayout>
  );
}
