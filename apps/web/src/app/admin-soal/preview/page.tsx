import type { Metadata } from "next";
import React from "react";
import { getQuestions } from "@/app/actions/questions";
import Link from "next/link";
import PreviewPageClient from "./PreviewPageClient";

export const metadata: Metadata = {
  title: "Preview Soal - Admin Soal | Pemantik",
};

export default async function PreviewSoalPage({
  searchParams,
}: {
  searchParams: Promise<any>;
}) {
  const sp = await searchParams;
  const subject = sp?.subject || "literasi";
  const type = sp?.type || "";
  const status = sp?.status || "";

  const res = await getQuestions(1, 50, { subject, type, status });
  const questions = res.success ? res.data : [];

  return (
    <div
      className="animate-fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 65px - 3rem)",
        overflow: "hidden",
      }}
    >
      {/* Page header — fixed, tidak pernah scroll */}
      <div className="page-header" style={{ flexShrink: 0, marginBottom: "1.25rem" }}>
        <div className="page-header-left">
          <h1 className="page-title">Preview Soal</h1>
          <div className="page-breadcrumb">
            <span>Admin Soal</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Preview Soal</span>
          </div>
        </div>
      </div>

      {/* Filter dipindahkan ke PreviewPageClient (client-side, instant, tanpa reload).
          Tidak ada filter bar di sini lagi — mencegah duplikasi & ruang vertikal yang terbuang. */}

      {questions.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: "4rem" }}>
            <div className="empty-state-icon">📱</div>
            <div className="empty-state-title">Tidak ada soal ditemukan</div>
            <div className="empty-state-desc">Ubah filter atau tambah soal baru</div>
            <Link
              href="/admin-soal/soal/new"
              className="btn btn-primary btn-md"
              style={{ marginTop: "1rem" }}
            >
              + Tambah Soal Baru
            </Link>
          </div>
        </div>
      ) : (
        <PreviewPageClient questions={questions} subject={subject} />
      )}
    </div>
  );
}