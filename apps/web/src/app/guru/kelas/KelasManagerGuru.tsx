"use client";

import React, { useState } from "react";
import { Button, useToast, DataTable, ColumnDef } from "@pemantik/ui";

interface ClassOption {
  id: string;
  name: string;
  grade: number;
  academic_year: string;
  student_count: number;
}

interface Props {
  classes: ClassOption[];
}

export default function KelasManagerGuru({ classes }: Props) {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  const handleDownload = async (classId: string, className: string) => {
    setIsExporting(classId);
    try {
      const url = new URL(window.location.origin + "/api/export/detailed-results");
      url.searchParams.append("category_id", "all");
      url.searchParams.append("target_type", "teacher");
      url.searchParams.append("target_id", "all");
      url.searchParams.append("class_id", classId);

      const response = await fetch(url.toString());
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error || "Server error");
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const json = await response.json();
        if (json.data && json.data.length === 0) {
          showError("Data Kosong", "Belum ada data ujian untuk kelas ini.");
          return;
        }
        throw new Error(json.error || "Terjadi kesalahan pada server");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Hasil_Ujian_${className.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showSuccess("Berhasil", `Laporan untuk kelas ${className} berhasil diunduh.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh data.";
      showError("Gagal Export", msg);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#102e50", margin: 0 }}>
            Daftar Kelas Saya
          </h2>
          <p style={{ fontSize: "0.85rem", color: "black", margin: "0.25rem 0 0" }}>
            Ini adalah daftar kelas yang ditugaskan kepada Anda oleh Admin Sekolah. Anda hanya bisa mengelola siswa di dalam kelas-kelas ini.
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Belum ada kelas</div>
            <div className="empty-state-desc">Belum ada kelas yang ditugaskan kepada Anda. Hubungi Admin Sekolah Anda.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
          {(() => {
            const columns: ColumnDef<any>[] = [
              {
                key: "name",
                label: "Nama Kelas",
                sortable: true,
                render: (_: any, cls: any) => (
                  <span style={{ fontWeight: 600, color: "#102e50" }}>{cls.name}</span>
                )
              },
              {
                key: "grade",
                label: "Tingkat (Grade)",
                sortable: true,
                render: (_: any, cls: any) => `Kelas ${cls.grade}`
              },
              {
                key: "academic_year",
                label: "Tahun Ajaran",
                sortable: true
              },
              {
                key: "student_count",
                label: "Jumlah Anak",
                sortable: true,
                render: (_: any, cls: any) => `${cls.student_count} Anak`
              },
              {
                key: "actions",
                label: "Aksi",
                align: "center",
                render: (_: any, cls: any) => (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    style={{ color: "#059669", borderColor: "#34d399", minWidth: "140px" }}
                    onClick={() => handleDownload(cls.id, cls.name)}
                    disabled={isExporting === cls.id}
                  >
                    {isExporting === cls.id ? "Menyiapkan..." : "Unduh Laporan"}
                  </Button>
                )
              }
            ];

            return <DataTable columns={columns} data={classes} />;
          })()}
          </div>
        )}
      </div>
    </div>
  );
}
