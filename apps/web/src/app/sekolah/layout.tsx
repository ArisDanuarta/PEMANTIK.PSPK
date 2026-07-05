import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import type { NavSection } from "@/components/layout/Sidebar";

const sekolahNav: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/sekolah/dashboard", icon: "dashboard" },
    ],
  },
  {
    label: "Manajemen",
    items: [
      { label: "Guru", href: "/sekolah/guru", icon: "users" },
      { label: "Siswa", href: "/sekolah/siswa", icon: "class" },
      { label: "Kelas", href: "/sekolah/kelas", icon: "school" },
    ],
  },
  {
    label: "Asesmen",
    items: [
      { label: "Akses Ujian", href: "/sekolah/akses-ujian", icon: "exam" },
      { label: "Hasil Ujian", href: "/sekolah/laporan", icon: "report" },
    ],
  },
];

export default function SekolahLayout({ children }: { children: React.ReactNode }) {
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
