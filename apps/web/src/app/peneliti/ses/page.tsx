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
  let studentData: any[] = [];
  let assessmentData: any[] = [];

  try {
    // We fetch students for the map
    const { data: stData } = await (supabase as any)
      .from("students")
      .select("id, city, district, province, ses_score, ses_class, father_education_id, mother_education_id, father_occupation_id, mother_occupation_id")
      .not("province", "is", null);
    studentData = stData || [];

    const { data: comms } = await (supabase as any)
      .from("communities")
      .select("id")
      .eq("is_sandbox", false);
    const validCommIds = (comms || []).map((c: any) => c.id);

    // And we fetch sessions for correlation analysis
    const { data: rs } = await (supabase as any)
      .from("v_assessment_report")
      .select("student_id, final_score")
      .eq("session_status", "completed")
      .in("community_id", validCommIds);
    assessmentData = rs || [];

  } catch (err) {
    console.error(err);
  }

  const cityStats: Record<string, any> = {};
  
  // Aggregate data by province
  const provinceStats: Record<string, { count: number, totalScore: number, avgScore: number }> = {};
  studentData.forEach(student => {
    const prov = student.province.toUpperCase();
    if (!provinceStats[prov]) provinceStats[prov] = { count: 0, totalScore: 0, avgScore: 0 };
    provinceStats[prov].count += 1;
    provinceStats[prov].totalScore += (student.ses_score || 0);
  });

  Object.keys(provinceStats).forEach(prov => {
    if (provinceStats[prov].count > 0) {
      provinceStats[prov].avgScore = provinceStats[prov].totalScore / provinceStats[prov].count;
    }
  });

  // Aggregate by city for map regions
  const cityAgg: Record<string, { count: number, totalScore: number, districts: Record<string, { count: number, totalScore: number }> }> = {};
  studentData.forEach(student => {
    if (!student.city) return;
    let city = student.city.toUpperCase();
    city = city.replace(/KABUPATEN|KAB\.|KOTA|ADMINISTRASI/ig, "").trim();
    
    if (!cityAgg[city]) cityAgg[city] = { count: 0, totalScore: 0, districts: {} };
    cityAgg[city].count += 1;
    cityAgg[city].totalScore += (student.ses_score || 0);

    if (student.district) {
      let district = student.district.toUpperCase();
      district = district.replace(/KECAMATAN|KEC\./ig, "").trim();
      if (!cityAgg[city].districts[district]) cityAgg[city].districts[district] = { count: 0, totalScore: 0 };
      cityAgg[city].districts[district].count += 1;
      cityAgg[city].districts[district].totalScore += (student.ses_score || 0);
    }
  });

  for (const city of Object.keys(cityAgg)) {
    const avgScore = cityAgg[city].totalScore / cityAgg[city].count;
    const districtsList = Object.keys(cityAgg[city].districts).map(dName => ({
      name: dName,
      count: cityAgg[city].districts[dName].count,
      avgScore: cityAgg[city].districts[dName].totalScore / cityAgg[city].districts[dName].count
    })).sort((a, b) => b.count - a.count);

    cityStats[city] = { count: cityAgg[city].count, avgScore, coordinates: null, districts: districtsList };
  }

  // Correlation prep
  const studentScores = new Map();
  assessmentData.forEach(a => {
    // Average if multiple sessions
    if (!studentScores.has(a.student_id)) {
      studentScores.set(a.student_id, { sum: 0, count: 0 });
    }
    const rec = studentScores.get(a.student_id);
    rec.sum += (a.final_score || 0);
    rec.count += 1;
  });

  let correlationData = studentData.map(s => {
    const avgAssessScore = studentScores.has(s.id) ? (studentScores.get(s.id).sum / studentScores.get(s.id).count) : null;
    return {
      sesScore: s.ses_score,
      assessScore: avgAssessScore
    }
  }).filter(d => d.sesScore !== null && d.assessScore !== null);


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
      />
    </div>
  );
}
