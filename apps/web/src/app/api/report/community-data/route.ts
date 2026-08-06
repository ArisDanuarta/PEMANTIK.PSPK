import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('community_id');
  const categoryId = searchParams.get('category_id');

  if (!communityId || !categoryId) {
    return NextResponse.json({ error: "community_id dan category_id wajib diisi." }, { status: 400 });
  }

  const supabase = createServerClient();

  // 1. Dapatkan school_id milik komunitas ini - ISOLASI DATA KRITIS (termasuk arsip)
  const { data: schools, error: schoolsErr } = await supabase
    .from("schools")
    .select("id")
    .eq("community_id", communityId);

  if (schoolsErr) {
    return NextResponse.json({ error: "Gagal mengambil data sekolah." }, { status: 500 });
  }

  const schoolIds = (schools || []).map((s) => s.id);
  if (schoolIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // 2. Ambil sesi ujian hanya milik komunitas ini, untuk kategori yang dipilih
  let query = supabase
    .from("assessment_sessions")
    .select(`
      id,
      category_id,
      school_id,
      status,
      score,
      time_spent_sec,
      completed_at,
      phase,
      attempt_number,
      students (
        nisn,
        full_name,
        gender,
        schools ( name )
      ),
      student_answers (
        is_correct,
        score,
        answer_data,
        questions (
          subject_area,
          question_type,
          question_text
        )
      )
    `)
    .in("school_id", schoolIds)
    .eq("is_void", false)
    .order("completed_at", { ascending: false });

  if (categoryId !== "all") {
    query = query.eq("category_id", categoryId);
  }

  const { data: sessionsData, error: sessErr } = await query;

  if (sessErr) {
    console.error("Error fetching sessions for report:", sessErr);
    return NextResponse.json({ error: "Gagal mengambil data laporan." }, { status: 500 });
  }

  // 3. Proses agregasi di server (ringankan client)
  const reportData = (sessionsData || []).map((session: any) => {
    const student = Array.isArray(session.students) ? session.students[0] : session.students;
    const answers: any[] = session.student_answers || [];

    let scoreLit = 0;
    let scoreNum = 0;
    let totalCorrect = 0;

    answers.forEach((ans) => {
      const isCorrect = ans.is_correct === true;
      const pointValue = ans.score ?? (isCorrect ? 1 : 0);
      if (isCorrect) totalCorrect++;
      if (ans.questions?.subject_area === "literasi") scoreLit += pointValue;
      if (ans.questions?.subject_area === "numerasi") scoreNum += pointValue;
    });

    return {
      id: session.id,
      category_id: session.category_id,
      school_id: session.school_id,
      status: session.status,
      score_total: session.score ?? totalCorrect,
      score_lit: scoreLit,
      score_num: scoreNum,
      total_questions: answers.length,
      total_correct: totalCorrect,
      total_wrong: answers.length - totalCorrect,
      time_spent: session.time_spent_sec || 0,
      completed_at: session.completed_at || "",
      phase: session.phase || "",
      attempt_number: session.attempt_number ?? 1,
      nisn: student?.nisn || "",
      full_name: student?.full_name || "Tanpa Nama",
      gender: student?.gender || "",
      school_name: student?.schools?.name || "-",
    };
  });

  return NextResponse.json({ data: reportData });
}
