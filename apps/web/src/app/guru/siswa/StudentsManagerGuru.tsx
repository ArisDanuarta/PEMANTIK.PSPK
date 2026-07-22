"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { Button, Badge, useToast, useConfirm } from "@pemantik/ui";
import { resetStudentPasswordAction } from "@/app/actions/students";
import Link from "next/link";

interface StudentRow {
  id: string;
  full_name: string;
  nisn: string | null;
  gender: string | null;
  birth_date: string | null;
  username: string | null;
  is_active: boolean;
  ses_class: string | null;
  classes: { id: string; name: string; grade: number } | null;
  active_sessions?: any[];
}

interface ClassOption { id: string; name: string; grade: number; }

interface Props {
  initialStudents: StudentRow[];
  classes: ClassOption[];
  schoolId: string;
  activePhase: string;
}

export default function StudentsManagerGuru({ initialStudents, classes, schoolId, activePhase }: Props) {
  const [students, setStudents] = useState<StudentRow[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { success: showSuccess, error: showError } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => { setMounted(true); }, []);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.nisn ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.username ?? "").toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === "all" || s.classes?.id === classFilter;
      const matchGender = genderFilter === "all" || s.gender === genderFilter;
      return matchSearch && matchClass && matchGender;
    });
  }, [students, search, classFilter, genderFilter]);

  const handleResetPassword = async (s: StudentRow) => {
    const ok = await confirm({
      title: "Reset PIN Anak",
      description: `PIN akses "${s.full_name}" akan direset ke PIN default "123456". Lanjutkan?`,
      confirmLabel: "Ya, Reset",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await resetStudentPasswordAction(s.id);
      if (res.success) {
        showSuccess("Berhasil", res.message ?? "PIN direset ke default (123456).");
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  if (!mounted) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Controls ── */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Cari nama atau NISN..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              style={{ flex: 1, minWidth: "200px", maxWidth: "300px" }} 
            />
            <select className="form-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ width: "180px" }}>
              <option value="all">Semua Kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>Kelas {c.grade} - {c.name}</option>)}
            </select>
            <select className="form-input" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={{ width: "150px" }}>
              <option value="all">Semua Gender</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div>
            <Link href="/guru/siswa/riwayat">
              <Button variant="outline" style={{ color: "#0874aa", borderColor: "#0874aa", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Riwayat Fase Ujian
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Data List / Table ── */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center" }}>
            Fase Ujian Aktif: <span style={{ marginLeft: "0.5rem" }}><Badge variant="primary">{activePhase}</Badge></span>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="pemantik-table">
            <thead>
              <tr>
                <th>Nama Lengkap</th>
                <th>Kelas</th>
                <th>Fase Ujian</th>
                <th>Progres / Jenis Ujian</th>
                <th style={{ textAlign: "center", width: "120px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                    Tidak ada data anak.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "0.2rem" }}>{s.full_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        NISN: {s.nisn || "-"} | {s.gender === "L" ? "Laki-laki" : "Perempuan"}
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
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.85rem" }}>{activePhase}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {s.active_sessions && s.active_sessions.length > 0 ? (
                          s.active_sessions.map((sess: any) => (
                            <div 
                              key={sess.id} 
                              className={`badge ${sess.status === "completed" ? "badge-success" : "badge-warning"}`}
                              style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", padding: "0.3rem 0.5rem" }}
                            >
                              <span>{sess.question_categories?.subject_area === 'literasi' ? '📖 Literasi' : '🔢 Numerasi'}</span>
                              <span style={{ fontSize: "0.7rem", marginTop: "0.15rem", opacity: 0.9 }}>
                                Level Terakhir: {sess.current_level?.level_number || 0}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic" }}>Belum mulai ujian</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Button
                        size="sm"
                        variant="outline"
                        style={{ color: "#f59e0b", borderColor: "#f59e0b" }}
                        onClick={() => handleResetPassword(s)}
                        disabled={isPending}
                      >
                        Reset PIN
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", fontSize: "0.85rem", color: "#64748b" }}>
          Menampilkan {filtered.length} dari total {students.length} siswa. PIN Default setelah reset adalah <strong>123456</strong>.
        </div>
      </div>
    </div>
  );
}
