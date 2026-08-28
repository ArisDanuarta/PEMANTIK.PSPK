import type { Metadata } from "next";
import React from "react";
import IntervensiSuperAdminClient from "@/app/super-admin/intervensi/IntervensiSuperAdminClient";
import { getAllInterventionsGlobal } from "@/app/actions/interventions";
import { getLatestAiKnowledgeGraph } from "@/app/actions/geminiGraph";
import { getSystemSettings } from "@/app/actions/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pola Intervensi & Knowledge Graph Nasional",
  description: "Analisis Knowledge Graph dan pola intervensi asesmen nasional",
};

export default async function PenelitiIntervensiPage() {
  const resList = await getAllInterventionsGlobal();
  const interventions = resList.success ? (resList.data || []) : [];

  const nodes: any[] = [];
  const edges: any[] = [];
  const aiGraphRes = await getLatestAiKnowledgeGraph();

  const settingsRes = await getSystemSettings();
  const hasGeminiKey = !!settingsRes.data?.gemini_api_key;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pola Intervensi &amp; Knowledge Graph Nasional</h1>
          <div className="page-breadcrumb">
            <span>Peneliti</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Dampak &amp; Evaluasi</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Pola Intervensi</span>
          </div>
        </div>
      </div>

      <IntervensiSuperAdminClient
        initialInterventions={interventions}
        graphNodes={nodes}
        graphEdges={edges}
        aiGraph={aiGraphRes.success ? aiGraphRes : null}
        hasGeminiKey={hasGeminiKey}
      />
    </div>
  );
}
