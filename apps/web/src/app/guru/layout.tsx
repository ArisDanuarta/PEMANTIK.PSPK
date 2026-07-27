import AppLayout from "@/components/layout/AppLayout";
import { createServerClient } from "@pemantik/supabase";
import type { NavSection } from "@/components/layout/Sidebar";
import { headers } from "next/headers";

const guruNav: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/guru/dashboard", icon: "dashboard" },
    ],
  },
  {
    label: "Manajemen Data",
    items: [
      { label: "Manajemen Kelas", href: "/guru/kelas", icon: "school" },
      { label: "Manajemen Anak", href: "/guru/siswa", icon: "users" },
    ],
  },
  {
    label: "Penilaian",
    items: [
      { label: "Intervensi", href: "/guru/intervensi", icon: "intervention" },
    ],
  },
];

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");

  let userName = "Guru";

  if (userId) {
    const supabase = createServerClient();
    const { data: userRecord } = await (supabase as any)
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    if (userRecord?.full_name) {
      userName = userRecord.full_name;
    }
  }

  return (
    <AppLayout
      role="teacher"
      roleName="Guru"
      roleChipClass="teacher"
      roleLabel="Guru"
      userName={userName}
      sections={guruNav}
    >
      {children}
    </AppLayout>
  );
}
