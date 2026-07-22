"use client";

import React, { useState, useTransition } from "react";
import { Badge, Button, useToast, useConfirm } from "@pemantik/ui";
import { reviewPhaseRequestAction } from "@/app/actions/phaseRequests";
import { useRouter } from "next/navigation";

interface PersetujuanSuperAdminClientProps {
  initialRequests: any[];
  schools: { id: string; name: string; npsn: string | null }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PersetujuanSuperAdminClient({
  initialRequests,
  schools,
}: PersetujuanSuperAdminClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectingReq, setRejectingReq] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, startTransition] = useTransition();

  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { confirm } = useConfirm();

  const schoolMap = React.useMemo(() => {
    const map = new Map<string, string>();
    schools.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [schools]);

  const filteredRequests = initialRequests.filter((req) => {
    const isPending = req.status === "pending";
    if (activeTab === "pending" && !isPending) return false;
    if (activeTab === "history" && isPending) return false;

    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const commName = (req.communities?.name || "").toLowerCase();
    const catName = (req.question_categories?.name || "").toLowerCase();
    const phaseName = (req.phase || "").toLowerCase();
    return commName.includes(q) || catName.includes(q) || phaseName.includes(q);
  });

  const handleApprove = async (req: any) => {
    const ok = await confirm({
      title: "Setujui Pengajuan Fase?",
      description: `Anda akan membuka akses fase "${req.phase}" untuk ${req.target_school_ids?.length || 0} sekolah yang diajukan oleh "${req.communities?.name || "Komunitas"}". Akses dan timeline asesmen akan otomatis aktif.`,
      confirmLabel: "Ya, Setujui & Buka Akses",
      cancelLabel: "Batal",
      variant: "info",
    });

    if (!ok) return;

    startTransition(async () => {
      try {
        const res = await reviewPhaseRequestAction(req.id, "approved");
        if (res.success) {
          showSuccessToast("Berhasil Disetujui", `Akses fase "${req.phase}" telah didistribusikan ke sekolah target.`);
          router.refresh();
        } else {
          showErrorToast("Gagal", res.error || "Gagal memproses persetujuan.");
        }
      } catch (err: any) {
        showErrorToast("Error", err.message || "Terjadi kesalahan sistem.");
      }
    });
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq) return;
    if (!rejectionReason.trim()) {
      showErrorToast("Peringatan", "Harap masukkan alasan penolakan agar komunitas dapat memperbaikinya.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await reviewPhaseRequestAction(rejectingReq.id, "rejected", rejectionReason.trim());
        if (res.success) {
          showSuccessToast("Ditolak", "Pengajuan fase telah ditolak dan notifikasi dikirim ke komunitas.");
          setRejectingReq(null);
          setRejectionReason("");
          router.refresh();
        } else {
          showErrorToast("Gagal", res.error || "Gagal menolak pengajuan.");
        }
      } catch (err: any) {
        showErrorToast("Error", err.message || "Terjadi kesalahan sistem.");
      }
    });
  };

  const pendingCount = initialRequests.filter((r) => r.status === "pending").length;
  const historyCount = initialRequests.filter((r) => r.status !== "pending").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner & Filter */}
      <div style={{
        backgroundColor: "white", padding: "1.25rem 1.5rem", borderRadius: "1rem",
        border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem"
      }}>
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid transparent" }}>
          <button
            onClick={() => setActiveTab("pending")}
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: "none",
              backgroundColor: activeTab === "pending" ? "#102e50" : "transparent",
              color: activeTab === "pending" ? "white" : "#4b5563",
              fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            Menunggu Persetujuan ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: "none",
              backgroundColor: activeTab === "history" ? "#102e50" : "transparent",
              color: activeTab === "history" ? "white" : "#4b5563",
              fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            Riwayat Peninjauan ({historyCount})
          </button>
        </div>

        <input
          type="text"
          placeholder="Cari komunitas, kategori, atau fase..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "0.55rem 1rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.88rem", width: "300px" }}
        />
      </div>

      {/* Main Table Card */}
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
        {filteredRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "0.75rem", border: "1px dashed #e5e7eb" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}>
              {activeTab === "pending" ? "" : ""}
            </div>
            <h4 style={{ margin: "0 0 0.25rem 0", color: "#374151" }}>
              {activeTab === "pending" ? "Tidak Ada Pengajuan Pending" : "Belum Ada Riwayat Persetujuan"}
            </h4>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
              {activeTab === "pending"
                ? "Semua pengajuan fase dari komunitas sudah ditinjau atau belum ada pengajuan masuk."
                : "Belum ada pengajuan fase yang disetujui atau ditolak sebelumnya."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="pemantik-table">
              <thead>
                <tr>
                  <th>Komunitas Pengaju</th>
                  <th>Kategori &amp; Fase</th>
                  <th>Daftar Sekolah Target</th>
                  <th>Rentang Valid</th>
                  <th>Status / Ditinjau</th>
                  {activeTab === "pending" && <th style={{ textAlign: "center" }}>Aksi Peninjauan</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#102e50", fontSize: "0.95rem" }}>
                        {req.communities?.name || "Komunitas"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.15rem" }}>
                        Diajukan: {formatDate(req.created_at)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#111827" }}>
                        {req.question_categories?.name || req.category_id}
                      </div>
                      <div style={{ marginTop: "0.25rem" }}>
                        <span style={{ padding: "0.18rem 0.55rem", backgroundColor: "#f3f4f6", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, border: "1px solid #e5e7eb", color: "#374151" }}>
                          {req.phase}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", maxWidth: "280px" }}>
                        {(req.target_school_ids || []).map((sid: string) => (
                          <span key={sid} style={{ padding: "0.15rem 0.45rem", backgroundColor: "#e0f2fe", color: "#0369a1", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: 500 }}>
                            {schoolMap.get(sid) || sid}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                      {formatDate(req.valid_from)} &ndash; {formatDate(req.valid_until)}
                    </td>
                    <td>
                      {req.status === "approved" ? (
                        <div>
                          <Badge variant="success">✅ Disetujui</Badge>
                          {req.reviewed_at && <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem" }}>{formatDate(req.reviewed_at)}</div>}
                        </div>
                      ) : req.status === "rejected" ? (
                        <div>
                          <Badge variant="danger">❌ Ditolak</Badge>
                          {req.rejection_reason && (
                            <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.25rem", maxWidth: "200px" }}>
                              Alasan: {req.rejection_reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="warning">⏳ Pending / Menunggu</Badge>
                      )}
                    </td>
                    {activeTab === "pending" && (
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                          <Button
                            size="sm"
                            style={{ backgroundColor: "#2d9e5f", color: "white" }}
                            onClick={() => handleApprove(req)}
                            disabled={isSubmitting}
                          >
                            Setujui ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => { setRejectingReq(req); setRejectionReason(""); }}
                            disabled={isSubmitting}
                          >
                            Tolak ✗
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tolak Pengajuan */}
      {rejectingReq && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "1rem", padding: "1.75rem",
            width: "100%", maxWidth: "460px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#991b1b", fontSize: "1.15rem" }}>
              ❌ Tolak Pengajuan Fase "{rejectingReq.phase}"
            </h3>
            <p style={{ margin: "0 0 1.25rem 0", color: "#6b7280", fontSize: "0.85rem" }}>
              Berikan alasan penolakan yang jelas agar admin komunitas <strong>"{rejectingReq.communities?.name || "Komunitas"}"</strong> dapat memperbaiki pengajuannya.
            </p>

            <form onSubmit={handleRejectSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                  Alasan Penolakan <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Tanggal validasi terlalu dekat, atau sekolah target masih dalam tahap persiapan asesmen sebelumnya..."
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.88rem" }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingReq(null)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={isSubmitting || !rejectionReason.trim()}
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi Tolak Pengajuan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
