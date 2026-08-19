import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getQuestions } from "@/app/actions/questions";
import QuestionTableClient from "@/components/shared/QuestionTableClient";

export const metadata: Metadata = {
  title: "Daftar Soal - Admin Soal | Pemantik",
};

export default async function DaftarSoalPage({
  searchParams,
}: {
  searchParams: Promise<any>;
}) {
  const sp = await searchParams;
  const page = parseInt(sp?.page || "1");
  const subject = sp?.subject || "";
  const type = sp?.type || "";
  const status = sp?.status || "";
  const search = sp?.search || "";

  const filters = { subject, type, status, search };
  const res = await getQuestions(page, 15, filters);

  const questions = res.success ? res.data : [];
  const count = res.success ? res.count : 0;

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Bank Soal</h1>
          <div className="page-breadcrumb">
            <span>Admin Soal</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Konten Soal</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Daftar Soal</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a
            href={`/api/export/questions?subject=${subject}&type=${type}&status=${status}&search=${search}`}
            className="btn btn-outline btn-md"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export Excel
          </a>
          <Link
            href="/admin-soal/soal/new"
            className="btn btn-primary btn-md"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Soal
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Filter toolbar */}
        <div style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid #e9ecef",
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
          background: "#f8f9fa",
        }}>
          <QuestionFilters
            subject={subject}
            type={type}
            status={status}
            search={search}
            page={page}
          />
        </div>

        {/* Summary row */}
        <div style={{
          padding: "0.625rem 1.5rem",
          borderBottom: "1px solid #f1f3f5",
          fontSize: "0.8rem",
          color: "black",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span>{count || 0} soal ditemukan</span>
          {(subject || type || status || search) && (
            <Link
              href="/admin-soal/soal"
              style={{ fontSize: "0.75rem", color: "var(--clr-merah)", textDecoration: "none", fontWeight: 500 }}
            >
              Hapus filter ×
            </Link>
          )}
        </div>

        {/* Table */}
        <QuestionTableClient
          initialQuestions={questions || []}
          count={count || 0}
          page={page}
          subject={subject}
          type={type}
          status={status}
          search={search}
        />
      </div>
    </div>
  );
}

// Server-rendered filter form (native HTML form for progressive enhancement)
function QuestionFilters({
  subject, type, status, search, page
}: {
  subject: string; type: string; status: string; search: string; page: number;
}) {
  return (
    <form
      method="GET"
      style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", width: "100%" }}
    >
      {/* Search */}
      <div style={{ position: "relative", flex: "1 1 200px" }}>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#adb5bd"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          name="search"
          defaultValue={search}
          type="search"
          placeholder="Cari teks pertanyaan..."
          className="form-input"
          style={{ paddingLeft: "2.25rem", height: "36px", fontSize: "0.85rem" }}
        />
      </div>

      <select
        name="subject"
        defaultValue={subject}
        className="form-select"
        style={{ width: "160px", height: "36px", fontSize: "0.85rem" }}
      >
        <option value="">Semua Mata Pelajaran</option>
        <option value="literasi">Literasi</option>
        <option value="numerasi">Numerasi</option>
      </select>

      <select
        name="type"
        defaultValue={type}
        className="form-select"
        style={{ width: "170px", height: "36px", fontSize: "0.85rem" }}
      >
        <option value="">Semua Tipe Soal</option>
        <option value="multiple_choice">Pilihan Ganda</option>
        <option value="drag_drop">Drag &amp; Drop</option>
        <option value="image_choice">Pilih Gambar</option>
        <option value="audio_question">Audio</option>
        <option value="video_question">Video</option>
        <option value="voice_recording">Voice Recording</option>
      </select>

      <select
        name="status"
        defaultValue={status}
        className="form-select"
        style={{ width: "140px", height: "36px", fontSize: "0.85rem" }}
      >
        <option value="">Semua Status</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>

      <button
        type="submit"
        className="btn btn-outline btn-sm"
        style={{ height: "36px", flexShrink: 0 }}
      >
        Terapkan
      </button>
    </form>
  );
}
