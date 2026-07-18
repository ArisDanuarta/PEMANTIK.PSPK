"use client";

import React, { useState } from "react";
import { Button, Badge, useToast } from "@pemantik/ui";
import BulkUploadModal from "@/components/shared/BulkUploadModal";
import { parseDapodikAction, importDapodikAction } from "@/app/actions/schools";
import { useRouter } from "next/navigation";

interface SchoolStatus {
  id: string;
  name: string;
  npsn?: string | null;
  province?: string | null;
  city?: string | null;
  dapodik_imported_at?: string | null;
  import_source?: string | null;
  students_count: number;
  teachers_count: number;
  classes_count: number;
}

interface DapodikKomunitasClientProps {
  schools: SchoolStatus[];
  communityId: string;
  communityName: string;
}

export default function DapodikKomunitasClient({ schools, communityId, communityName }: DapodikKomunitasClientProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [isDapodikModalOpen, setIsDapodikModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.npsn?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const totalStudentsAll = schools.reduce((acc, s) => acc + s.students_count, 0);
  const totalClassesAll = schools.reduce((acc, s) => acc + s.classes_count, 0);
  const schoolsImportedCount = schools.filter(s => Boolean(s.dapodik_imported_at)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Banner & Petunjuk Utama */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "1.25rem",
        padding: "2rem",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexWrap: "wrap",
        gap: "2rem",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ flex: "1 1 420px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <h2 style={{ fontFamily: "Lora, serif", fontSize: "1.35rem", fontWeight: 700, color: "#102e50", margin: 0 }}>
              Pusat Sinkronisasi Dapodik Sekolah Binaan
            </h2>
          </div>
          <p style={{ color: "#4b5563", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 1.25rem 0" }}>
            Unggah file ekspor Dapodik (Excel) sekolah di bawah naungan <strong>{communityName}</strong>. Sistem akan secara otomatis:
          </p>
          <ul style={{ color: "#334155", fontSize: "0.88rem", lineHeight: 1.7, margin: 0, paddingLeft: "1.35rem" }}>
            <li><strong>Mendaftarkan Sekolah Baru</strong> (atau memutakhirkan sekolah yang sudah ada)</li>
            <li><strong>Membuat Akun Admin Sekolah</strong> dengan format <code style={{ backgroundColor: "#f1f5f9", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>sch_[NPSN]</code> & sandi default <code style={{ backgroundColor: "#f1f5f9", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>Password123!</code></li>
            <li><strong>Membentuk Daftar Rombel / Kelas</strong> secara otomatis</li>
            <li><strong>Menghasilkan Akun Anak</strong> siap pakai untuk mengikuti asesmen Literasi & Numerasi</li>
          </ul>
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          minWidth: "260px",
          backgroundColor: "#f8fafc",
          padding: "1.5rem",
          borderRadius: "1rem",
          border: "1px solid #cbd5e1"
        }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
            Aksi Cepat
          </div>
          <Button
            onClick={() => setIsDapodikModalOpen(true)}
            style={{
              backgroundColor: "#102e50",
              color: "white",
              padding: "0.85rem 1.25rem",
              borderRadius: "0.75rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              fontSize: "0.95rem"
            }}
          >
            Upload Data Dapodik Baru
          </Button>
          <div style={{ fontSize: "0.75rem", color: "#64748b", textAlign: "center" }}>
            Dapat memilih pembuatan sekolah baru atau re-sinkronisasi sekolah eksisting.
          </div>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.25rem"
      }}>
        <div style={{ backgroundColor: "white", padding: "1.25rem 1.5rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>TOTAL SEKOLAH BINAAN</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#102e50", marginTop: "0.35rem" }}>{schools.length} Sekolah</div>
        </div>
        <div style={{ backgroundColor: "white", padding: "1.25rem 1.5rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>SEKOLAH SINKRON DAPODIK</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#059669", marginTop: "0.35rem" }}>{schoolsImportedCount} / {schools.length}</div>
        </div>
        <div style={{ backgroundColor: "white", padding: "1.25rem 1.5rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>TOTAL ROMBEL / KELAS</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#d97706", marginTop: "0.35rem" }}>{totalClassesAll} Kelas</div>
        </div>
        <div style={{ backgroundColor: "white", padding: "1.25rem 1.5rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>TOTAL ANAK TERGENERATE</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#2563eb", marginTop: "0.35rem" }}>{totalStudentsAll} Anak</div>
        </div>
      </div>

      {/* Tabel Status Dapodik Sekolah */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#102e50", margin: 0 }}>
              Status Dapodik & Akun Anak per Sekolah
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
              Pantau jumlah kelas dan akun anak yang terbentuk dari pemindai Dapodik
            </p>
          </div>
          <input
            type="text"
            placeholder="Cari nama sekolah atau NPSN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ maxWidth: "280px" }}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="pemantik-table">
            <thead>
              <tr>
                <th>Nama Sekolah & NPSN</th>
                <th>Wilayah</th>
                <th>Jumlah Kelas</th>
                <th>Akun Anak</th>
                <th>Akun Guru</th>
                <th>Status Dapodik</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                    Belum ada sekolah binaan yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((s) => {
                  const isImported = Boolean(s.dapodik_imported_at);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#102e50" }}>{s.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>NPSN: {s.npsn || "-"}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.85rem", color: "#334155" }}>{s.city || s.province || "-"}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#d97706" }}>{s.classes_count} Kelas</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#2563eb" }}>{s.students_count} Anak</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#059669" }}>{s.teachers_count} Guru</div>
                      </td>
                      <td>
                        {isImported ? (
                          <div>
                            <Badge variant="success">Sudah Diimpor</Badge>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                              {new Date(s.dapodik_imported_at!).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              })}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="warning">Belum / Manual</Badge>
                        )}
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          onClick={() => setIsDapodikModalOpen(true)}
                          style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", color: "#0369a1", borderColor: "#7dd3fc" }}
                        >
                          Sync Dapodik
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Import Dapodik */}
      {isDapodikModalOpen && (
        <BulkUploadModal
          mode="dapodik"
          title="Upload & Import File Dapodik"
          templateFileName="template_dapodik"
          templateHeaders={[]}
          onClose={() => {
            setIsDapodikModalOpen(false);
            router.refresh();
          }}
          onUpload={async () => ({ success: false })}
          existingSchools={schools.map(s => ({ id: s.id, name: s.name, npsn: s.npsn || null }))}
          onDapodikParse={async (formData) => {
            const result = await parseDapodikAction(formData);
            return result;
          }}
          onDapodikConfirm={async (payload) => {
            const result = await importDapodikAction(payload);
            return result;
          }}
          onPollStatus={async (batchId) => {
            const res = await fetch(`/api/dapodik-import/${batchId}`);
            if (!res.ok) throw new Error("Polling gagal");
            return res.json();
          }}
        />
      )}
    </div>
  );
}
