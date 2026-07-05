import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import type { NavSection } from "@/components/layout/Sidebar";

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
      { label: "Guru", href: "/komunitas/guru", icon: "teacher" },
      { label: "Siswa", href: "/komunitas/siswa", icon: "student" },
      { label: "Akses Ujian", href: "/komunitas/akses-ujian", icon: "exam" },
    ],
  },
  {
    label: "Hasil Ujian",
    items: [
      { label: "Hasil Ujian", href: "/komunitas/laporan", icon: "report" },
    ],
  },
];

export default function KomunitasLayout({ children }: { children: React.ReactNode }) {
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
