"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { Button, Badge, useToast, useConfirm } from "@pemantik/ui";
import { resetStudentPasswordAction } from "@/app/actions/students";

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
}

interface ClassOption { id: string; name: string; grade: number; }

interface Props {
  initialStudents: StudentRow[];
  classes: ClassOption[];
  schoolId: string;
}

export default function StudentsManagerGuru({ initialStudents, classes, schoolId }: Props) {
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
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Cari nama, NISN, atau username..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ flex: 1, minWidth: "200px", maxWidth: "300px" }} 
          />
          <select className="form-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ width: "180px" }}>
            <option value="all">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>Kelas {c.grade} — {c.name}</option>)}
          </select>
          <select className="form-input" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={{ width: "150px" }}>
            <option value="all">Semua Gender</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
      </div>

      {/* ── Data List / Table ── */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="pemantik-table">
            <thead>
              <tr>
                <th>Nama Lengkap</th>
                <th>Kelas</th>
                <th>Kredensial Login</th>
                <th style={{ textAlign: "center", width: "120px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
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
                          Kelas {s.classes.grade} — {s.classes.name}
                        </Badge>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic" }}>Tanpa Kelas</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.85rem" }}>
                        <div><strong>Username:</strong> <code style={{ backgroundColor: "#f1f5f9", padding: "0.1rem 0.3rem", borderRadius: "0.25rem", color: "#0f172a" }}>{s.username}</code></div>
                        <div style={{ color: "#64748b" }}><strong>Password/PIN:</strong> <em>Terenkripsi</em></div>
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
