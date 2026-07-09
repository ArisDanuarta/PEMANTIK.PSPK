import type { Metadata } from "next";
import React from "react";
import IntervensiSekolahClient from "./IntervensiSekolahClient";
import { getInterventionsForSchool, getSchoolInterventionGraph } from "@/app/actions/interventions";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Riwayat Intervensi & Knowledge Graph | Role Sekolah Pemantik",
  description: "Daftar pembinaan intervensi dan peta Knowledge Graph untuk sekolah Anda",
};

export default async function SekolahIntervensiPage() {
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) {
    redirect("/login");
  }

  const resList = await getInterventionsForSchool(schoolId);
  const interventions = resList.success ? (resList.data || []) : [];

  const resGraph = await getSchoolInterventionGraph(schoolId);
  const nodes = resGraph.success ? (resGraph.nodes || []) : [];
  const edges = resGraph.success ? (resGraph.edges || []) : [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Riwayat Intervensi &amp; Knowledge Graph</h1>
          <div className="page-breadcrumb">
            <span>Sekolah</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Intervensi &amp; Graph</span>
          </div>
        </div>
      </div>

      <IntervensiSekolahClient
        initialInterventions={interventions}
        graphNodes={nodes}
        graphEdges={edges}
      />
    </div>
  );
}
