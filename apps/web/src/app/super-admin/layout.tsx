import React from "react";
import AppLayout from "@/components/layout/AppLayout";
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
      { label: "Semua Siswa", href: "/super-admin/siswa", icon: "student" },
      { label: "Bank Soal", href: "/super-admin/soal", icon: "question" },
    ],
  },
  {
    label: "Manajemen Ujian",
    items: [
      { label: "Akses Ujian", href: "/super-admin/akses-ujian", icon: "activity" },
      { label: "Sesi Ujian Siswa", href: "/super-admin/sesi-siswa", icon: "class" },
    ],
  },
  {
    label: "Laporan & Sistem",
    items: [
      { label: "Hasil Ujian", href: "/super-admin/laporan", icon: "activity" },
      { label: "Sebaran SES", href: "/super-admin/sebaran-ses", icon: "activity" },
      { label: "Log Sistem & Error", href: "/super-admin/log-sistem", icon: "activity" },
      { label: "Pengaturan SES", href: "/super-admin/pengaturan-ses", icon: "settings" },
      { label: "Pengaturan Platform", href: "/super-admin/pengaturan", icon: "settings" },
    ],
  },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout
      role="super_admin"
      roleName="Super Admin"
      roleChipClass="super-admin"
      roleLabel="Super Admin"
      sections={superAdminNav}
    >
      {children}
    </AppLayout>
  );
}
