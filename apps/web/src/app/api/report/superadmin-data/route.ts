import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('category_id');
  const communityId = searchParams.get('community_id'); // Optional
  const schoolId = searchParams.get('school_id'); // Optional

  if (!categoryId) {
    return NextResponse.json({ error: "category_id wajib diisi." }, { status: 400 });
  }

  const supabase = createServerClient();
  const headersList = await headers();
  const userRole = headersList.get("x-user-role");

  if (userRole !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let schoolIds: string[] = [];

  // Filter based on selected school or community
  if (schoolId && schoolId !== "all") {
    schoolIds = [schoolId];
  } else if (communityId && communityId !== "all") {
    const { data: schools } = await supabase
      .from("schools")
      .select("id")
      .eq("community_id", communityId)
      .eq("is_active", true);
    schoolIds = (schools || []).map((s) => s.id);
  }

  // Fetch sessions
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
    .eq("category_id", categoryId)
    .eq("is_void", false)
    .order("completed_at", { ascending: false });

  // Apply school filters if any
  if (schoolIds.length > 0) {
    query = query.in("school_id", schoolIds);
  } else if ((communityId && communityId !== "all") && schoolIds.length === 0) {
    // If a community was selected but has no schools, return empty
    return NextResponse.json({ data: [] });
  }

  const { data: sessionsData, error: sessErr } = await query;

  if (sessErr) {
    console.error("Error fetching sessions for super admin report:", sessErr);
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
      school_name: student?.schools?.name || "—",
    };
  });

  return NextResponse.json({ data: reportData });
}
