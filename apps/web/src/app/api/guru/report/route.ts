import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id");
  const headersList = await headers();
  const teacherId = headersList.get("x-user-id");
  const schoolId = headersList.get("x-school-id");

  if (!categoryId || !teacherId || !schoolId) {
    return NextResponse.json({ error: "category_id, teacher_id, dan school_id wajib diisi." }, { status: 400 });
  }

  const supabase = createServerClient();

  // 1. Dapatkan kelas-kelas yang diajar guru ini
  const { data: classes } = await supabase
    .from("classes")
    .select("id")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId);

  const classIds = classes?.map((c) => c.id) || [];
  if (classIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // 2. Dapatkan murid dari kelas-kelas tersebut
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("school_id", schoolId)
    .in("class_id", classIds);

  const studentIds = students?.map((s) => s.id) || [];
  if (studentIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // 3. Ambil semua sesi untuk murid tersebut + kategori ini
  const { data: sessionsData, error } = await supabase
    .from("assessment_sessions")
    .select(`
      id, category_id, student_id, school_id, status, score, time_spent_sec,
      completed_at, phase, is_void, attempt_number,
      students!inner(nisn, full_name, gender, ses_class, classes(id, name, grade)),
      student_answers(is_correct, score, answer_data, questions(subject_area, question_type, question_text))
    `)
    .in("student_id", studentIds)
    .eq("category_id", categoryId)
    .eq("is_void", false)
    .order("completed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Gagal mengambil data laporan: " + error.message }, { status: 500 });
  }

  const reportData = (sessionsData ?? []).map((session: any) => {
    const student = Array.isArray(session.students) ? session.students[0] : session.students;
    const answers: any[] = session.student_answers ?? [];

    let scoreLit = 0;
    let scoreNum = 0;
    let totalCorrect = 0;

    answers.forEach((ans) => {
      // Gunakan is_correct sebagai sumber utama, score sebagai cadangan
      const isCorrect = ans.is_correct === true;
      const pointValue = ans.score ?? (isCorrect ? 1 : 0);
      if (isCorrect) totalCorrect++;
      if (ans.questions?.subject_area === "literasi") scoreLit += pointValue;
      if (ans.questions?.subject_area === "numerasi") scoreNum += pointValue;
    });

    const cls = student?.classes;

    return {
      id: session.id,
      student_id: session.student_id,
      status: session.status,
      score_total: session.score ?? totalCorrect,
      score_lit: scoreLit,
      score_num: scoreNum,
      total_questions: answers.length,
      total_correct: totalCorrect,
      total_wrong: answers.length - totalCorrect,
      time_spent: session.time_spent_sec ?? 0,
      completed_at: session.completed_at ?? "",
      phase: session.phase ?? "",
      attempt_number: session.attempt_number ?? 1,
      nisn: student?.nisn ?? "",
      full_name: student?.full_name ?? "Tanpa Nama",
      gender: student?.gender ?? "",
      ses_class: student?.ses_class ?? "",
      class_id: cls?.id ?? "",
      class_name: cls ? `Kelas ${cls.grade} — ${cls.name}` : "—",
    };
  });

  return NextResponse.json({ data: reportData });
}
