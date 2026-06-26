"use client";

import React, { useState } from "react";
import { Button, Badge } from "@pemantik/ui";
import AssignPackageModal from "@/components/shared/AssignPackageModal";
import { assignCommunityPackageToSchool } from "../../actions/assessment";

interface AksesUjianKomunitasClientProps {
  packages: any[];
  targets: any[];
  accessLogs: any[];
  communityId: string;
}

export default function AksesUjianKomunitasClient({ packages, targets, accessLogs, communityId }: AksesUjianKomunitasClientProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleAssignSubmit = async (data: any) => {
    setErrorMsg("");
    setSuccessMsg("");
    
    const result = await assignCommunityPackageToSchool({
      categoryIds: data.packageIds,
      schoolId: data.targetId,
      communityId: communityId,
    });

    if (result.success) {
      setSuccessMsg("Penugasan kategori ujian ke sekolah berhasil ditambahkan.");
    }
    
    return result;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {errorMsg && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "0.5rem", border: "1px solid #fca5a5" }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: "1rem", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "0.5rem", border: "1px solid #bbf7d0" }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div>
          <h3 style={{ margin: 0, color: "#102e50", fontSize: "1.1rem" }}>Distribusi Kategori Ujian ke Sekolah</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Tugaskan kategori ujian yang telah disetujui oleh Super Admin kepada sekolah-sekolah dalam naungan Anda.
          </p>
        </div>
        <Button onClick={() => setIsAssignModalOpen(true)} style={{ backgroundColor: "#102e50", color: "white" }} disabled={packages.length === 0}>
          + Berikan Akses ke Sekolah
        </Button>
      </div>

      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflowX: "auto" }}>
        <h4 style={{ margin: 0, color: "#102e50", marginBottom: "1rem" }}>Kategori Ujian dari Superadmin</h4>
        {packages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "0.5rem", border: "1px dashed #d1d5db" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔒</div>
            <strong style={{ display: "block", marginBottom: "0.25rem" }}>Belum diberikan akses ujian</strong>
            Superadmin belum memberikan akses ujian apapun ke komunitas ini.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left", color: "#4b5563" }}>
                <th style={{ padding: "0.75rem 0.5rem" }}>Nama Kategori</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Jenis Asesmen</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Fase Ujian</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Rentang Waktu Valid</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "#102e50" }}>{pkg.name}</td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>{pkg.subject_area?.toUpperCase()}</td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <span style={{ padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, border: "1px solid #e5e7eb", backgroundColor: "transparent", color: "#374151" }}>{pkg.phase || "—"}</span>
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "#4b5563" }}>
                    {pkg.valid_from ? new Date(pkg.valid_from).toLocaleDateString('id-ID') : "—"} - {pkg.valid_until ? new Date(pkg.valid_until).toLocaleDateString('id-ID') : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h4 style={{ margin: 0, color: "#102e50" }}>Riwayat Penugasan ke Sekolah</h4>
          <input
            type="text"
            placeholder="Cari sekolah atau kategori ujian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #d1d5db",
              width: "100%",
              maxWidth: "300px",
              fontSize: "0.9rem"
            }}
          />
        </div>
        
        {accessLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
            Belum ada kategori yang didistribusikan ke sekolah.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left", color: "#4b5563" }}>
                <th style={{ padding: "0.75rem 0.5rem" }}>Tanggal</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Sekolah (Target)</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Kategori Ujian</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Fase Ujian</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Rentang Waktu Valid</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {accessLogs.filter(log => {
                if (!searchQuery) return true;
                const lowerQuery = searchQuery.toLowerCase();
                const targetMatch = (log.target_name || "").toLowerCase().includes(lowerQuery);
                const packageMatch = (log.question_categories?.name || "").toLowerCase().includes(lowerQuery);
                const phaseMatch = (log.phase || "").toLowerCase().includes(lowerQuery);
                return targetMatch || packageMatch || phaseMatch;
              }).map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    {new Date(log.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem", fontWeight: 500, color: "#102e50" }}>
                    {log.target_name}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    {log.question_categories?.name} 
                    <span style={{ display: "block", fontSize: "0.8rem", color: "#6b7280" }}>
                      ({log.question_categories?.subject_area?.toUpperCase()})
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <span style={{ padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, border: "1px solid #e5e7eb", backgroundColor: "transparent", color: "#374151" }}>{log.phase}</span>
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "#4b5563" }}>
                    {new Date(log.valid_from).toLocaleDateString('id-ID')} - {new Date(log.valid_until).toLocaleDateString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AssignPackageModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        role="community"
        packages={packages}
        schools={targets}
        onSubmit={handleAssignSubmit}
      />
    </div>
  );
}
