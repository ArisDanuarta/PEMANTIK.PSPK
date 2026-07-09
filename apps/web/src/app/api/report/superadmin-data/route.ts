import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

/**
 * GET /api/report/superadmin-data
 *
 * Query laporan super admin via v_assessment_report VIEW.
 * VIEW menyatukan semua JOIN dalam satu query ringan.
 *
 * Query params:
 *   - category_id (required)
 *   - community_id (optional) — filter ke komunitas tertentu
 *   - school_id (optional) — filter ke sekolah tertentu
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId  = searchParams.get('category_id');
  const communityId = searchParams.get('community_id');
  const schoolId    = searchParams.get('school_id');

  if (!categoryId) {
    return NextResponse.json({ error: "category_id wajib diisi." }, { status: 400 });
  }

  const supabase    = createServerClient();
  const headersList = await headers();
  let userRole      = headersList.get("x-user-role") || "super_admin";

  if (userRole !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Query via v_assessment_report ────────────────────────────────────────
  // Hanya ambil baris yang punya sesi (session_id IS NOT NULL)
  // View sudah filter is_void = false
  // Note: cast as any karena Supabase generated types belum include views.
  // Setelah `supabase gen types` dijalankan ulang, cast ini bisa dihapus.
  let query = (supabase as any)
    .from("v_assessment_report")
    .select(`
      session_id,
      category_id,
      school_id,
      school_name,
      community_name,
      phase,
      session_status,
      final_score,
      time_spent_sec,
      completed_at,
      started_at,
      attempt_number,
      final_level_number,
      student_id,
      student_name,
      student_username,
      nisn,
      gender,
      ses_class,
      ses_score
    `)
    .eq("category_id", categoryId)
    .not("session_id", "is", null);

  // Filter komunitas
  if (communityId && communityId !== "all") {
    query = query.eq("community_id", communityId);
  }

  // Filter sekolah
  if (schoolId && schoolId !== "all") {
    query = query.eq("school_id", schoolId);
  }

  query = query.order("completed_at", { ascending: false });

  const { data: viewData, error } = await query;

  if (error) {
    console.error("[superadmin-data] Error fetching from v_assessment_report:", error);
    return NextResponse.json({ error: "Gagal mengambil data laporan." }, { status: 500 });
  }

  // ── Fetch student_answers untuk hitung skor lit/num (tidak ada di VIEW) ───
  const sessionIds: string[] = [
    ...new Set(((viewData as any[]) ?? []).map((r: any) => r.session_id as string).filter(Boolean))
  ];

  let answersBySession: Record<string, { scoreLit: number; scoreNum: number; totalCorrect: number; totalWrong: number; totalQ: number }> = {};

  if (sessionIds.length > 0) {
    const { data: answers } = await supabase
      .from("student_answers")
      .select("session_id, is_correct, score, questions(subject_area)")
      .in("session_id", sessionIds);

    (answers || []).forEach((ans: any) => {
      const sid = ans.session_id;
      if (!answersBySession[sid]) {
        answersBySession[sid] = { scoreLit: 0, scoreNum: 0, totalCorrect: 0, totalWrong: 0, totalQ: 0 };
      }
      const agg = answersBySession[sid];
      agg.totalQ++;
      const isCorrect   = ans.is_correct === true;
      const pointValue  = ans.score ?? (isCorrect ? 1 : 0);
      if (isCorrect) { agg.totalCorrect++; } else { agg.totalWrong++; }
      const subjectArea = ans.questions?.subject_area;
      if (subjectArea === "literasi")  agg.scoreLit += pointValue;
      if (subjectArea === "numerasi")  agg.scoreNum += pointValue;
    });
  }

  // ── Map ke format yang dipakai ReportData interface di client ────────────
  const reportData = (viewData || []).map((row: any) => {
    const agg = answersBySession[row.session_id] ?? {
      scoreLit: 0, scoreNum: 0, totalCorrect: 0, totalWrong: 0, totalQ: 0,
    };

    return {
      id:                 row.session_id,
      category_id:        row.category_id,
      school_id:          row.school_id,
      school_name:        row.school_name      ?? "—",
      community_name:     row.community_name   ?? "—",
      status:             row.session_status   ?? "in_progress",
      score_total:        row.final_score      ?? agg.totalCorrect,
      score_lit:          agg.scoreLit,
      score_num:          agg.scoreNum,
      total_questions:    agg.totalQ,
      total_correct:      agg.totalCorrect,
      total_wrong:        agg.totalWrong,
      time_spent:         row.time_spent_sec   ?? 0,
      completed_at:       row.completed_at     ?? "",
      started_at:         row.started_at       ?? "",
      phase:              row.phase            ?? "",
      attempt_number:     row.attempt_number   ?? 1,
      // ── Baru Minggu 4 ──
      final_level_number: row.final_level_number ?? null,
      // ── Siswa ──
      nisn:               row.nisn             ?? "",
      full_name:          row.student_name     ?? "Tanpa Nama",
      gender:             row.gender           ?? "",
      ses_class:          row.ses_class        ?? "",
      ses_score:          row.ses_score        ?? null,
    };
  });

  return NextResponse.json({ data: reportData });
}
