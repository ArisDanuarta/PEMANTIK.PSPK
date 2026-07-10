import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import type { NavSection } from "@/components/layout/Sidebar";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function KomunitasLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient();
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  let hasReachedIntervention = false;

  if (communityId) {
    // Cek apakah ada sekolah binaan yang sudah berada di tahap intervensi / selesai
    const { data: stages } = await (supabase as any)
      .from("school_assessment_stages")
      .select("id, current_stage")
      .eq("community_id", communityId)
      .in("current_stage", ["intervensi", "selesai"])
      .limit(1);

    if (stages && stages.length > 0) {
      hasReachedIntervention = true;
    } else {
      // Cek juga apakah komunitas sudah punya riwayat intervensi
      const { data: intervs } = await (supabase as any)
        .from("interventions")
        .select("id")
        .eq("community_id", communityId)
        .limit(1);
      if (intervs && intervs.length > 0) {
        hasReachedIntervention = true;
      }
    }
  }

  const komunitasNav: NavSection[] = [
    {
      items: [
        { label: "Dashboard", href: "/komunitas/dashboard", icon: "dashboard" },
      ],
    },
    {
      label: "Manajemen",
      items: [
        { label: "Sekolah", href: "/komunitas/sekolah", icon: "school" },
        { label: "Upload Dapodik", href: "/komunitas/dapodik", icon: "dapodik" },
        { label: "Akses Ujian", href: "/komunitas/akses-ujian", icon: "exam" },
      ],
    },
    {
      label: "Ujian",
      items: [
        { label: "Hasil Ujian", href: "/komunitas/laporan", icon: "report" },
      ],
    },
    {
      label: "Intervensi",
      items: [
        {
          label: hasReachedIntervention ? "Form & Laporan Intervensi" : "Intervensi",
          href: "/komunitas/intervensi",
          icon: "activity",
        },
      ],
    },
  ];

  return (
    <AppLayout
      role="community"
      roleName="Komunitas"
      roleChipClass="community"
      roleLabel="Komunitas"
      sections={komunitasNav}
    >
      {children}
    </AppLayout>
  );
}
