"use client";

import React, { useState, useTransition } from "react";
import { Button, Badge } from "@pemantik/ui";
import AssignPackageModal from "@/components/shared/AssignPackageModal";
import {
  assignCommunityPackageToSchool,
  distributeAccessToSchools,
} from "../../actions/assessment";
import { submitPhaseRequestAction } from "../../actions/phaseRequests";
import { useRouter } from "next/navigation";

interface AccessEntry {
  id: string;
  category_id: string;
  name: string;
  subject_area: string;
  phase: string;
  valid_from: string;
  valid_until: string;
}

interface School {
  id: string;
  name: string;
  npsn?: string;
}

interface AccessLog {
  id: string;
  target_id: string;
  target_name: string;
  phase: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
  question_categories?: { name: string; subject_area: string };
}

interface Props {
  packages: any[];
  /** communityAccesses = baris assessment_access milik komunitas ini (type=community) */
  communityAccesses: AccessEntry[];
  targets: School[];
  accessLogs: AccessLog[];
  communityId: string;
  allCategories?: any[];
  phaseRequests?: any[];
  canSubmitRequest?: boolean;
}

type Toast = { type: "success" | "error"; message: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isExpired(validUntil: string) {
  const d = new Date(validUntil);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}

export default function AksesUjianKomunitasClient({
  packages,
  communityAccesses,
  targets,
  accessLogs,
  communityId,
  allCategories = [],
  phaseRequests = [],
  canSubmitRequest = false,
}: Props) {
  const router = useRouter();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  // Form Request State
  const [reqCategoryId, setReqCategoryId] = useState("");
  const [reqPhase, setReqPhase] = useState("Fase B");
  const [reqTargetSchools, setReqTargetSchools] = useState<string[]>([]);
  const [reqValidFrom, setReqValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [reqValidUntil, setReqValidUntil] = useState(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [reqSubmitting, setReqSubmitting] = useState(false);

  // Distribusi massal per access entry
  const [distributingId, setDistributingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSubmitPhaseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqCategoryId) {
      showToast("error", "Pilih kategori ujian terlebih dahulu.");
      return;
    }
    if (reqTargetSchools.length === 0) {
      showToast("error", "Pilih minimal 1 sekolah target.");
      return;
    }
    setReqSubmitting(true);
    try {
      const res = await submitPhaseRequestAction({
        categoryId: reqCategoryId,
        phase: reqPhase,
        targetSchoolIds: reqTargetSchools,
        validFrom: new Date(reqValidFrom).toISOString(),
        validUntil: new Date(reqValidUntil).toISOString(),
      });
      if (!res.success) {
        showToast("error", res.error || "Gagal mengajukan fase");
      } else {
        showToast("success", "Pengajuan fase berhasil dikirim ke Super Admin!");
        setIsRequestModalOpen(false);
        setReqTargetSchools([]);
        router.refresh();
      }
    } catch (err: any) {
      showToast("error", err.message || "Terjadi kesalahan sistem");
    } finally {
      setReqSubmitting(false);
    }
  };

  // ── Distribusi per-akses ke SEMUA sekolah ─────────────────────────────────
  const handleDistributeAll = (access: AccessEntry) => {
    setDistributingId(access.id);
    startTransition(async () => {
      const result = await distributeAccessToSchools(
        access.id,
        ["all"],
        communityId
      );
      setDistributingId(null);

      if (result.success) {
        if (result.distributed_to === 0) {
          showToast(
            "success",
            `Semua ${result.total_schools} sekolah sudah memiliki akses ujian "${access.name} — ${access.phase}".`
          );
        } else {
          showToast(
            "success",
            `✅ Berhasil! ${result.distributed_to} sekolah baru mendapat akses "${access.name} — ${access.phase}".` +
              (result.skipped && result.skipped > 0
                ? ` (${result.skipped} sekolah dilewati karena sudah punya akses)`
                : "")
          );
        }
      } else {
        showToast("error", result.error ?? "Gagal mendistribusikan akses.");
      }
    });
  };

  // ── Manual assign via modal ────────────────────────────────────────────────
  const handleAssignSubmit = async (data: any) => {
    const result = await assignCommunityPackageToSchool({
      categoryIds: data.packageIds,
      schoolId: data.targetId,
      communityId,
    });

    if (result.success) {
      showToast("success", "Penugasan kategori ujian ke sekolah berhasil.");
    } else {
      showToast("error", result.error ?? "Gagal menugaskan.");
    }
    return result;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "0.5rem",
            fontSize: "0.9rem",
            fontWeight: 500,
            backgroundColor: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: toast.type === "success" ? "#166534" : "#b91c1c",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fca5a5"}`,
          }}
        >
          {toast.message}
        </div>
      )}

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "0.75rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: "#102e50", fontSize: "1.1rem" }}>
            Distribusi &amp; Pengajuan Fase Kategori Ujian
          </h3>
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
            Ajukan fase asesmen baru ke Super Admin atau distribusikan akses yang disetujui ke sekolah binaan Anda.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          {!canSubmitRequest && (
            <div
              style={{
                padding: "0.4rem 0.75rem",
                backgroundColor: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: "0.5rem",
                fontSize: "0.8rem",
                color: "#b45309",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span>🔒 Terkunci: Selesaikan Tahap 1 (Persiapan Akun) untuk mengajukan asesmen</span>
            </div>
          )}
          <Button
            onClick={() => {
              if (!canSubmitRequest) return;
              setIsRequestModalOpen(true);
            }}
            variant="secondary"
            disabled={!canSubmitRequest}
            title={
              !canSubmitRequest
                ? "Terkunci: Selesaikan Tahap 1 (Persiapan Akun) dan pastikan berada di Tahap 2 (Pengajuan Asesmen) untuk mengajukan asesmen baru."
                : "Ajukan fase asesmen baru ke Super Admin"
            }
            style={{
              borderColor: !canSubmitRequest ? "#d1d5db" : "#0874aa",
              color: !canSubmitRequest ? "#9ca3af" : "#0874aa",
              backgroundColor: !canSubmitRequest ? "#f3f4f6" : "transparent",
              fontWeight: 600,
              cursor: !canSubmitRequest ? "not-allowed" : "pointer",
            }}
          >
            {canSubmitRequest ? "✨ Pembuatan dan Pengajuan Asesmen" : "🔒 Pengajuan Terkunci (Tahap 2)"}
          </Button>
          <Button
            onClick={() => setIsAssignModalOpen(true)}
            style={{ backgroundColor: "#102e50", color: "white" }}
            disabled={packages.length === 0}
          >
            + Berikan Akses ke Sekolah
          </Button>
        </div>
      </div>

      {/* ── Daftar akses yang diterima dari Super Admin ───────────────────── */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "0.75rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflowX: "auto",
        }}
      >
        <h4 style={{ margin: "0 0 1rem", color: "#102e50" }}>
          Akses Ujian dari Super Admin
        </h4>

        {communityAccesses.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "#6b7280",
              backgroundColor: "#f9fafb",
              borderRadius: "0.5rem",
              border: "1px dashed #d1d5db",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔒</div>
            <strong style={{ display: "block", marginBottom: "0.25rem" }}>
              Belum diberikan akses ujian
            </strong>
            Super Admin belum memberikan akses ujian apapun ke komunitas ini.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #e5e7eb",
                  textAlign: "left",
                  color: "#4b5563",
                }}
              >
                <th style={{ padding: "0.75rem 0.5rem" }}>Nama Kategori</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Jenis</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Fase</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Rentang Valid</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Status</th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                  Distribusi Cepat
                </th>
              </tr>
            </thead>
            <tbody>
              {communityAccesses.map((acc) => {
                const expired = isExpired(acc.valid_until);
                const isThisDistributing = distributingId === acc.id;

                return (
                  <tr
                    key={acc.id}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontWeight: 600,
                        color: "#102e50",
                      }}
                    >
                      {acc.name}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151" }}>
                      {acc.subject_area?.toUpperCase()}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <span
                        style={{
                          padding: "0.2rem 0.65rem",
                          borderRadius: "9999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          border: "1px solid #e5e7eb",
                          color: "#374151",
                        }}
                      >
                        {acc.phase || "—"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "0.85rem",
                        color: expired ? "#9ca3af" : "#4b5563",
                        textDecoration: expired ? "line-through" : "none",
                      }}
                    >
                      {formatDate(acc.valid_from)} – {formatDate(acc.valid_until)}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      {expired ? (
                        <span
                          style={{
                            color: "#ef4444",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          Kedaluwarsa
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "#16a34a",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          ● Aktif
                        </span>
                      )}
                    </td>
                    <td
                      style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}
                    >
                      <button
                        onClick={() => handleDistributeAll(acc)}
                        disabled={
                          expired || isThisDistributing || isPending || targets.length === 0
                        }
                        title={
                          expired
                            ? "Akses sudah kedaluwarsa"
                            : targets.length === 0
                            ? "Tidak ada sekolah dalam komunitas"
                            : `Distribusikan ke semua ${targets.length} sekolah`
                        }
                        style={{
                          padding: "0.4rem 0.9rem",
                          borderRadius: "0.4rem",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor:
                            expired || isThisDistributing || targets.length === 0
                              ? "not-allowed"
                              : "pointer",
                          border: "1px solid",
                          borderColor:
                            expired || targets.length === 0
                              ? "#d1d5db"
                              : "#2563eb",
                          backgroundColor:
                            expired || targets.length === 0
                              ? "#f3f4f6"
                              : isThisDistributing
                              ? "#93c5fd"
                              : "#eff6ff",
                          color:
                            expired || targets.length === 0
                              ? "#9ca3af"
                              : "#1d4ed8",
                          transition: "all 0.15s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isThisDistributing
                          ? "⏳ Memproses…"
                          : `🏫 Ke Semua Sekolah (${targets.length})`}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Riwayat distribusi ke sekolah ────────────────────────────────── */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "0.75rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <h4 style={{ margin: 0, color: "#102e50" }}>
            Riwayat Penugasan ke Sekolah
          </h4>
          <input
            type="text"
            placeholder="Cari sekolah atau kategori ujian…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #d1d5db",
              fontSize: "0.9rem",
              width: "100%",
              maxWidth: "280px",
            }}
          />
        </div>

        {(() => {
          const filteredLogs = accessLogs.filter((log) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
              (log.target_name ?? "").toLowerCase().includes(q) ||
              (log.question_categories?.name ?? "").toLowerCase().includes(q) ||
              (log.phase ?? "").toLowerCase().includes(q)
            );
          });

          if (filteredLogs.length === 0) {
            return (
              <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                Belum ada kategori yang didistribusikan ke sekolah yang sesuai pencarian.
              </div>
            );
          }

          // Kelompokkan berdasarkan phase
          const groupedLogs = filteredLogs.reduce((acc, log) => {
            const phaseKey = log.phase || "Fase Umum / Tidak Ditentukan";
            if (!acc[phaseKey]) acc[phaseKey] = [];
            acc[phaseKey].push(log);
            return acc;
          }, {} as Record<string, typeof accessLogs>);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {Object.entries(groupedLogs).map(([phaseName, logsInPhase]) => (
                <div
                  key={phaseName}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      padding: "0.85rem 1.25rem",
                      backgroundColor: "#102e50",
                      color: "white",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontWeight: 600,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1rem" }}>📌 Kategori Fase: {phaseName}</span>
                    </div>
                    <span
                      style={{
                        padding: "0.2rem 0.75rem",
                        backgroundColor: "rgba(255,255,255,0.2)",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                      }}
                    >
                      {logsInPhase.length} Penugasan Sekolah
                    </span>
                  </div>
                  <div style={{ overflowX: "auto", backgroundColor: "white" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                      <thead>
                        <tr
                          style={{
                            borderBottom: "2px solid #e5e7eb",
                            textAlign: "left",
                            color: "#4b5563",
                            backgroundColor: "#f9fafb",
                          }}
                        >
                          <th style={{ padding: "0.75rem 1rem" }}>Tanggal Penugasan</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Sekolah Binaan</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Kategori Ujian</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Rentang Valid</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logsInPhase.map((log) => {
                          const expired = isExpired(log.valid_until);
                          return (
                            <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "0.75rem 1rem", color: "#6b7280" }}>
                                {formatDate(log.created_at)}
                              </td>
                              <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#102e50" }}>
                                {log.target_name}
                              </td>
                              <td style={{ padding: "0.75rem 1rem" }}>
                                {log.question_categories?.name}
                                <span style={{ display: "block", fontSize: "0.78rem", color: "#6b7280" }}>
                                  ({log.question_categories?.subject_area?.toUpperCase()})
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem 1rem",
                                  fontSize: "0.85rem",
                                  color: expired ? "#9ca3af" : "#4b5563",
                                }}
                              >
                                {formatDate(log.valid_from)} – {formatDate(log.valid_until)}
                              </td>
                              <td style={{ padding: "0.75rem 1rem" }}>
                                {expired ? (
                                  <span style={{ color: "#ef4444", fontSize: "0.8rem", fontWeight: 600 }}>
                                    Kedaluwarsa
                                  </span>
                                ) : (
                                  <span style={{ color: "#16a34a", fontSize: "0.8rem", fontWeight: 600 }}>
                                    ● Aktif
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── Riwayat Pengajuan Fase ke Super Admin ────────────────────────── */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "0.75rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h4 style={{ margin: 0, color: "#102e50", fontSize: "1.05rem" }}>
              Riwayat Pengajuan Fase Asesmen (Ke Super Admin)
            </h4>
            <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
              Daftar pengajuan pembukaan fase yang diajukan oleh komunitas Anda.
            </p>
          </div>
        </div>

        {phaseRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "0.5rem" }}>
            Belum ada pengajuan fase asesmen yang dikirim ke Super Admin.
          </div>
        ) : (
          <table className="pemantik-table">
            <thead>
              <tr>
                <th>Tanggal Pengajuan</th>
                <th>Kategori Ujian</th>
                <th>Fase Diajukan</th>
                <th>Target Sekolah</th>
                <th>Rentang Waktu</th>
                <th>Status &amp; Alasan</th>
              </tr>
            </thead>
            <tbody>
              {phaseRequests.map((pr: any) => (
                <tr key={pr.id}>
                  <td style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                    {formatDate(pr.created_at)}
                  </td>
                  <td style={{ fontWeight: 600, color: "#102e50" }}>
                    {pr.question_categories?.name || pr.category_id}
                  </td>
                  <td>
                    <span style={{ padding: "0.2rem 0.65rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                      {pr.phase}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>
                    {pr.target_school_ids?.length || 0} Sekolah
                  </td>
                  <td style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                    {formatDate(pr.valid_from)} – {formatDate(pr.valid_until)}
                  </td>
                  <td>
                    {pr.status === "approved" ? (
                      <Badge variant="success">✅ Disetujui</Badge>
                    ) : pr.status === "rejected" ? (
                      <div>
                        <Badge variant="danger">❌ Ditolak</Badge>
                        {pr.rejection_reason && (
                          <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.25rem", maxWidth: "200px" }}>
                            Alasan: {pr.rejection_reason}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="warning">⏳ Menunggu Persetujuan</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal Request Fase Asesmen Baru ───────────────────────────────── */}
      {isRequestModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "1rem", padding: "1.75rem",
            width: "100%", maxWidth: "580px", maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#102e50", fontSize: "1.2rem" }}>
              Pembuatan dan Pengajuan Asesmen
            </h3>
            <div style={{ backgroundColor: "#fef3c7", borderLeft: "4px solid #f59e0b", padding: "0.85rem", borderRadius: "0.4rem", marginBottom: "1.25rem" }}>
              <p style={{ margin: 0, color: "#92400e", fontSize: "0.82rem", lineHeight: "1.4" }}>
                <strong>Note:</strong> Walaupun secara default semua paket ujian tersedia, siswa-siswa di sekolah binaan Anda <strong>belum/tidak akan bisa mengakses dan mengerjakan ujian</strong> sebelum pengajuan fase ini di-ACC (disetujui) oleh Super Admin.
              </p>
            </div>

            <form onSubmit={handleSubmitPhaseRequest} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                  Nama Fase / Tahap Asesmen (Input Teks)
                </label>
                <input
                  type="text"
                  value={reqPhase}
                  onChange={(e) => setReqPhase(e.target.value)}
                  placeholder="misal: Asesmen Semester Ganjil 2026 / Tahap 1 Literasi"
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                  Kategori Ujian / Paket Soal
                </label>
                <select
                  value={reqCategoryId}
                  onChange={(e) => setReqCategoryId(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                  required
                >
                  <option value="">-- Pilih Kategori --</option>
                  {allCategories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.subject_area ? `(${cat.subject_area.toUpperCase()})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                  Sekolah Target Asesmen
                </label>
                <div style={{
                  maxHeight: "150px", overflowY: "auto", border: "1px solid #d1d5db", borderRadius: "0.5rem",
                  padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", backgroundColor: "#f9fafb"
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, borderBottom: "1px solid #e5e7eb", paddingBottom: "0.4rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={targets.length > 0 && reqTargetSchools.length === targets.length}
                      onChange={(e) => {
                        if (e.target.checked) setReqTargetSchools(targets.map(t => t.id));
                        else setReqTargetSchools([]);
                      }}
                    />
                    Pilih Semua Sekolah ({targets.length})
                  </label>
                  {targets.map((sch) => (
                    <label key={sch.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={reqTargetSchools.includes(sch.id)}
                        onChange={(e) => {
                          if (e.target.checked) setReqTargetSchools([...reqTargetSchools, sch.id]);
                          else setReqTargetSchools(reqTargetSchools.filter(id => id !== sch.id));
                        }}
                      />
                      <span>{sch.name} {sch.npsn ? `(${sch.npsn})` : ""}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                    Tanggal Mulai Valid
                  </label>
                  <input
                    type="date"
                    value={reqValidFrom}
                    onChange={(e) => setReqValidFrom(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                    Tanggal Selesai Valid
                  </label>
                  <input
                    type="date"
                    value={reqValidUntil}
                    onChange={(e) => setReqValidUntil(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequestModalOpen(false)}
                  disabled={reqSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  style={{ backgroundColor: "#102e50", color: "white" }}
                  disabled={reqSubmitting || reqTargetSchools.length === 0 || !reqCategoryId}
                >
                  {reqSubmitting ? "Mengirim..." : "Kirim Pengajuan ke Super Admin"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal assign manual ───────────────────────────────────────────── */}
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
