import type { Metadata } from "next";
import React from "react";
import AdminSoalList from "./AdminSoalList";
import { getQuestionAdmins } from "@/app/actions/questionAdmins";

export const metadata: Metadata = {
  title: "Kelola Admin Soal",
  description: "Manajemen akun admin yang mengelola konten soal",
};

export default async function AdminSoalPage() {
  const res = await getQuestionAdmins();
  const admins = res.success ? res.data : [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Admin Soal</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Admin Soal</span>
          </div>
        </div>
      </div>

      <AdminSoalList initialAdmins={admins || []} />
    </div>
  );
}
