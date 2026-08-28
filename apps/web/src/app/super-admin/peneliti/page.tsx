import type { Metadata } from "next";
import React from "react";
import PenelitiList from "./PenelitiList";
import { getPenelitiAdmins } from "@/app/actions/penelitiAdmins";

export const metadata: Metadata = {
  title: "Kelola Peneliti",
  description: "Manajemen akun peneliti untuk analisis data",
};

export default async function PenelitiPage() {
  const res = await getPenelitiAdmins();
  const admins = res.success ? res.data : [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Peneliti</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Peneliti</span>
          </div>
        </div>
      </div>

      <PenelitiList initialAdmins={admins || []} />
    </div>
  );
}
