"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@pemantik/ui";
import AssignPackageModal from "@/components/shared/AssignPackageModal";
import {
  assignCommunityPackageToSchool,
  distributeAccessToSchools,
} from "../../actions/assessment";

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
}: Props) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  // Distribusi massal per access entry
  const [distributingId, setDistributingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
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
            Distribusi Kategori Ujian ke Sekolah
          </h3>
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
            Distribusikan akses ujian dari Super Admin ke sekolah-sekolah binaan Anda.
          </p>
        </div>
        <Button
          onClick={() => setIsAssignModalOpen(true)}
          style={{ backgroundColor: "#102e50", color: "white" }}
          disabled={packages.length === 0}
        >
          + Berikan Akses ke Sekolah
        </Button>
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

        {accessLogs.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}
          >
            Belum ada kategori yang didistribusikan ke sekolah.
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
                <th style={{ padding: "0.75rem 0.5rem" }}>Tanggal</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Sekolah</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Kategori Ujian</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Fase</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Rentang Valid</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {accessLogs
                .filter((log) => {
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    (log.target_name ?? "").toLowerCase().includes(q) ||
                    (log.question_categories?.name ?? "").toLowerCase().includes(q) ||
                    (log.phase ?? "").toLowerCase().includes(q)
                  );
                })
                .map((log) => {
                  const expired = isExpired(log.valid_until);
                  return (
                    <tr
                      key={log.id}
                      style={{ borderBottom: "1px solid #f3f4f6" }}
                    >
                      <td style={{ padding: "0.75rem 0.5rem", color: "#6b7280" }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem 0.5rem",
                          fontWeight: 500,
                          color: "#102e50",
                        }}
                      >
                        {log.target_name}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        {log.question_categories?.name}
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.78rem",
                            color: "#6b7280",
                          }}
                        >
                          ({log.question_categories?.subject_area?.toUpperCase()})
                        </span>
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
                          {log.phase}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "0.75rem 0.5rem",
                          fontSize: "0.85rem",
                          color: expired ? "#9ca3af" : "#4b5563",
                        }}
                      >
                        {formatDate(log.valid_from)} – {formatDate(log.valid_until)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
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
        )}
      </div>

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
