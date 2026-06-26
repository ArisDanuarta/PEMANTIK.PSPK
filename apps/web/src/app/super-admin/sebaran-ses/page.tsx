import type { Metadata } from "next";
import React from "react";
import SebaranMapViewer from "./SebaranMapViewer";
import { createServerClient } from "@pemantik/supabase";

export const metadata: Metadata = {
  title: "Peta Sebaran SES",
  description: "Visualisasi Sebaran Socio-Economic Status Pengguna",
};

export default async function SebaranSesPage() {
  const supabase = createServerClient();
  let studentData: any[] = [];

  try {
    const { data } = await (supabase as any)
      .from("students")
      .select("city, district, province, ses_score, ses_class")
      .not("province", "is", null);
    studentData = data || [];
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
    // Normalize city name: remove prefixes like Kab., Kabupaten, Kota, Administrasi
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

  // Calculate final cityStats without geocoding since map uses GeoJSON paths
  for (const city of Object.keys(cityAgg)) {
    const avgScore = cityAgg[city].totalScore / cityAgg[city].count;
    
    const districtsList = Object.keys(cityAgg[city].districts).map(dName => ({
      name: dName,
      count: cityAgg[city].districts[dName].count,
      avgScore: cityAgg[city].districts[dName].totalScore / cityAgg[city].districts[dName].count
    })).sort((a, b) => b.count - a.count); // urutkan dari yang terbanyak

    cityStats[city] = { count: cityAgg[city].count, avgScore, coordinates: null, districts: districtsList };
  }

  return (
    <div className="animate-fade-in" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Peta Sebaran SES Pengguna</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Sebaran SES</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ flex: 1, marginTop: "1rem", position: "relative", height: "calc(100vh - 250px)", overflow: "hidden", padding: 0, display: "flex" }}>
        <SebaranMapViewer provinceStats={provinceStats} cityStats={cityStats} />
      </div>
    </div>
  );
}
