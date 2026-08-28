import AppLayout from "@/components/layout/AppLayout";
import { createServerClient } from "@pemantik/supabase";
import type { NavSection } from "@/components/layout/Sidebar";

const penelitiNav: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/peneliti/dashboard", icon: "dashboard" },
    ],
  },
  {
    label: "Analisis Asesmen",
    items: [
      { label: "Analisis Komparatif", href: "/peneliti/analisis", icon: "activity" },
      { label: "Analisis Soal & Level", href: "/peneliti/soal", icon: "question" },
      { label: "Analisis SES & Sosial", href: "/peneliti/ses", icon: "users" },
    ],
  },
  {
    label: "Dampak & Evaluasi",
    items: [
      { label: "Pola Intervensi", href: "/peneliti/intervensi", icon: "review" },
    ],
  },
  {
    label: "Laporan & Data",
    items: [
      { label: "Export & Ringkasan", href: "/peneliti/laporan", icon: "report" },
    ],
  },
];

export default async function PenelitiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  let userName = "Peneliti Nasional";

  if (session?.user?.id) {
    const { data: userRecord } = await (supabase as any)
      .from("users")
      .select("full_name, username")
      .eq("id", session.user.id)
      .maybeSingle();
    if (userRecord) {
      userName = userRecord.full_name || userRecord.username || "Peneliti Nasional";
    }
  }

  return (
    <AppLayout
      role="peneliti"
      roleName="Peneliti"
      roleChipClass="super-admin"
      roleLabel="Peneliti Nasional"
      userName={userName}
      sections={penelitiNav}
    >
      {children}
    </AppLayout>
  );
}
