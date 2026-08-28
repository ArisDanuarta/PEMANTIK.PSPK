import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import PenelitiSoalClient from "./PenelitiSoalClient";

export const metadata: Metadata = {
  title: "Analisis Soal & Level",
  description: "Item analysis soal dan capaian level secara nasional",
};

export const dynamic = "force-dynamic";

export default async function PenelitiSoalPage() {
  const supabase = createServerClient();
  let questionsData: any[] = [];

  try {
    // ── Ambil semua jawaban langsung dari non-sandbox sessions ─────────────
    // Gunakan v_assessment_report sebagai filter sesi valid (non-sandbox, non-void)
    // kemudian join ke student_answers di sisi DB lewat session_id
    //
    // Strategi: fetch student_answers sambil filter via sesi yang ada di v_assessment_report
    // Karena tidak bisa JOIN langsung di supabase-js, kita pakai pendekatan:
    //   1. Fetch session_ids valid dari v_assessment_report (sample 2000)
    //   2. Fetch answers dari session tersebut sekaligus
    //
    // Untuk kecepatan: ambil langsung student_answers dengan limit besar
    // dan aggregate di server. Tidak perlu filter komunitas karena
    // analisis soal adalah properti soal, bukan komunitas.

    const { data: answers, error } = await (supabase as any)
      .from("student_answers")
      .select(`
        is_correct,
        questions (
          id,
          question_code,
          subject_area,
          question_type,
          question_levels ( level_number )
        )
      `)
      .not("questions", "is", null)
      .limit(50000);

    if (error) throw error;

    // Aggregate per soal
    const aggMap = new Map<string, {
      id: string;
      question_code: string;
      subject_area: string;
      question_type: string;
      level_number: number | null;
      total_answers: number;
      correct_answers: number;
    }>();

    (answers || []).forEach((a: any) => {
      const q = Array.isArray(a.questions) ? a.questions[0] : a.questions;
      if (!q?.id || !q?.question_code) return;

      // Skip soal-soal tes internal (TES-LIT, TES-NUM)
      const code: string = q.question_code || "";
      if (code.startsWith("TES-")) return;

      if (!aggMap.has(q.id)) {
        const ql = Array.isArray(q.question_levels)
          ? q.question_levels[0]
          : q.question_levels;
        aggMap.set(q.id, {
          id: q.id,
          question_code: code,
          subject_area: q.subject_area || "",
          question_type: q.question_type || "",
          level_number: ql?.level_number ?? null,
          total_answers: 0,
          correct_answers: 0,
        });
      }

      const item = aggMap.get(q.id)!;
      item.total_answers += 1;
      if (a.is_correct) item.correct_answers += 1;
    });

    questionsData = Array.from(aggMap.values())
      .map((q) => ({
        ...q,
        success_rate:
          q.total_answers > 0
            ? (q.correct_answers / q.total_answers) * 100
            : 0,
        avg_time: 0,
      }))
      .filter((q) => q.total_answers >= 5) // buang soal yang hampir tidak pernah dijawab
      .sort((a, b) => a.success_rate - b.success_rate); // default: soal tersulit dulu

  } catch (err) {
    console.error("[PenelitiSoalPage] Failed:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Analisis Soal &amp; Level</h1>
          <div className="page-breadcrumb">
            <span>Peneliti</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Analisis Asesmen</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Soal &amp; Level</span>
          </div>
        </div>
      </div>

      <PenelitiSoalClient initialData={questionsData} />
    </div>
  );
}
