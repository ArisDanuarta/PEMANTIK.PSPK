import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import type { NavSection } from "@/components/layout/Sidebar";
import { headers } from "next/headers";
import { createServerClient } from "@pemantik/supabase";

export default async function SekolahLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  let isIndependent = false;
  if (schoolId) {
    try {
      const supabase = createServerClient();
      const { data: school } = await (supabase as any)
        .from("schools")
        .select("community_id")
        .eq("id", schoolId)
        .maybeSingle();
      
      // Jika community_id null atau kosong, berarti sekolah independen (tanpa induk)
      isIndependent = !school?.community_id;
    } catch (e) {
      console.error("Gagal memuat status komunitas sekolah di layout:", e);
    }
  }

  const manajemenItems = [
    // Menu Upload Data Dapodik HANYA muncul jika sekolah TIDAK memiliki induk (Independen)
    ...(isIndependent ? [{ label: "Upload Data Dapodik", href: "/sekolah/dapodik", icon: "upload" }] : []),
    { label: "Guru", href: "/sekolah/guru", icon: "users" },
    { label: "Siswa", href: "/sekolah/siswa", icon: "class" },
    { label: "Kelas", href: "/sekolah/kelas", icon: "school" },
    { label: "Akses Ujian", href: "/sekolah/akses-ujian", icon: "exam" },
  ];

  const sekolahNav: NavSection[] = [
    {
      items: [
        { label: "Dashboard", href: "/sekolah/dashboard", icon: "dashboard" },
      ],
    },
    {
      label: "Manajemen",
      items: manajemenItems,
    },
    {
      label: "Ujian",
      items: [
        { label: "Hasil Ujian", href: "/sekolah/laporan", icon: "report" },
      ],
    },
    {
      label: "Intervensi",
      items: [
        { label: "Intervensi", href: "/sekolah/intervensi", icon: "activity" },
      ],
    },
  ];

  return (
    <AppLayout
      role="school"
      roleName="Sekolah"
      roleChipClass="school"
      roleLabel="Sekolah"
      sections={sekolahNav}
    >
      {children}
    </AppLayout>
  );
}
