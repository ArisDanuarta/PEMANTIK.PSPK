import React from "react";
import { getQuestionById } from "@/app/actions/questions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@pemantik/ui";

export default async function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getQuestionById(id);

  if (!res.success || !res.data) {
    return notFound();
  }

  const q = res.data;
  const level = q.question_levels?.level_number;
  const category = q.question_levels?.question_categories?.name;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "3rem" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <Link href="/admin-soal/soal" style={{ color: "var(--clr-biru)", textDecoration: "none", fontWeight: 600 }}>&larr; Kembali</Link>
        <span style={{ color: "var(--color-gray-500)" }}>/</span>
        <h1 style={{ margin: 0, fontSize: "1.25rem", color: "#1a1a1a" }}>Detail Soal</h1>
      </div>

      <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0", color: "#1a1a1a" }}>
              {q.subject_area === "literasi" ? "Literasi" : "Numerasi"} - Level {level ?? "?"}
            </h2>
            <div style={{ color: "var(--color-gray-600)", fontSize: "0.9rem" }}>
              Kategori: {category ?? "Tidak ada"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Badge variant={q.is_published ? "success" : "warning"}>
              {q.is_published ? "Published" : "Draft"}
            </Badge>
            <Link href={`/admin-soal/soal/${q.id}/edit`} className="btn btn-primary btn-sm">
              Edit Soal
            </Link>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-gray-500)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Tipe Soal</div>
          <div style={{ fontSize: "1rem", color: "#1a1a1a" }}>{q.question_type.replace('_', ' ')}</div>
        </div>

        <div style={{ borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-gray-500)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Teks Pertanyaan</div>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "#1a1a1a", whiteSpace: "pre-wrap", margin: 0 }}>
            {q.question_text || "-"}
          </p>
        </div>

        {(q.question_image_url || q.question_audio_url || q.question_video_url) && (
          <div style={{ borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-gray-500)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Media Stimulus</div>
            <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", wordBreak: "break-all", fontSize: "0.9rem", color: "var(--clr-biru)" }}>
              <a href={q.question_image_url || q.question_audio_url || q.question_video_url} target="_blank" rel="noreferrer">
                {q.question_image_url || q.question_audio_url || q.question_video_url}
              </a>
            </div>
          </div>
        )}

        {q.options && (
          <div style={{ borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-gray-500)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Opsi & Jawaban</div>
            <pre style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px", overflowX: "auto", fontSize: "0.85rem", margin: 0 }}>
              {JSON.stringify({ options: q.options, correct_answer: q.correct_answer }, null, 2)}
            </pre>
          </div>
        )}

        {q.explanation && (
          <div style={{ borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-gray-500)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Penjelasan</div>
            <p style={{ fontSize: "1rem", lineHeight: 1.5, color: "#1a1a1a", whiteSpace: "pre-wrap", margin: 0 }}>
              {q.explanation}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
