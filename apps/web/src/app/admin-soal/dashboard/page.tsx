import type { Metadata } from "next";
import { getQuestionStats } from "@/app/actions/questions";
import { createServerClient } from "@pemantik/supabase";
import Link from "next/link";
import React from "react";
import { StatGrid } from "@/components/ui/responsive/StatGrid";

export const metadata: Metadata = {
  title: "Dashboard Admin Soal | Pemantik",
};

export default async function Dashboard() {
  const supabase = createServerClient();
  const statsRes = await getQuestionStats();
  const stats = statsRes.success && statsRes.data
    ? statsRes.data
    : { total: 0, totalLiterasi: 0, totalNumerasi: 0, totalPublished: 0, totalDraft: 0 };

  // Fetch last 5 questions
  let recentQuestions: any[] = [];
  try {
    const { data } = await supabase
      .from("questions")
      .select("id, question_text, question_type, subject_area, is_published, created_at, question_levels(level_number, question_categories(name))")
      .order("created_at", { ascending: false })
      .limit(5);
    recentQuestions = data || [];
  } catch { }

  // Fetch breakdown by type
  let typeBreakdown: Record<string, number> = {};
  try {
    const { data } = await supabase
      .from("questions")
      .select("question_type");
    if (data) {
      for (const q of data) {
        typeBreakdown[q.question_type] = (typeBreakdown[q.question_type] || 0) + 1;
      }
    }
  } catch { }

  const typeLabels: Record<string, string> = {
    multiple_choice: "Pilihan Ganda",
    drag_drop: "Drag & Drop",
    image_choice: "Pilih Gambar",
    audio_question: "Audio",
    video_question: "Video",
    voice_recording: "Voice Record",
  };

  const typeColors: Record<string, string> = {
    multiple_choice: "var(--clr-biru)",
    drag_drop: "var(--clr-kuning)",
    image_choice: "var(--clr-oranye)",
    audio_question: "#2d9e5f",
    video_question: "#0874aa",
    voice_recording: "#8e2d3f",
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <div className="page-breadcrumb">
            <span>Admin Soal</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Dashboard</span>
          </div>
        </div>
        <Link href="/admin-soal/soal/new" className="btn btn-primary btn-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Buat Soal Baru
        </Link>
      </div>

      {/* Stat Cards */}
      <StatGrid columns={{ base: 2, md: 3, lg: 5 }}>
        <div className="stat-card">
          <div className="stat-card-accent biru" />
          <div className="stat-card-label">Total Soal</div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-sub">Keseluruhan bank soal</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent biru-muda" />
          <div className="stat-card-label">Literasi</div>
          <div className="stat-card-value">{stats.totalLiterasi}</div>
          <div className="stat-card-sub">Soal baca-tulis</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent oranye" />
          <div className="stat-card-label">Numerasi</div>
          <div className="stat-card-value">{stats.totalNumerasi}</div>
          <div className="stat-card-sub">Soal hitung-logika</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent hijau" />
          <div className="stat-card-label">Published</div>
          <div className="stat-card-value">{stats.totalPublished}</div>
          <div className="stat-card-sub">Siap digunakan siswa</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent kuning" />
          <div className="stat-card-label">Draft</div>
          <div className="stat-card-value">{stats.totalDraft}</div>
          <div className="stat-card-sub">Perlu ditinjau / dilengkapi</div>
        </div>
      </StatGrid>

      {/* Content Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginTop: "1.5rem", alignItems: "start" }}>

        {/* Breakdown Tipe Soal */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Distribusi Tipe Soal</h3>
          </div>
          <div style={{ padding: "0.5rem 0" }}>
            {Object.entries(typeLabels).map(([key, label]) => {
              const count = typeBreakdown[key] || 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={key} style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: `${typeColors[key]}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: typeColors[key] }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#343a40" }}>{label}</span>
                      <span style={{ fontSize: "0.8rem", color: "#6c757d", fontWeight: 600 }}>{count}</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${pct}%`, background: typeColors[key] }}
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#adb5bd", width: "36px", textAlign: "right", flexShrink: 0 }}>{pct}%</span>
                </div>
              );
            })}
            {stats.total === 0 && (
              <div className="empty-state" style={{ padding: "2rem" }}>
                <div className="empty-state-icon">📝</div>
                <div className="empty-state-title">Belum ada soal</div>
                <div className="empty-state-desc">Mulai buat soal pertama Anda</div>
              </div>
            )}
          </div>
        </div>

        {/* Soal Terbaru + Quick Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Aksi Cepat</h3>
            </div>
            <div style={{ padding: "1rem 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Link
                href="/admin-soal/soal/new"
                style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid #e9ecef",
                  textDecoration: "none", color: "inherit",
                  transition: "all var(--duration-fast)",
                  background: "#fff",
                }}
                className="quick-action-card"
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(16,46,80,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--clr-biru)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#212529" }}>Tambah Soal Baru</div>
                  <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>Buat soal dari awal</div>
                </div>
              </Link>

              <Link
                href="/admin-soal/soal"
                style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid #e9ecef",
                  textDecoration: "none", color: "inherit",
                  transition: "all var(--duration-fast)",
                  background: "#fff",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(8,116,170,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--clr-biru-muda)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#212529" }}>Kelola Bank Soal</div>
                  <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>Lihat, edit, dan hapus soal</div>
                </div>
              </Link>

              <Link
                href="/admin-soal/preview"
                style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid #e9ecef",
                  textDecoration: "none", color: "inherit",
                  transition: "all var(--duration-fast)",
                  background: "#fff",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(45,158,95,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d9e5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#212529" }}>Preview Soal</div>
                  <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>Lihat tampilan soal di mobile</div>
                </div>
              </Link>

              <Link
                href="/admin-soal/pengaturan"
                style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid #e9ecef",
                  textDecoration: "none", color: "inherit",
                  transition: "all var(--duration-fast)",
                  background: "#fff",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(168,40,28,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--clr-merah)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 0-14.14 0"/><path d="M4 12H2m20 0h-2M12 4V2m0 20v-2"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#212529" }}>Pengaturan Kategori</div>
                  <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>Kelola level dan kategori soal</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Soal Terbaru */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Soal Terbaru</h3>
              <Link href="/admin-soal/soal" style={{ fontSize: "0.8rem", color: "var(--clr-biru-muda)", textDecoration: "none", fontWeight: 500 }}>
                Lihat Semua →
              </Link>
            </div>
            <div>
              {recentQuestions.length === 0 ? (
                <div className="empty-state" style={{ padding: "2rem" }}>
                  <div className="empty-state-title">Belum ada soal</div>
                </div>
              ) : (
                recentQuestions.map((q, i) => (
                  <Link
                    key={q.id}
                    href={`/admin-soal/soal/${q.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.75rem 1.5rem",
                      borderBottom: i < recentQuestions.length - 1 ? "1px solid #f1f3f5" : "none",
                      textDecoration: "none", color: "inherit",
                      transition: "background var(--duration-fast)",
                    }}
                    className="recent-q-row"
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: q.is_published ? "#2d9e5f" : "#f2af3e",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "0.85rem", fontWeight: 500, color: "#212529",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {q.question_text || "(Tanpa teks pertanyaan)"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#adb5bd", marginTop: "0.15rem" }}>
                        {q.subject_area?.toUpperCase()} · {q.question_type?.replace("_", " ")} · {q.question_levels?.question_categories?.name || "-"}
                      </div>
                    </div>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem",
                      borderRadius: 999,
                      background: q.is_published ? "#d4f0e3" : "#fef3d0",
                      color: q.is_published ? "#1a6e40" : "#9a6a00",
                      flexShrink: 0,
                    }}>
                      {q.is_published ? "Published" : "Draft"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
