import type { Metadata } from "next";
import React from "react";
import PenelitiIntervensiClient from "./PenelitiIntervensiClient";
import { getAllInterventionsGlobal } from "@/app/actions/interventions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pola Intervensi & Knowledge Graph Nasional",
  description: "Analisis Knowledge Graph dan pola intervensi asesmen nasional",
};

export default async function PenelitiIntervensiPage() {
  const resList = await getAllInterventionsGlobal();
  const interventions = resList.success ? (resList.data || []) : [];

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

      <PenelitiIntervensiClient
        initialInterventions={interventions}
      />
    </div>
  );
}
