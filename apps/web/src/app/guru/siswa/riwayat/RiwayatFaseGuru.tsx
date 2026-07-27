"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Badge } from "@pemantik/ui";

interface StudentRow {
  id: string;
  full_name: string;
  nisn: string | null;
  gender: string | null;
  username: string | null;
  classes: { id: string; name: string; grade: number } | null;
  assessment_sessions?: any[];
}

interface ClassOption { id: string; name: string; grade: number; }

interface Props {
  students: StudentRow[];
  classes: ClassOption[];
  activePhase: string;
}

export default function RiwayatFaseGuru({ students, classes, activePhase }: Props) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Ambil semua fase yang pernah ada (kecuali yang kosong)
  const allPhases = useMemo(() => {
    const phases = new Set<string>();
    students.forEach((s) => {
      if (s.assessment_sessions) {
        s.assessment_sessions.forEach((sess) => {
          if (sess.phase) phases.add(sess.phase);
        });
      }
    });
    // Hapus fase aktif dari opsi riwayat agar fokus pada histori lampau (opsional, tapi karena judulnya riwayat, kita urutkan saja)
    return Array.from(phases).sort((a, b) => b.localeCompare(a));
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.nisn ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.username ?? "").toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === "all" || s.classes?.id === classFilter;
      
      // Jika phase filter "all", kita hanya tampilkan yang punya riwayat
      return matchSearch && matchClass;
    });
  }, [students, search, classFilter]);

  if (!mounted) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Controls ── */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flex: "1 1 100%" }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Cari nama atau NISN..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ flex: "1 1 200px" }} 
          />
          <select className="form-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ flex: "1 1 120px" }}>
            <option value="all">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>Kelas {c.grade} - {c.name}</option>)}
          </select>
          <select className="form-input" value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} style={{ flex: "1 1 120px" }}>
            <option value="all">Semua Fase (Histori)</option>
            {allPhases.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* ── Data List / Table ── */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="pemantik-table" style={{ width: "100%", minWidth: "750px" }}>
            <thead>
              <tr>
                <th>Nama Lengkap</th>
                <th>Kelas</th>
                <th>Riwayat Progres Ujian (Fase)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                    Tidak ada data histori anak yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  // Filter session berdasarkan pilihan filter fase (atau semua jika "all")
                  // dan KECUALIKAN fase aktif dari kolom riwayat ini
                  const historySessions = (s.assessment_sessions || []).filter(
                    (sess) => (phaseFilter === "all" || sess.phase === phaseFilter) && sess.phase !== activePhase
                  );

                  // Group by phase
                  const groupedSessions: Record<string, any[]> = {};
                  historySessions.forEach(sess => {
                    if (!groupedSessions[sess.phase]) groupedSessions[sess.phase] = [];
                    groupedSessions[sess.phase].push(sess);
                  });

                  // Jika sedang melihat "semua histori" tapi anak ini ga punya historis fase lalu
                  if (phaseFilter === "all" && Object.keys(groupedSessions).length === 0) {
                     return null; // hide row
                  }

                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "0.2rem" }}>{s.full_name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          NISN: {s.nisn || "-"}
                        </div>
                      </td>
                      <td>
                        {s.classes ? (
                          <Badge variant="info">
                            Kelas {s.classes.grade} - {s.classes.name}
                          </Badge>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic" }}>Tanpa Kelas</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {Object.keys(groupedSessions).sort((a,b) => b.localeCompare(a)).map(phaseKey => (
                            <div key={phaseKey} style={{ background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "0.375rem", border: "1px solid #e2e8f0" }}>
                              <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#334155", marginBottom: "0.4rem" }}>{phaseKey}</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                {groupedSessions[phaseKey].map(sess => (
                                  <div 
                                    key={sess.id} 
                                    className={`badge ${sess.status === "completed" ? "badge-success" : "badge-warning"}`}
                                    style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", padding: "0.2rem 0.5rem" }}
                                  >
                                    <span>{sess.question_categories?.subject_area === 'literasi' ? '📖 Literasi' : '🔢 Numerasi'}</span>
                                    <span style={{ fontSize: "0.7rem", marginTop: "0.15rem", opacity: 0.9 }}>
                                      Level: {sess.current_level?.level_number || 0}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
