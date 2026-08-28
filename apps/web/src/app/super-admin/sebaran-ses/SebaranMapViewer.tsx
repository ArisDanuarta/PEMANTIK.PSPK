"use client";

import React, { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

const INDONESIA_KABKOTA_JSON = "/data/IDN_adm_2_kabkota.json";

// Heatmap colors: Red (Low) to Emerald Green (High)
const colorScale = scaleLinear<string>()
  .domain([0, 16])
  .range(["#f43f5e", "#10b981"]);

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
  if (minX === 180) return [118, -2];
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

interface MapProps {
  provinceStats: Record<string, { count: number; totalScore: number; avgScore: number }>;
  cityStats?: Record<string, { count: number; avgScore: number; coordinates: [number, number] | null; districts: any[] }>;
}

export default function SebaranMapViewer({ provinceStats, cityStats = {} }: MapProps) {
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedCity, setSelectedCity] = useState<{name: string, stat: any} | null>(null);
  
  const [mapPosition, setMapPosition] = useState<{coordinates: [number, number], zoom: number}>({ coordinates: [118, -2], zoom: 1 });
  const centroidsRef = React.useRef<Record<string, [number, number]>>({});

  const handleSelectCity = (name: string, stat: any, centroid?: [number, number]) => {
    setSelectedCity({ name, stat });
    const targetCentroid = centroid || centroidsRef.current[name];
    if (targetCentroid) {
      setMapPosition({ coordinates: targetCentroid, zoom: 10 });
    }
    // Jika koordinat tidak ditemukan (kabupaten mekar / data salah),
    // peta tidak akan bergeser secara paksa ke tengah laut, panel detail tetap terbuka.
  };

  const handleResetMap = () => {
    setSelectedCity(null);
    setMapPosition({ coordinates: [118, -2], zoom: 1 });
  };

  const activeCities = useMemo(() => {
    return Object.keys(cityStats)
      .filter(c => cityStats[c].count > 0)
      .sort((a, b) => cityStats[b].count - cityStats[a].count);
  }, [cityStats]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#eef2f6", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      
      {/* Map Layer (Full Bleed) */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 1100, center: [118, -2] }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup 
            center={mapPosition.coordinates} 
            zoom={mapPosition.zoom}
            onMoveEnd={(position: any) => setMapPosition(position)}
            style={{ transition: "transform 800ms cubic-bezier(0.25, 1, 0.5, 1)" }}
          >
            <Geographies geography={INDONESIA_KABKOTA_JSON}>
              {({ geographies }: { geographies: any[] }) =>
                geographies && geographies.length > 0 ? (
                  geographies.map((geo: any) => {
                  const rawCityName = (geo.properties.NAME_2 || geo.properties.name || "").toUpperCase();
                  const cleanCityName = rawCityName.replace(/KABUPATEN|KAB\.|KOTA|ADMINISTRASI/ig, "").trim();
                  
                  const statKey = Object.keys(cityStats).find(k => k === cleanCityName || cleanCityName.includes(k) || k.includes(cleanCityName));
                  const stat = statKey ? cityStats[statKey] : null;

                  let centroid: [number, number] = [118, -2];
                  if (geo.geometry && geo.geometry.coordinates) {
                    centroid = calculateCentroid(geo.geometry.coordinates);
                    centroidsRef.current[cleanCityName] = centroid;
                  }
                  
                  const isSelected = selectedCity?.name === cleanCityName;
                  const curColor = stat ? colorScale(stat.avgScore) : "#e2e8f0";

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isSelected ? "#3b82f6" : curColor}
                      stroke={isSelected ? "#ffffff" : "#f8fafc"}
                      strokeWidth={isSelected ? (mapPosition.zoom > 3 ? 0.08 : 0.4) : (mapPosition.zoom > 3 ? 0.03 : 0.1)}
                      onClick={() => {
                        handleSelectCity(cleanCityName, stat || { count: 0, avgScore: 0, districts: [] }, centroid);
                      }}
                      onMouseMove={(e: any) => {
                        if (stat) {
                          setTooltipContent(`${rawCityName}`);
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        } else {
                          setTooltipContent(`${rawCityName} (Tidak ada data)`);
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      onMouseLeave={() => setTooltipContent("")}
                      style={{
                        default: { outline: "none", transition: "all 300ms ease" },
                        hover: { fill: "#facc15", outline: "none", cursor: "pointer", transition: "all 300ms ease" },
                        pressed: { fill: "#eab308", outline: "none" },
                      }}
                    />
                  );
                })
              ) : null}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Floating Left Panel (City List) */}
      <div style={{
        position: "absolute",
        left: 24,
        top: 24,
        bottom: 24,
        width: 320,
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 24,
        border: "1px solid rgba(255, 255, 255, 0.6)",
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        overflow: "hidden"
      }}>
        <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            Wilayah SES
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px", marginBottom: 0 }}>
            Distribusi Sosio-Ekonomi Daerah
          </p>
        </div>
        
        <div className="custom-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeCities.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
              Belum ada data wilayah.
            </div>
          ) : (
            activeCities.map(city => {
              const isSelected = selectedCity?.name === city;
              const stat = cityStats[city];
              return (
                <button
                  key={city}
                  onClick={() => handleSelectCity(city, stat)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    background: isSelected ? "rgba(59, 130, 246, 0.1)" : "transparent",
                    border: isSelected ? "1px solid rgba(59, 130, 246, 0.2)" : "1px solid transparent",
                    borderRadius: "16px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e: any) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(0,0,0,0.02)";
                      e.currentTarget.style.border = "1px solid rgba(0,0,0,0.05)";
                    }
                  }}
                  onMouseOut={(e: any) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.border = "1px solid transparent";
                    }
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "70%" }}>
                    <span style={{ 
                      fontSize: "0.95rem", 
                      fontWeight: 700, 
                      color: isSelected ? "#1d4ed8" : "#334155", 
                      whiteSpace: "nowrap", 
                      overflow: "hidden", 
                      textOverflow: "ellipsis" 
                    }}>
                      {city}
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: isSelected ? "#3b82f6" : "#64748b" }}>
                      Avg: {stat.avgScore.toFixed(1)}
                    </span>
                  </div>
                  <div style={{ 
                    background: isSelected ? "#3b82f6" : "#f1f5f9", 
                    color: isSelected ? "white" : "#475569",
                    padding: "4px 10px", 
                    borderRadius: "20px", 
                    fontSize: "0.75rem", 
                    fontWeight: 700,
                    boxShadow: isSelected ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "none"
                  }}>
                    {stat.count}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Floating Right Panel (City Details) */}
      {selectedCity && (
        <div style={{
          position: "absolute",
          right: 24,
          top: 24,
          bottom: 24,
          width: 360,
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: 24,
          border: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow: "-10px 10px 40px -10px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          zIndex: 20,
          animation: "slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>
                Kabupaten / Kota
              </p>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.03em" }}>
                {selectedCity.name}
              </h3>
            </div>
            <button 
              onClick={handleResetMap}
              style={{ 
                background: "rgba(0,0,0,0.04)", 
                border: "none", 
                borderRadius: "50%", 
                width: "36px", 
                height: "36px", 
                cursor: "pointer", 
                color: "#64748b", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                transition: "all 0.2s"
              }}
              onMouseOver={(e: any) => { e.currentTarget.style.background = "rgba(0,0,0,0.08)"; e.currentTarget.style.color = "#0f172a"; }}
              onMouseOut={(e: any) => { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; e.currentTarget.style.color = "#64748b"; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="custom-scroll" style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "rgba(255,255,255,0.9)", padding: "16px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  TOTAL ANAK
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                  {selectedCity.stat.count}
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.9)", padding: "16px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01"></path><path d="M7 20v-4"></path><path d="M12 20v-8"></path><path d="M17 20V8"></path><path d="M22 4v16"></path></svg>
                  RATA SES
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: selectedCity.stat.count > 0 ? colorScale(selectedCity.stat.avgScore) : "#94a3b8", lineHeight: 1 }}>
                  {selectedCity.stat.count > 0 ? selectedCity.stat.avgScore.toFixed(2) : "-"}
                </div>
              </div>
            </div>

            {selectedCity.stat.count > 0 && (
              <div style={{ 
                padding: "16px", 
                background: selectedCity.stat.avgScore >= 12 ? "rgba(16, 185, 129, 0.1)" : selectedCity.stat.avgScore >= 8 ? "rgba(245, 158, 11, 0.1)" : "rgba(244, 63, 94, 0.1)",
                border: selectedCity.stat.avgScore >= 12 ? "1px solid rgba(16, 185, 129, 0.2)" : selectedCity.stat.avgScore >= 8 ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(244, 63, 94, 0.2)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Klasifikasi Wilayah</span>
                <span style={{ 
                  padding: "4px 12px", 
                  background: selectedCity.stat.avgScore >= 12 ? "#10b981" : selectedCity.stat.avgScore >= 8 ? "#f59e0b" : "#f43f5e",
                  color: "white",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
                }}>
                  {selectedCity.stat.avgScore >= 12 ? "ATAS" : selectedCity.stat.avgScore >= 8 ? "MENENGAH" : "BAWAH"}
                </span>
              </div>
            )}

            {/* Districts List */}
            {selectedCity.stat.count > 0 && selectedCity.stat.districts && (
              <div>
                <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                  Rincian Kecamatan
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedCity.stat.districts.map((dist: any, idx: number) => (
                    <div key={idx} style={{ 
                      display: "flex", justifyContent: "space-between", alignItems: "center", 
                      padding: "12px 16px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.04)", borderRadius: "12px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>{dist.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Rata SES: <strong style={{color: colorScale(dist.avgScore), fontWeight: 800}}>{dist.avgScore.toFixed(1)}</strong></span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                        <span style={{ fontSize: "1rem", fontWeight: 800, color: "#334155" }}>{dist.count}</span>
                        <span style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Anak</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedCity.stat.count === 0 && (
              <div style={{ marginTop: "32px", display: "flex", flexDirection: "column", alignItems: "center", color: "#94a3b8" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px" }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <span style={{ fontSize: "0.9rem", textAlign: "center", fontWeight: 500 }}>Belum ada data anak<br/>dari wilayah ini.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div style={{
        position: "absolute",
        right: selectedCity ? 400 : 24, // Shift left if sidebar is open
        bottom: 24,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        zIndex: 10,
        transition: "right 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        <div style={{ display: "flex", flexDirection: "column", background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", border: "1px solid rgba(255,255,255,0.6)", overflow: "hidden" }}>
          <button 
            onClick={() => setMapPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 30) }))}
            style={{ width: 44, height: 44, background: "transparent", border: "none", borderBottom: "1px solid rgba(0,0,0,0.05)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", transition: "background 0.2s" }}
            onMouseOver={(e: any) => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
            onMouseOut={(e: any) => e.currentTarget.style.background = "transparent"}
            title="Perbesar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button 
            onClick={() => setMapPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))}
            style={{ width: 44, height: 44, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", transition: "background 0.2s" }}
            onMouseOver={(e: any) => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
            onMouseOut={(e: any) => e.currentTarget.style.background = "transparent"}
            title="Perkecil"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        
        <button 
          onClick={handleResetMap}
          style={{ width: 44, height: 44, background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", transition: "background 0.2s" }}
          onMouseOver={(e: any) => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
          onMouseOut={(e: any) => e.currentTarget.style.background = "rgba(255,255,255,0.8)"}
          title="Reset Posisi"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
        </button>
      </div>

      {/* Legend */}
      <div style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(16px)",
        padding: "12px 24px",
        borderRadius: "100px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        border: "1px solid rgba(255,255,255,0.6)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: "16px"
      }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#1e293b", letterSpacing: "0.02em" }}>SKOR SES</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Rendah</span>
          <div style={{ width: 120, height: 8, background: "linear-gradient(to right, #f43f5e, #10b981)", borderRadius: 10 }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Tinggi</span>
        </div>
      </div>

      {/* Tooltip Map */}
      {tooltipContent && (
        <div style={{
          position: "fixed",
          left: tooltipPos.x + 15,
          top: tooltipPos.y + 15,
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(8px)",
          color: "white",
          padding: "8px 16px",
          borderRadius: "8px",
          pointerEvents: "none",
          fontSize: "0.85rem",
          fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          zIndex: 9999,
          whiteSpace: "nowrap",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          {tooltipContent}
        </div>
      )}

      {/* Global styles for custom scrollbar within panels */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        .custom-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.4);
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.6);
        }

        @keyframes slideInRight {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
