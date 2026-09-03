import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import React from "react";
import AnalisisKomparatifClient, { KomparatifStats } from "./AnalisisKomparatifClient";

export const metadata: Metadata = {
  title: "Analisis Komparatif",
  description: "Analisis komparatif hasil asesmen lintas dimensi",
};

export const dynamic = "force-dynamic";

export default async function PenelitiAnalisisPage() {
  const supabase = createServerClient() as SupabaseClient;
  let initialStats: KomparatifStats | null = null;
  let communities: Array<{ id: string; name: string }> = [];
  let uniqueProvinces: string[] = [];

  try {
    // 1. Get active communities for filter
    const { data: comms } = await supabase
      .from("communities")
      .select("id, name")
      .eq("is_sandbox", false);
    communities = comms || [];

    // 2. Get distinct provinces (from schools table since it's much faster than querying v_assessment_report)
    const { data: provs } = await supabase
      .from("schools")
      .select("province")
      .not("province", "is", null);
    
    uniqueProvinces = Array.from(new Set(provs?.map(p => p.province) || [])).sort();
    
    // 3. Fetch initial aggregated data via RPC Server Action
    const { fetchAnalisisKomparatifStats } = await import("@/app/actions/penelitiAnalisis");
    const result = await fetchAnalisisKomparatifStats('all', 'all', 'all');
    if (result.success) {
      initialStats = result.data;
    }

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

      <AnalisisKomparatifClient 
        initialStats={initialStats} 
        communities={communities} 
        provinces={uniqueProvinces as string[]} 
      />
    </div>
  );
}
