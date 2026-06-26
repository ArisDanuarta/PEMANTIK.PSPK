"use client";

import React, { useState, useTransition } from "react";
import { Button, useToast, useConfirm } from "@pemantik/ui";

interface PackageOption { id: string; name: string; subject_area: string; }
interface ClassOption { id: string; name: string; grade: number; students: { count: number }[]; }
interface StudentOption { id: string; name: string; class_id: string; }

interface Props {
  packages: PackageOption[];
  classes: ClassOption[];
  students: StudentOption[];
  schoolId: string;
  hasCommunity?: boolean;
}

export default function AksesUjianSekolahClient({ packages, classes, students, schoolId, hasCommunity }: Props) {
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [isPending, startTransition] = useTransition();
  const { success: showSuccess, error: showError, info: showInfo } = useToast();
  const { confirm } = useConfirm();

  const handleUjianUlang = async () => {
    if (!selectedPackageId || !selectedClassId) {
      showInfo("Lengkapi Pilihan", "Pilih kategori ujian dan kelas terlebih dahulu.");
      return;
    }

    const pkg = packages.find((p) => p.id === selectedPackageId);
    const cls = classes.find((c) => c.id === selectedClassId);
    const std = students.find((s) => s.id === selectedStudentId);

    const targetName = std ? `siswa "${std.name}"` : `seluruh kelas "${cls?.name}"`;

    const ok = await confirm({
      title: "Ijinkan Ujian Ulang",
      description: `Ini akan me-void semua sesi ujian aktif pada ${targetName} untuk kategori "${pkg?.name}", sehingga bisa mengulang dari awal. Apakah Anda yakin?`,
      confirmLabel: "Ya, Buka Ujian Ulang",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/sekolah/ujian-ulang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            class_id: selectedClassId,
            student_id: selectedStudentId || undefined,
            category_id: selectedPackageId,
            school_id: schoolId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Server error");
        showSuccess(
          "Ujian Ulang Diaktifkan",
          `${data.voidedCount ?? 0} sesi lama di-void. ${std ? `Siswa "${std.name}"` : `Kelas "${cls?.name}"`} kini bisa mengulang ujian.`
        );
        setSelectedPackageId("");
        setSelectedClassId("");
        setSelectedStudentId("");
      } catch (err: any) {
        showError("Gagal", err.message || "Terjadi kesalahan.");
      }
    });
  };

  const subjectColor = (subject: string) =>
    subject === "literasi" ? "#2d9e5f" : subject === "numerasi" ? "#0874aa" : "#6c757d";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Info Kategori ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#102e50", margin: 0 }}>
            Kategori Ujian Tersedia
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#6c757d", margin: "0.25rem 0 0" }}>
            Daftar kategori ujian yang diberikan oleh Superadmin atau Komunitas untuk sekolah ini. Seluruh kelas dapat mengakses kategori di bawah ini.
          </p>
        </div>
        {packages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "0.5rem", border: "1px dashed #d1d5db", margin: "1rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔒</div>
            <strong style={{ display: "block", marginBottom: "0.25rem" }}>Belum diberikan akses ujian</strong>
            {hasCommunity 
              ? "Sekolah Anda belum diberikan akses kategori ujian oleh Komunitas Induk."
              : "Sekolah Anda belum diberikan akses kategori ujian oleh Superadmin."}
          </div>
        ) : (
          <table className="pemantik-table" style={{ width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left", color: "#4b5563" }}>
                <th style={{ padding: "0.75rem 1.5rem" }}>Nama Kategori</th>
                <th style={{ padding: "0.75rem 1.5rem" }}>Jenis Asesmen</th>
                <th style={{ padding: "0.75rem 1.5rem" }}>Fase Ujian</th>
                <th style={{ padding: "0.75rem 1.5rem" }}>Rentang Waktu Valid</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg: any) => (
                <tr key={pkg.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem 1.5rem", fontWeight: 600, color: "#102e50" }}>{pkg.name}</td>
                  <td style={{ padding: "0.75rem 1.5rem" }}>
                    <span style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "1rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      backgroundColor: `${subjectColor(pkg.subject_area)}15`,
                      color: subjectColor(pkg.subject_area),
                      textTransform: "capitalize",
                    }}>
                      {pkg.subject_area}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1.5rem" }}>
                    <span style={{ padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, border: "1px solid #e5e7eb", backgroundColor: "transparent", color: "#374151" }}>{pkg.phase || "—"}</span>
                  </td>
                  <td style={{ padding: "0.75rem 1.5rem", fontSize: "0.85rem", color: "#4b5563" }}>
                    {pkg.valid_from ? new Date(pkg.valid_from).toLocaleDateString('id-ID') : "—"} - {pkg.valid_until ? new Date(pkg.valid_until).toLocaleDateString('id-ID') : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Form Ujian Ulang ── */}
      {packages.length > 0 && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#102e50", marginBottom: "0.5rem" }}>
            Ujian Ulang Kelas
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#6c757d", marginBottom: "1.25rem" }}>
            Gunakan fitur ini jika terdapat kendala teknis dan siswa dalam suatu kelas perlu mengulang ujian dari awal. Fitur ini akan me-reset seluruh progres ujian aktif pada kelas tersebut.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "1rem", alignItems: "flex-end" }}>
            <div>
              <label className="form-label">Kategori Ujian</label>
              <select className="form-input" value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}>
                <option value="">— Pilih Kategori —</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.subject_area})</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Kelas</label>
              <select className="form-input" value={selectedClassId} onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedStudentId(""); // reset student when class changes
              }}>
                <option value="">— Pilih Kelas —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.grade} — {c.name} ({c.students?.[0]?.count ?? 0} siswa)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Siswa (Opsional)</label>
              <select 
                className="form-input" 
                value={selectedStudentId} 
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={!selectedClassId}
              >
                <option value="">— Semua Siswa di Kelas —</option>
                {students
                  .filter((s) => s.class_id === selectedClassId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
            </div>
            <Button
              onClick={handleUjianUlang}
              disabled={isPending || !selectedPackageId || !selectedClassId}
              style={{ backgroundColor: "#dc2626", color: "white", height: "40px", borderColor: "#dc2626" }}
            >
              {isPending ? <span className="btn-spinner" /> : "🔄 Buka Ujian Ulang"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
