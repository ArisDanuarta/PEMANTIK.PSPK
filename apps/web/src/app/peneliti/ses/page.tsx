import type { Metadata } from "next";
import React from "react";
import PenelitiSesClient from "./PenelitiSesClient";
import { createServerClient } from "@pemantik/supabase";

export const metadata: Metadata = {
  title: "Analisis SES & Konteks Sosial",
  description: "Visualisasi Sebaran Socio-Economic Status dan korelasinya terhadap hasil asesmen",
};

export const dynamic = "force-dynamic";

export default async function PenelitiSesPage() {
  const supabase = createServerClient();
  let provinceStats: Record<string, any> = {};
  let cityStats: Record<string, any> = {};
  let correlationData: any[] = [];
  let correlationCoef = 0;

  try {
    const { data, error } = await (supabase as any).rpc("get_peneliti_ses_stats");
    
    if (error) {
      console.error("RPC Error (get_peneliti_ses_stats):", JSON.stringify(error, null, 2));
    } else if (data && typeof data === 'object') {
       // reconstruct provinceStats
       (data.provinceStats || []).forEach((p: any) => {
         provinceStats[p.province] = {
           count: p.count,
           totalScore: p.total_score,
           avgScore: p.count > 0 ? p.total_score / p.count : 0
         };
       });

       // reconstruct cityStats
       const cityAgg: Record<string, any> = {};
       (data.cityStats || []).forEach((c: any) => {
         if (!cityAgg[c.city]) cityAgg[c.city] = { count: 0, totalScore: 0, districts: {} };
         cityAgg[c.city].count += c.count;
         cityAgg[c.city].totalScore += c.total_score;
         
         if (c.district) {
           cityAgg[c.city].districts[c.district] = {
             count: c.count,
             totalScore: c.total_score
           };
         }
       });

       for (const city of Object.keys(cityAgg)) {
         const avgScore = cityAgg[city].count > 0 ? cityAgg[city].totalScore / cityAgg[city].count : 0;
         const districtsList = Object.keys(cityAgg[city].districts).map(dName => ({
           name: dName,
           count: cityAgg[city].districts[dName].count,
           avgScore: cityAgg[city].districts[dName].count > 0 ? cityAgg[city].districts[dName].totalScore / cityAgg[city].districts[dName].count : 0
         })).sort((a, b) => b.count - a.count);

         cityStats[city] = { count: cityAgg[city].count, avgScore, coordinates: null, districts: districtsList };
       }

       correlationData = data.correlationData || [];
       correlationCoef = data.correlationCoef || 0;
    }
  } catch (err) {
    console.error("Failed to load data for SES analysis", err);
  }

  return (
    <div className="animate-fade-in" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Analisis SES & Konteks Sosial</h1>
          <div className="page-breadcrumb">
            <span>Peneliti</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Analisis Asesmen</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Analisis SES</span>
          </div>
        </div>
      </div>

      <PenelitiSesClient 
        provinceStats={provinceStats} 
        cityStats={cityStats} 
        correlationData={correlationData}
        correlationCoef={correlationCoef}
      />
    </div>
  );
}
