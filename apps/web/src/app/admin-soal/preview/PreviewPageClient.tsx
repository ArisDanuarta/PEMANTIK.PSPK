"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@pemantik/ui";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Pilihan Ganda",
  drag_drop: "Drag & Drop",
  image_choice: "Pilih Gambar",
  audio_question: "Audio",
  video_question: "Video",
  voice_recording: "Voice Record",
};

function getYouTubeId(url: string) {
  const match = url?.match(/(?:youtu\.be\/|watch\?v=)([^#&?]{11})/);
  return match ? match[1] : null;
}

// ── Mobile Phone Mockup ───────────────────────────────────────────────────────
function MobilePreview({
  question,
  accent,
  accentBg,
}: {
  question: any;
  accent: string;
  accentBg: string;
}) {
  const PHONE_W = 280;
  const PHONE_H = 560;
  const SCALE = 0.85;

  const options: string[] = question.options || [];
  const mediaUrl =
    question.question_image_url ||
    question.question_audio_url ||
    question.question_video_url ||
    "";
  const ytId = getYouTubeId(mediaUrl);

  return (
    <div
      style={{
        width: PHONE_W * SCALE,
        height: PHONE_H * SCALE,
        position: "relative",
        flexShrink: 0,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: PHONE_W,
          height: PHONE_H,
          transform: `scale(${SCALE})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          border: "9px solid #1a1a1a",
          borderRadius: "38px",
          background: "#fff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 88,
            height: 18,
            background: "#1a1a1a",
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 10,
            zIndex: 10,
          }}
        />
        <div
          style={{
            background: accent,
            padding: "1.3rem 0.9rem 0.3rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#fff", fontSize: "0.6rem", fontWeight: 700 }}>9:41</span>
          <div
            style={{
              width: 40,
              height: 10,
              background: "rgba(255,255,255,0.85)",
              borderRadius: 8,
            }}
          />
          <span style={{ color: "#fff", fontSize: "0.6rem", opacity: 0.85 }}>●●●</span>
        </div>
        <div
          style={{
            background: accent,
            padding: "0.4rem 0.9rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              background: "rgba(255,255,255,0.2)",
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#fff",
                fontSize: "0.7rem",
                fontWeight: 700,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Soal {TYPE_LABELS[question.question_type] || question.question_type}
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.58rem", marginTop: 1 }}>
              {question.subject_area?.toUpperCase()} · Level{" "}
              {question.question_levels?.level_number ?? "?"}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
          {question.question_image_url && (
            <div style={{ marginBottom: "0.65rem", borderRadius: 8, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.question_image_url}
                alt="Stimulus"
                style={{ width: "100%", objectFit: "cover", maxHeight: 105, display: "block" }}
              />
            </div>
          )}
          {ytId && (
            <div
              style={{
                marginBottom: "0.65rem",
                borderRadius: 8,
                overflow: "hidden",
                background: "#000",
                height: 105,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ color: "#fff", fontSize: "0.68rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", marginBottom: "0.2rem" }}>▶</div>
                YouTube Video
              </div>
            </div>
          )}
          {question.question_type === "audio_question" && mediaUrl && !ytId && (
            <audio key={mediaUrl} src={mediaUrl} controls style={{ width: "100%", display: "block", marginBottom: "0.65rem" }} />
          )}
          {question.question_type === "video_question" && mediaUrl && !ytId && (
            <video key={mediaUrl} src={mediaUrl} controls style={{ width: "100%", display: "block", borderRadius: "8px", marginBottom: "0.65rem" }} />
          )}

          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#1a1a2e",
              lineHeight: 1.5,
              marginBottom: "0.875rem",
            }}
          >
            {question.question_text || (
              <span style={{ color: "#adb5bd", fontStyle: "italic" }}>
                Teks pertanyaan belum diisi
              </span>
            )}
          </div>

          {question.question_type === "multiple_choice" && options.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {options.slice(0, 4).map((opt: string, i: number) => {
                const isCorrect = opt === question.correct_answer;
                return (
                  <div
                    key={i}
                    style={{
                      padding: "0.45rem 0.7rem",
                      borderRadius: 8,
                      border: `2px solid ${isCorrect ? accent : "#e0e0e0"}`,
                      background: isCorrect ? accentBg : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        flexShrink: 0,
                        border: isCorrect ? `4px solid ${accent}` : "2px solid #ccc",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: isCorrect ? 600 : 400,
                        color: isCorrect ? accent : "#333",
                      }}
                    >
                      {opt || `Opsi ${i + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {question.question_type === "image_choice" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              {(question.options || []).slice(0, 4).map((opt: any, i: number) => (
                <div
                  key={i}
                  style={{
                    border: `2px solid ${i === question.correct_answer?.index ? accent : "#e0e0e0"}`,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  {opt.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={opt.url}
                      alt={opt.label}
                      style={{ width: "100%", height: 52, objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 52,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.6rem",
                        color: "#adb5bd",
                        background: "#f8f9fa",
                      }}
                    >
                      Gambar {i + 1}
                    </div>
                  )}
                  {opt.label && (
                    <div
                      style={{
                        fontSize: "0.6rem",
                        textAlign: "center",
                        padding: "0.15rem 0.2rem",
                        fontWeight: i === question.correct_answer?.index ? 600 : 400,
                      }}
                    >
                      {opt.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {question.question_type === "voice_recording" && (() => {
            const targetText = question.correct_answer?.target_text
              || question.correct_answer?.text
              || question.correct_answer?.answer
              || "";
            const threshold = question.correct_answer?.threshold_pct ?? 80;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {/* Instruksi */}
                <div style={{ fontSize: "0.65rem", color: "#6c757d", textAlign: "center" }}>
                  Sistem akan meminta siswa merekam dan membacakan teks:
                </div>
                {/* Teks target - kotak bergaris emas (sama persis dengan tampilan mobile) */}
                {targetText ? (
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: 10,
                      background: "#fff",
                      border: `2px solid #e0a800`,
                      textAlign: "center",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#e07000",
                      lineHeight: 1.4,
                    }}
                  >
                    {targetText}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: 10,
                      background: accentBg,
                      border: `1.5px dashed ${accent}`,
                      textAlign: "center",
                      fontSize: "0.72rem",
                      color: "#adb5bd",
                      fontStyle: "italic",
                    }}
                  >
                    Teks target belum diisi
                  </div>
                )}
                {/* Tombol mikrofon (simulasi) */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.3rem",
                    }}
                  >
                    🎤
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "#6c757d" }}>
                    Tekan untuk merekam
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "#adb5bd" }}>
                    Toleransi kemiripan: {threshold}%
                  </div>
                </div>
              </div>
            );
          })()}

          {question.question_type === "drag_drop" && (() => {
            const dragSubtype = question.options?.subtype || "fill_blank";
            if (dragSubtype === "fill_blank") {
              const fbSentence = question.options?.sentence || "";
              const fbWordBank = question.options?.word_bank || [];
              return (
                <div>
                  <div style={{ fontSize: "0.78rem", color: "#333", lineHeight: 1.6, marginBottom: "0.75rem", padding: "0.5rem", background: "#f8f9fa", borderRadius: "6px" }}>
                    {fbSentence ? fbSentence.split("___").map((part: string, i: number, arr: any[]) => (
                      <span key={i}>{part}{i < arr.length - 1 && <span style={{ display: "inline-block", minWidth: "50px", borderBottom: `2px solid ${accent}`, margin: "0 4px" }}>&nbsp;</span>}</span>
                    )) : <span style={{ color: "#adb5bd" }}>Kalimat dengan ___ akan muncul di sini</span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    {fbWordBank.map((w: any) => (
                      <span key={w.id} style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem", background: "#fff", border: `1.5px solid ${accent}`, borderRadius: "6px", color: accent, fontWeight: 500 }}>{w.text || "kata"}</span>
                    ))}
                  </div>
                </div>
              );
            }
            if (dragSubtype === "sorting") {
              const sortItems = question.options?.items || [];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {sortItems.map((s: any, i: number) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", background: "#f8f9fa", borderRadius: "8px", border: "1.5px solid #dee2e6" }}>
                      <span style={{ fontSize: "0.7rem", color: "#adb5bd", fontWeight: 700 }}>⠿</span>
                      <span style={{ fontSize: "0.75rem" }}>{s.text || `Item ${i + 1}`}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: "0.65rem", color: "#adb5bd", textAlign: "center", marginTop: "0.25rem" }}>Anak akan mengurutkan item di atas</div>
                </div>
              );
            }
            // matching
            const matchPairs = question.options?.pairs || [];
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {matchPairs.map((p: any, i: number) => (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.25rem", alignItems: "center" }}>
                    <div style={{ fontSize: "0.72rem", padding: "0.375rem 0.5rem", background: "#f8f9fa", border: "1.5px solid #dee2e6", borderRadius: "6px", textAlign: "center", wordBreak: "break-word" }}>{p.left || `Kiri ${i+1}`}</div>
                    <span style={{ fontSize: "0.7rem", color: "#adb5bd" }}>↔</span>
                    <div style={{ fontSize: "0.72rem", padding: "0.375rem 0.5rem", background: accentBg, border: `1.5px solid ${accent}`, borderRadius: "6px", textAlign: "center", color: accent, wordBreak: "break-word" }}>{p.right || `Kanan ${i+1}`}</div>
                  </div>
                ))}
                <div style={{ fontSize: "0.6rem", color: "#000000ff", textAlign: "center", marginTop: "0.25rem", fontStyle: "italic" }}>*Di aplikasi siswa, posisi jawaban di kolom kanan akan diacak otomatis.</div>
              </div>
            );
          })()}
        </div>

        <div
          style={{
            padding: "0.6rem 0.9rem",
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <button
            style={{
              fontSize: "0.65rem",
              padding: "0.3rem 0.7rem",
              borderRadius: 7,
              border: "1px solid #ddd",
              background: "#f9f9f9",
              cursor: "pointer",
              color: "#333",
            }}
          >
            ← Kembali
          </button>
          <span style={{ fontSize: "0.6rem", color: "#adb5bd" }}>1 / 10</span>
          <button
            style={{
              fontSize: "0.65rem",
              padding: "0.3rem 0.7rem",
              borderRadius: 7,
              border: "none",
              background: accent,
              cursor: "pointer",
              color: "#fff",
            }}
          >
            Lanjut →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PreviewPageClient({
  questions: allQuestions,
  subject: initialSubject,
}: {
  questions: any[];
  subject: string;
}) {
  const [filterSubject, setFilterSubject] = useState(initialSubject || "literasi");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const questions = allQuestions.filter((q) => {
    const matchSubject = filterSubject === "all" || q.subject_area === filterSubject;
    const matchType = filterType === "all" || q.question_type === filterType;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "published" && q.is_published) ||
      (filterStatus === "draft" && !q.is_published);
    return matchSubject && matchType && matchStatus;
  });

  const [selectedId, setSelectedId] = useState<string>(questions[0]?.id ?? "");
  const selectedQuestion = questions.find((q) => q.id === selectedId) ?? questions[0];

  const accent = filterSubject === "literasi" ? "#0874aa" : "#102e50";
  const accentBg = filterSubject === "literasi" ? "#eef8ff" : "#eef2ff";

  const selectStyle: React.CSSProperties = {
    fontSize: "0.78rem",
    padding: "0.4rem 0.6rem",
    borderRadius: "6px",
    border: "1px solid #dee2e6",
    background: "#fff",
    color: "#495057",
    cursor: "pointer",
    outline: "none",
    width: 170,
  };

  return (
    // CONTAINER UTAMA (sekarang menjadi flex-row kiri-kanan)
    <div
      style={{
        display: "flex",
        alignItems: "stretch", // Biar tingginya sama kiri dan kanan
        flexWrap: "wrap",
        gap: "1.25rem",
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        margin: 0,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════
          KOLOM KIRI (Terdiri dari Filter + List Soal)
          ═══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: "1 1 300px",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "1rem", // Jarak antara box Filter dan box List Soal
          overflow: "hidden", // Agar isi list bisa discroll dengan aman
        }}
      >
        {/* FILTER BAR (Sekarang lebarnya mengikuti kolom kiri) */}
        <div
          className="card"
          style={{
            padding: "0.75rem 1.25rem",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#adb5bd",
              flexShrink: 0,
            }}
          >
            Filter Soal
          </span>
          <select
            style={selectStyle}
            value={filterSubject}
            onChange={(e) => {
              setFilterSubject(e.target.value);
              setSelectedId("");
            }}
            title="Mata Pelajaran"
          >
            <option value="all">Semua Mapel</option>
            <option value="literasi">Literasi</option>
            <option value="numerasi">Numerasi</option>
          </select>
          <select
            style={selectStyle}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            title="Tipe Soal"
          >
            <option value="all">Semua Tipe</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            style={selectStyle}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            title="Status"
          >
            <option value="all">Semua Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* LIST SOAL BOX */}
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flex: 1, // Mengisi sisa tinggi di kolom kiri
          }}
        >
          <div
            style={{
              padding: "0.9rem 1.25rem",
              borderBottom: "1px solid #e9ecef",
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--clr-biru)",
              flexShrink: 0,
            }}
          >
            {questions.length} Soal Tersedia
          </div>

          <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }} className="pemantik-scrollbar">
            {questions.length === 0 ? (
              <div
                style={{
                  padding: "3rem 1.5rem",
                  textAlign: "center",
                  color: "#adb5bd",
                  fontSize: "0.875rem",
                }}
              >
                Tidak ada soal yang sesuai filter
              </div>
            ) : (
              questions.map((q, idx) => {
                const isSelected = q.id === selectedId;
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedId(q.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.8rem 1.25rem",
                      borderBottom: "1px solid #f1f3f5",
                      border: "none",
                      background: isSelected ? "rgba(8,116,170,0.06)" : "transparent",
                      borderLeft: isSelected ? `3px solid ${accent}` : "3px solid transparent",
                      cursor: "pointer",
                      transition: "background 0.12s",
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        flexShrink: 0,
                        marginTop: 1,
                        background: isSelected ? accent : "#f1f3f5",
                        color: isSelected ? "#fff" : "#6c757d",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        transition: "background 0.12s",
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "#1a1a2e" : "#495057",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {q.question_text || "(Tanpa teks)"}
                      </div>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "0.65rem", color: "#adb5bd" }}>
                          {TYPE_LABELS[q.question_type] || q.question_type}
                        </span>
                        <span style={{ color: "#dee2e6" }}>·</span>
                        <Badge variant={q.is_published ? ("success" as any) : ("warning" as any)}>
                          {q.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          KOLOM KANAN (Hanya Preview Mobile)
          ═══════════════════════════════════════════════════════════════ */}
      <div
        className="card"
        style={{
          flex: "1 1 300px",
          maxWidth: "100%",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.6rem",
          overflow: "hidden",
          padding: "1rem",
        }}
      >
        {selectedQuestion ? (
          <>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#adb5bd",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                flexShrink: 0,
              }}
            >
              Pratinjau Mobile
            </div>

            <MobilePreview question={selectedQuestion} accent={accent} accentBg={accentBg} />

            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <Link href={`/admin-soal/soal/${selectedQuestion.id}`} className="btn btn-outline btn-sm">
                Detail
              </Link>
              <Link
                href={`/admin-soal/soal/${selectedQuestion.id}/edit`}
                className="btn btn-primary btn-sm"
              >
                Edit Soal
              </Link>
            </div>
          </>
        ) : (
          <div style={{ padding: "2rem", color: "#adb5bd", textAlign: "center", fontSize: "0.875rem" }}>
            Pilih soal untuk melihat preview
          </div>
        )}
      </div>
    </div>
  );
}