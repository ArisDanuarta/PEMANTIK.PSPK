"use client";

import React, { useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

// Menggunakan GeoJSON Kabupaten/Kota Indonesia lokal agar stabil dan cepat
const INDONESIA_KABKOTA_JSON = "/data/IDN_adm_2_kabkota.json";

// Warna Heatmap: Merah (SES Rendah) ke Hijau (SES Tinggi)
const colorScale = scaleLinear<string>()
  .domain([0, 16]) // Asumsi rentang SES score 0 - 16
  .range(["#ff4b4b", "#4caf50"]);

// Fungsi untuk menghitung centroid sederhana (titik tengah bounding box) dari GeoJSON coordinates
function calculateCentroid(coordinates: any[]): [number, number] {
  let minX = 180, maxX = -180, minY = 90, maxY = -90;
  const flatten = (arr: any[]) => {
    if (typeof arr[0] === 'number') {
      if (arr[0] < minX) minX = arr[0];
      if (arr[0] > maxX) maxX = arr[0];
      if (arr[1] < minY) minY = arr[1];
      if (arr[1] > maxY) maxY = arr[1];
    } else if (Array.isArray(arr)) {
      arr.forEach(flatten);
    }
  };
  flatten(coordinates);
  // Pastikan centroid valid, jika tidak kembalikan default
  if (minX === 180) return [118, -2];
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

interface MapProps {
  provinceStats: Record<string, { count: number; totalScore: number; avgScore: number }>;
  cityStats?: Record<string, { count: number; avgScore: number; coordinates: [number, number] | null; districts: any[] }>;
}

export default function SebaranMapViewer({ provinceStats, cityStats = {} }: MapProps) {
  const [tooltipContent, setTooltipContent] = useState("");
  const [selectedCity, setSelectedCity] = useState<{name: string, stat: any} | null>(null);
  
  // State untuk mengontrol zoom dan center peta
  const [mapPosition, setMapPosition] = useState<{coordinates: [number, number], zoom: number}>({ coordinates: [118, -2], zoom: 1 });
  
  // Referensi untuk menyimpan centroid setiap kabupaten agar bisa diakses dari list
  const centroidsRef = React.useRef<Record<string, [number, number]>>({});

  // Fungsi untuk menangani klik kabupaten (dari map atau dari list)
  const handleSelectCity = (name: string, stat: any, centroid?: [number, number]) => {
    setSelectedCity({ name, stat });
    const targetCentroid = centroid || centroidsRef.current[name] || [118, -2];
    setMapPosition({ coordinates: targetCentroid, zoom: 6 }); // Zoom level 6 cukup dekat untuk melihat kabupaten
  };

  const handleResetMap = () => {
    setSelectedCity(null);
    setMapPosition({ coordinates: [118, -2], zoom: 1 });
  };

  // Urutkan kabupaten yang ada datanya untuk sidebar kiri
  const activeCities = Object.keys(cityStats)
    .filter(c => cityStats[c].count > 0)
    .sort((a, b) => cityStats[b].count - cityStats[a].count);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexWrap: "wrap", backgroundColor: "#f8fafc" }}>
      
      {/* LEFT SIDEBAR: Agenda Kabupaten */}
      <div style={{
        flex: "1 1 280px",
        maxWidth: "100%",
        background: "white",
        borderRight: "1px solid #e2e8f0",
        boxShadow: "4px 0 15px rgba(0,0,0,0.02)",
        display: "flex",
        flexDirection: "column",
        zIndex: 5
      }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", background: "#f1f5f9" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Agenda Wilayah
          </h3>
          <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>
            Kabupaten/Kota terdaftar
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {activeCities.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
              Belum ada data wilayah.
            </div>
          ) : (
            activeCities.map(city => (
              <button
                key={city}
                onClick={() => handleSelectCity(city, cityStats[city])}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.85rem 1rem",
                  background: selectedCity?.name === city ? "#e0f2fe" : "transparent",
                  border: "none",
                  borderBottom: "1px solid #f1f5f9",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "background 0.2s"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxWidth: "75%" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: selectedCity?.name === city ? "#0369a1" : "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {city}
                  </span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, color: selectedCity?.name === city ? "#0284c7" : "#94a3b8" }}>
                    Rata SES: {cityStats[city].avgScore.toFixed(1)}
                  </span>
                </div>
                <div style={{ 
                  background: selectedCity?.name === city ? "#0ea5e9" : "#e2e8f0", 
                  color: selectedCity?.name === city ? "white" : "#475569",
                  padding: "0.2rem 0.6rem", 
                  borderRadius: "1rem", 
                  fontSize: "0.8rem", 
                  fontWeight: 700 
                }}>
                  {cityStats[city].count}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div style={{ flex: "2 1 400px", position: "relative", overflow: "hidden", minHeight: "400px" }}>
        <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1200,
          center: [118, -2] // Titik tengah geografis Indonesia
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup 
          center={mapPosition.coordinates} 
          zoom={mapPosition.zoom}
          filterZoomEvent={(e: any) => {
            // Mematikan semua event zoom dari mouse wheel atau trackpad
            return false;
          }}
          style={{ transition: "transform 800ms cubic-bezier(0.25, 1, 0.5, 1)" }}
        >
          <Geographies geography={INDONESIA_KABKOTA_JSON}>
            {({ geographies }: { geographies: any[] }) =>
              geographies && geographies.length > 0 ? (
                geographies.map((geo: any) => {
                // GeoJSON property untuk Kabupaten/Kota adalah NAME_2
                const rawCityName = (geo.properties.NAME_2 || geo.properties.name || "").toUpperCase();
                const cleanCityName = rawCityName.replace(/KABUPATEN|KAB\.|KOTA|ADMINISTRASI/ig, "").trim();
                
                // Cari data stat untuk kabupaten ini
                const statKey = Object.keys(cityStats).find(k => k === cleanCityName || cleanCityName.includes(k) || k.includes(cleanCityName));
                const stat = statKey ? cityStats[statKey] : null;

                // Hitung dan simpan centroid untuk zoom
                let centroid: [number, number] = [118, -2];
                if (geo.geometry && geo.geometry.coordinates) {
                  centroid = calculateCentroid(geo.geometry.coordinates);
                  centroidsRef.current[cleanCityName] = centroid;
                }
                const curColor = stat ? colorScale(stat.avgScore) : "#e2e8f0";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={selectedCity?.name === cleanCityName ? "#0ea5e9" : curColor}
                    stroke="#fff"
                    strokeWidth={mapPosition.zoom > 3 ? 0.05 : 0.2}
                    onClick={() => {
                      if (stat) {
                        handleSelectCity(cleanCityName, stat, centroid);
                      } else {
                        handleSelectCity(cleanCityName, { count: 0, avgScore: 0, districts: [] }, centroid);
                      }
                    }}
                    onMouseEnter={() => {
                      if (stat) {
                        setTooltipContent(`${rawCityName}: ${stat.count} Anak | Rata-rata SES: ${stat.avgScore.toFixed(1)}`);
                      } else {
                        setTooltipContent(`${rawCityName}: Belum ada data`);
                      }
                    }}
                    onMouseLeave={() => {
                      setTooltipContent("");
                    }}
                    style={{
                      default: { outline: "none", transition: "all 250ms" },
                      hover: { fill: "#fcd34d", outline: "none", cursor: "pointer", transition: "all 250ms" },
                      pressed: { fill: "#f59e0b", outline: "none" },
                    }}
                  />
                );
              })
            ) : null}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip Float */}
      {tooltipContent && (
        <div style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "0.5rem 1rem",
          borderRadius: 8,
          pointerEvents: "none",
          fontWeight: 500,
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
        }}>
          {tooltipContent}
        </div>
      )}

      {/* Legenda */}
      <div style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        background: "white",
        padding: "1rem",
        borderRadius: 8,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        zIndex: 10
      }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>Rata-rata Skor SES</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "black" }}>Rendah</span>
          <div style={{ width: 100, height: 10, background: "linear-gradient(to right, #ff4b4b, #4caf50)", borderRadius: 4 }} />
          <span style={{ fontSize: "0.75rem", color: "black" }}>Tinggi</span>
        </div>
      </div>
      </div>

      {/* Side Panel for Details */}
      {selectedCity && (
        <div style={{
          width: 320,
          background: "white",
          borderLeft: "1px solid #e2e8f0",
          boxShadow: "-4px 0 15px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          animation: "slideInRight 0.3s ease-out"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1.2 }}>
              Kabupaten / Kota<br/>
              <span style={{ color: "#0874aa" }}>{selectedCity.name}</span>
            </h3>
            <button 
              onClick={handleResetMap}
              style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "1rem", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Kembali ke Peta Utuh"
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1, overflowY: "auto", paddingRight: "0.25rem" }}>
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, marginBottom: "0.25rem" }}>TOTAL ANAK TERDAFTAR</div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a" }}>
                {selectedCity.stat.count} <span style={{ fontSize: "1rem", fontWeight: 500, color: "#64748b" }}>Anak</span>
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, marginBottom: "0.25rem" }}>RATA-RATA SKOR SES</div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: selectedCity.stat.count > 0 ? colorScale(selectedCity.stat.avgScore) : "#94a3b8" }}>
                {selectedCity.stat.count > 0 ? selectedCity.stat.avgScore.toFixed(2) : "-"}
              </div>
              {selectedCity.stat.count > 0 && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", fontWeight: 500, color: "#475569", display: "flex", alignItems: "center" }}>
                  Klasifikasi Mayoritas: 
                  <span style={{ 
                    marginLeft: "0.5rem",
                    padding: "0.2rem 0.6rem", 
                    background: selectedCity.stat.avgScore >= 12 ? "#dcfce7" : selectedCity.stat.avgScore >= 8 ? "#fef3c7" : "#fee2e2",
                    color: selectedCity.stat.avgScore >= 12 ? "#166534" : selectedCity.stat.avgScore >= 8 ? "#92400e" : "#991b1b",
                    borderRadius: "1rem",
                    fontSize: "0.75rem",
                    fontWeight: 700
                  }}>
                    {selectedCity.stat.avgScore >= 12 ? "ATAS" : selectedCity.stat.avgScore >= 8 ? "MENENGAH" : "BAWAH"}
                  </span>
                </div>
              )}
            </div>

            {/* Bagian Detail Kecamatan */}
            {selectedCity.stat.count > 0 && selectedCity.stat.districts && (
              <div style={{ marginTop: "0.5rem" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#334155", marginBottom: "0.75rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.5rem" }}>
                  Rincian Per Kecamatan
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {selectedCity.stat.districts.map((dist: any, idx: number) => (
                    <div key={idx} style={{ 
                      display: "flex", justifyContent: "space-between", alignItems: "center", 
                      padding: "0.75rem", background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem" 
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>Kec. {dist.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Rata SES: {dist.avgScore.toFixed(1)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>{dist.count}</span>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Anak</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            
            {selectedCity.stat.count === 0 && (
              <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#64748b", textAlign: "center", fontStyle: "italic" }}>
                Belum ada data anak terdaftar dari wilayah ini.
              </div>
            )}
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
