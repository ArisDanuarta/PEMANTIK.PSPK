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
 *   - community_id (optional) - filter ke komunitas tertentu
 *   - school_id (optional) - filter ke sekolah tertentu
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId  = searchParams.get('category_id');
  const communityId = searchParams.get('community_id');
  const schoolId    = searchParams.get('school_id');
  const pageStr     = searchParams.get('page') || '1';
  const limitStr    = searchParams.get('limit') || '50';

  const page = parseInt(pageStr, 10);
  const limit = parseInt(limitStr, 10);
  const offset = (page - 1) * limit;

  if (!categoryId) {
    return NextResponse.json({ error: "category_id wajib diisi." }, { status: 400 });
  }

  const supabase    = createServerClient();
  const headersList = await headers();
  let userRole      = headersList.get("x-user-role");

  if (userRole !== "super_admin" && userRole !== "peneliti") {
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
      community_id,
      community_name,
      is_sandbox,
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
    .not("session_id", "is", null)
    .eq("is_sandbox", false); // ← FILTER SANDBOX

  if (categoryId !== "all") {
    query = query.eq("category_id", categoryId);
  }

  // Filter komunitas
  if (communityId && communityId !== "all") {
    query = query.eq("community_id", communityId);
  }

  // Filter sekolah
  if (schoolId && schoolId !== "all") {
    query = query.eq("school_id", schoolId);
  }

  // Count & Pagination
  const { count, error: countError } = await (supabase as any)
    .from("v_assessment_report")
    .select('*', { count: 'exact', head: true })
    .not("session_id", "is", null)
    .eq("is_sandbox", false)
    .match(
      Object.assign({}, 
        categoryId !== "all" ? { category_id: categoryId } : {},
        communityId && communityId !== "all" ? { community_id: communityId } : {},
        schoolId && schoolId !== "all" ? { school_id: schoolId } : {}
      )
    );

  query = query.order("completed_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data: viewData, error } = await query;

  if (error) {
    console.error("[superadmin-data] Error fetching from v_assessment_report:", error);
    return NextResponse.json({ error: "Gagal mengambil data laporan." }, { status: 500 });
  }

  // ── Fetch student_answers untuk hitung skor lit/num ──────────────────────
  // Fetch dalam batch 500 untuk hindari URL overflow
  const sessionIds: string[] = [
    ...new Set(((viewData as any[]) ?? []).map((r: any) => r.session_id as string).filter(Boolean))
  ];

  let answersBySession: Record<string, { scoreLit: number; scoreNum: number; totalCorrect: number; totalWrong: number; totalQ: number }> = {};

  if (sessionIds.length > 0) {
    const BATCH_SIZE = 500;
    const CONCURRENCY = 5; // Run 5 requests in parallel

    const batches = [];
    for (let i = 0; i < sessionIds.length; i += BATCH_SIZE) {
      batches.push(sessionIds.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      const currentBatches = batches.slice(i, i + CONCURRENCY);
      
      await Promise.all(currentBatches.map(async (batch) => {
        const { data: answers } = await supabase
          .from("student_answers")
          .select("session_id, is_correct, score, questions(subject_area)")
          .in("session_id", batch)
          .limit(50000);

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
      }));
    }
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
      school_name:        row.school_name      ?? "-",
      community_name:     row.community_name   ?? "-",
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
      // ── Anak ──
      nisn:               row.nisn             ?? "",
      full_name:          row.student_name     ?? "Tanpa Nama",
      gender:             row.gender           ?? "",
      ses_class:          row.ses_class        ?? "",
      ses_score:          row.ses_score        ?? null,
    };
  });

  // ── 3. Ambil Global Stats via RPC ────────────────────────────────────────
  let globalStats = { total_siswa: count || 0, avg_score_total: 0, avg_score_lit: 0, avg_score_num: 0 };
  const { data: statsData } = await (supabase as any).rpc('get_superadmin_dashboard_stats', {
    p_category_id: categoryId !== "all" ? categoryId : null,
    p_community_id: (communityId && communityId !== "all") ? communityId : null,
    p_school_id: (schoolId && schoolId !== "all") ? schoolId : null
  });

  if (statsData && Array.isArray(statsData) && statsData.length > 0) {
    globalStats = statsData[0];
  }

  return NextResponse.json({ 
    data: reportData, 
    total: count || 0,
    stats: globalStats
  });
}
