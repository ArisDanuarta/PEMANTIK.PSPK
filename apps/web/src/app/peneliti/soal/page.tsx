import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import PenelitiSoalClient from "./PenelitiSoalClient";

export const metadata: Metadata = {
  title: "Analisis Soal & Level",
  description: "Item analysis soal dan capaian level secara nasional",
};

export const dynamic = "force-dynamic";

export default async function PenelitiSoalPage() {
  const supabase = createServerClient();
  let questionsData: any[] = [];

  try {
    const { data, error } = await (supabase as any).rpc("get_peneliti_soal_stats");
    if (error) {
      console.error("RPC Error (get_peneliti_soal_stats):", JSON.stringify(error, null, 2));
    } else if (data && Array.isArray(data)) {
      questionsData = data;
    }
  } catch (err) {
    console.error("[PenelitiSoalPage] Failed:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Analisis Soal &amp; Level</h1>
          <div className="page-breadcrumb">
            <span>Peneliti</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Analisis Asesmen</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Soal &amp; Level</span>
          </div>
        </div>
      </div>

      <PenelitiSoalClient initialData={questionsData} />
    </div>
  );
}
