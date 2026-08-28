import type { Metadata } from "next";
import React from "react";
import PenelitiIntervensiClient from "./PenelitiIntervensiClient";
import { getAllInterventionsGlobal, getGlobalInterventionGraph } from "@/app/actions/interventions";
import { getLatestAiKnowledgeGraph } from "@/app/actions/geminiGraph";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pusat Data Intervensi & Knowledge Graph",
  description: "Analisis Knowledge Graph dan pola intervensi asesmen",
};

export default async function PenelitiIntervensiPage() {
  const resList = await getAllInterventionsGlobal();
  const interventions = resList.success ? (resList.data || []) : [];

  const nodes: any[] = [];
  const edges: any[] = [];
  const aiGraphRes = await getLatestAiKnowledgeGraph();
  
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pola Intervensi &amp; Knowledge Graph</h1>
          <div className="page-breadcrumb">
            <span>Peneliti</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Dampak &amp; Evaluasi</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Pola Intervensi</span>
          </div>
        </div>
      </div>

      <PenelitiIntervensiClient
        initialInterventions={interventions}
        graphNodes={nodes}
        graphEdges={edges}
        aiGraph={aiGraphRes.success ? aiGraphRes : null}
      />
    </div>
  );
}
