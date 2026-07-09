import type { Metadata } from "next";
import React from "react";
import IntervensiSuperAdminClient from "./IntervensiSuperAdminClient";
import { getAllInterventionsGlobal, getGlobalInterventionGraph } from "@/app/actions/interventions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pusat Data Intervensi & Knowledge Graph Global | Super Admin",
  description: "Pengawasan intervensi nasional dan analisis Knowledge Graph seluruh komunitas",
};

export default async function SuperAdminIntervensiPage() {
  const resList = await getAllInterventionsGlobal();
  const interventions = resList.success ? (resList.data || []) : [];

  const resGraph = await getGlobalInterventionGraph();
  const nodes = resGraph.success ? (resGraph.nodes || []) : [];
  const edges = resGraph.success ? (resGraph.edges || []) : [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pusat Intervensi &amp; Knowledge Graph Global</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Laporan &amp; Sistem</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Intervensi &amp; Graph</span>
          </div>
        </div>
      </div>

      <IntervensiSuperAdminClient
        initialInterventions={interventions}
        graphNodes={nodes}
        graphEdges={edges}
      />
    </div>
  );
}
