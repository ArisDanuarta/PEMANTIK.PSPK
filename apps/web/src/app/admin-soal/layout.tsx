import React from "react";
import AppLayout from "@/components/layout/AppLayout";
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

export default function AdminSoalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout
      role="question_admin"
      roleName="Admin Soal"
      roleChipClass="question-admin"
      roleLabel="Admin Soal"
      sections={adminSoalNav}
    >
      {children}
    </AppLayout>
  );
}
