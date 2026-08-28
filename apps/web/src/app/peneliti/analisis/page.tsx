import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import AnalisisKomparatifClient from "./AnalisisKomparatifClient";

export const metadata: Metadata = {
  title: "Analisis Komparatif",
  description: "Analisis komparatif hasil asesmen lintas dimensi",
};

export const dynamic = "force-dynamic";

export default async function PenelitiAnalisisPage() {
  const supabase = createServerClient();
  let rawData: any[] = [];
  let communities: any[] = [];

  try {
    // Get active communities for filter
    const { data: comms } = await (supabase as any)
      .from("communities")
      .select("id, name")
      .eq("is_sandbox", false);
    communities = comms || [];
    const validCommIds = communities.map((c: any) => c.id);

    // 1. Get base report data for comparative analysis
    const { data: rs } = await (supabase as any)
      .from("v_assessment_report")
      .select("student_id, session_id, school_id, community_id, community_name, session_status, final_score, final_level_number, completed_at, category_id, gender, ses_class, school_name, province, city")
      .eq("session_status", "completed")
      .not("session_id", "is", null)
      .in("community_id", validCommIds);

    rawData = rs || [];

    // The active communities were already fetched at the start of the try block.
  } catch (err) {
    console.error("Failed to load data for comparative analysis", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Analisis Komparatif</h1>
          <div className="page-breadcrumb">
            <span>Peneliti</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Analisis Asesmen</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Analisis Komparatif</span>
          </div>
        </div>
      </div>

      <AnalisisKomparatifClient initialData={rawData} communities={communities} />
    </div>
  );
}
