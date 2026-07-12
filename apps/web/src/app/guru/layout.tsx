import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import type { NavSection } from "@/components/layout/Sidebar";

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

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout
      role="teacher"
      roleName="Guru"
      roleChipClass="teacher"
      roleLabel="Guru"
      sections={guruNav}
    >
      {children}
    </AppLayout>
  );
}
