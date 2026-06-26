import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import SesManager from "./SesManager";

export const metadata: Metadata = {
  title: "Pengaturan SES",
  description: "Konfigurasi Status Sosial Ekonomi",
};

export default async function PengaturanSesPage() {
  const supabase = createServerClient();

  let thresholds: any[] = [];
  let variables: any[] = [];

  try {
    const [thRes, varRes] = await Promise.all([
      (supabase as any).from("ses_thresholds").select("*").order("min_score", { ascending: false }),
      (supabase as any).from("ses_variables").select("*").order("type", { ascending: true }).order("score", { ascending: false })
    ]);
    
    thresholds = thRes.data ?? [];
    variables = varRes.data ?? [];
  } catch (err) {
    console.error("Error loading SES config:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pengaturan Kategori SES</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Pengaturan SES</span>
          </div>
        </div>
      </div>

      <SesManager initialThresholds={thresholds} initialVariables={variables} />
    </div>
  );
}
