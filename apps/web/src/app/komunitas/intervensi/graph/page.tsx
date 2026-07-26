import type { Metadata } from "next";
import React from "react";
import InterventionGraph from "@/components/shared/InterventionGraph";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Visualisasi Knowledge Graph | Komunitas Pemantik",
  description: "Peta keterhubungan sekolah, intervensi, dan tag topik asesmen",
};

export default async function KomunitasGraphPage() {
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  if (!communityId) {
    redirect("/login");
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Peta Cluster Intervensi</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Intervensi</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Knowledge Graph</span>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", height: "780px" }}>
        <InterventionGraph />
      </div>
    </div>
  );
}
