"use client";

import React, { useState } from "react";
import { Badge, useToast, useConfirm } from "@pemantik/ui";
import { deleteQuestion } from "@/app/actions/questions";
import { useRouter } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Pilihan Ganda",
  drag_drop: "Drag & Drop",
  image_choice: "Pilih Gambar",
  audio_question: "Audio",
  video_question: "Video",
  voice_recording: "Voice Record",
};

const TYPE_COLORS: Record<string, string> = {
  multiple_choice: "#102e50",
  drag_drop: "#f2af3e",
  image_choice: "#df632f",
  audio_question: "#2d9e5f",
  video_question: "#0874aa",
  voice_recording: "#8e2d3f",
};

interface Props {
  initialQuestions: any[];
  count: number;
  page: number;
  subject?: string;
  type?: string;
  status?: string;
  search?: string;
  basePath?: string;
}

export default function QuestionTableClient({
  initialQuestions,
  count,
  page,
  subject = "",
  type = "",
  status = "",
  search = "",
  basePath = "/admin-soal/soal",
}: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const { success, error } = useToast();
  const { confirm } = useConfirm();

  const LIMIT = 15;
  const totalPages = Math.ceil(count / LIMIT);

  const buildUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (newPage > 1) params.set("page", String(newPage));
    if (subject) params.set("subject", subject);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Hapus Soal",
      description: "Apakah Anda yakin ingin menghapus soal ini? Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      variant: "danger",
    });

    if (isConfirmed) {
      const res = await deleteQuestion(id);
      if (res.success) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        success("Berhasil", "Soal berhasil dihapus.");
      } else {
        error("Gagal", res.error || "Gagal menghapus soal.");
      }
    }
  };

  if (questions.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "4rem 1rem" }}>
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-title">Tidak ada soal ditemukan</div>
        <div className="empty-state-desc">
          {search || subject || type || status
            ? "Coba ubah atau hapus filter pencarian."
            : "Belum ada soal. Mulai dengan menambah soal baru."}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Scrollable table wrapper */}
      <div className="table-wrapper" style={{ border: "none", borderRadius: 0, overflowX: "auto" }}>
        <table className="pemantik-table">
          <thead>
            <tr>
              <th style={{ width: "38%" }}>Pertanyaan</th>
              <th className="col-hide-mobile">Kode Soal</th>
              <th className="col-hide-mobile">Mata Pelajaran</th>
              <th>Tipe</th>
              <th className="col-hide-mobile">Level / Kategori</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const typeColor = TYPE_COLORS[q.question_type] || "#6c757d";
              return (
                <tr key={q.id}>
                  {/* Pertanyaan */}
                  <td>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        color: "black",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        marginBottom: "0.2rem",
                      }}
                    >
                      {q.question_text || "(Tanpa teks pertanyaan)"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "black" }}>
                      {new Date(q.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </div>
                  </td>

                  {/* Kode Soal */}
                  <td className="col-hide-mobile">
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--clr-biru)" }}>
                      {q.question_code || "-"}
                    </div>
                  </td>

                  {/* Mata Pelajaran */}
                  <td className="col-hide-mobile">
                    <Badge
                      variant={q.subject_area === "literasi" ? ("info" as any) : ("warning" as any)}
                    >
                      {q.subject_area?.toUpperCase()}
                    </Badge>
                  </td>

                  {/* Tipe */}
                  <td>
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.35rem",
                        fontSize: "0.78rem", fontWeight: 500,
                        padding: "0.2rem 0.6rem",
                        borderRadius: 999,
                        background: `${typeColor}12`,
                        color: typeColor,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: typeColor, flexShrink: 0 }} />
                      {TYPE_LABELS[q.question_type] || q.question_type}
                    </span>
                  </td>

                  {/* Level / Kategori */}
                  <td className="col-hide-mobile">
                    <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "black" }}>
                      {q.question_levels?.question_categories?.name || "-"}
                    </div>
                    {q.question_levels?.level_number != null && (
                      <div style={{ fontSize: "0.72rem", color: "black", marginTop: "0.1rem" }}>
                        Level {q.question_levels.level_number}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    <Badge variant={q.is_published ? ("success" as any) : ("warning" as any)}>
                      {q.is_published ? "Published" : "Draft"}
                    </Badge>
                  </td>

                  {/* Aksi */}
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "nowrap" }}>
                      <button
                        onClick={() => router.push(`${basePath}/${q.id}`)}
                        className="btn btn-outline btn-sm"
                        title="Lihat detail"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => router.push(`${basePath}/${q.id}/edit`)}
                        className="btn btn-primary btn-sm"
                        title="Edit soal"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="btn btn-danger btn-sm"
                        title="Hapus soal"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.875rem 1.5rem",
            borderTop: "1px solid #e9ecef",
            background: "#f8f9fa",
          }}
        >
          <span style={{ fontSize: "0.82rem", color: "black" }}>
            Halaman {page} dari {totalPages} · {count} soal total
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => router.push(buildUrl(page - 1))}
            >
              ← Sebelumnya
            </button>
            {/* Page number pills */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5
                ? i + 1
                : page <= 3
                  ? i + 1
                  : page >= totalPages - 2
                    ? totalPages - 4 + i
                    : page - 2 + i;
              return (
                <button
                  key={p}
                  className={`btn btn-sm ${p === page ? "btn-primary" : "btn-outline"}`}
                  onClick={() => router.push(buildUrl(p))}
                  style={{ minWidth: "36px" }}
                >
                  {p}
                </button>
              );
            })}
            <button
              className="btn btn-outline btn-sm"
              disabled={page >= totalPages}
              onClick={() => router.push(buildUrl(page + 1))}
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
