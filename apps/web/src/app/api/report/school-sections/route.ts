import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Section = "per_class" | "per_phase" | "per_level";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("school_id");
  const categoryId = searchParams.get("category_id");
  const section = searchParams.get("section") as Section | null;

  if (!schoolId || !categoryId || !section) {
    return NextResponse.json(
      { error: "school_id, category_id, dan section wajib diisi." },
      { status: 400 }
    );
  }

  if (!["per_class", "per_phase", "per_level"].includes(section)) {
    return NextResponse.json(
      { error: "section harus salah satu dari: per_class, per_phase, per_level." },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: per_class
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "per_class") {
    // Ambil kelas aktif di sekolah ini
    const { data: classes, error: classErr } = await supabase
      .from("classes")
      .select("id, name, grade, academic_year")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("grade")
      .order("name");

    if (classErr) {
      return NextResponse.json({ error: "Gagal mengambil data kelas." }, { status: 500 });
    }

    if (!classes || classes.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const classIds = classes.map((c) => c.id);

    // Ambil sesi beserta class_id lewat students → student_class_enrollments
    // Karena assessment_sessions tidak punya class_id langsung,
    // gunakan sessions → students → students.class_id
    const { data: sessions, error: sessErr } = await supabase
      .from("assessment_sessions")
      .select("id, student_id, students(class_id)")
      .eq("school_id", schoolId)
      .eq("category_id", categoryId)
      .eq("is_void", false);

    if (sessErr) {
      return NextResponse.json({ error: "Gagal mengambil data sesi." }, { status: 500 });
    }

    // Hitung siswa unik per class_id
    const classStudentMap = new Map<string, Set<string>>();
    (sessions ?? []).forEach((s: any) => {
      const student = Array.isArray(s.students) ? s.students[0] : s.students;
      const classId = student?.class_id;
      if (classId && classIds.includes(classId)) {
        if (!classStudentMap.has(classId)) classStudentMap.set(classId, new Set());
        if (s.student_id) classStudentMap.get(classId)!.add(s.student_id);
      }
    });

    const data = classes.map((cls) => ({
      class_id: cls.id,
      class_name: cls.name,
      grade: cls.grade,
      academic_year: cls.academic_year ?? null,
      student_count: classStudentMap.get(cls.id)?.size ?? 0,
    }));

    return NextResponse.json({ data });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: per_phase
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "per_phase") {
    const { data: sessions, error: sessErr } = await supabase
      .from("assessment_sessions")
      .select("phase, student_id")
      .eq("school_id", schoolId)
      .eq("category_id", categoryId)
      .eq("is_void", false)
      .not("phase", "is", null);

    if (sessErr) {
      return NextResponse.json({ error: "Gagal mengambil data sesi." }, { status: 500 });
    }

    const phaseMap = new Map<string, Set<string>>();
    (sessions ?? []).forEach((s) => {
      const phase = s.phase as string;
      if (!phaseMap.has(phase)) phaseMap.set(phase, new Set());
      if (s.student_id) phaseMap.get(phase)!.add(s.student_id);
    });

    const distinctPhases = Array.from(phaseMap.keys());

    // Ambil rentang waktu dari assessment_access (school-level)
    // Tidak filter is_active → mendukung arsip permanen (spec §2.2.5)
    const { data: accessData } = await supabase
      .from("assessment_access")
      .select("phase, valid_from, valid_until")
      .eq("target_type", "school")
      .eq("target_id", schoolId)
      .eq("category_id", categoryId)
      .in("phase", distinctPhases);

    const phaseTimeMap = new Map<string, { valid_from: string; valid_until: string }>();
    (accessData ?? []).forEach((a: { phase: string | null; valid_from: string | null; valid_until: string | null }) => {
      const phase = a.phase ?? "";
      if (!phase) return;
      const existing = phaseTimeMap.get(phase);
      const vf = a.valid_from ?? "";
      const vu = a.valid_until ?? "";
      if (!existing) {
        phaseTimeMap.set(phase, { valid_from: vf, valid_until: vu });
      } else {
        phaseTimeMap.set(phase, {
          valid_from: vf && (!existing.valid_from || vf < existing.valid_from) ? vf : existing.valid_from,
          valid_until: vu && (!existing.valid_until || vu > existing.valid_until) ? vu : existing.valid_until,
        });
      }
    });

    const data = distinctPhases.map((phase) => ({
      phase,
      valid_from: phaseTimeMap.get(phase)?.valid_from ?? null,
      valid_until: phaseTimeMap.get(phase)?.valid_until ?? null,
      student_count: phaseMap.get(phase)?.size ?? 0,
    }));

    return NextResponse.json({ data });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: per_level  (Opsi B - Gap 7.5 Decision: level dari student_answers)
  // Konsisten dengan community-sections/route.ts
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "per_level") {
    // Ambil session ids yang relevan di sekolah ini
    const { data: sessionIds, error: sidErr } = await supabase
      .from("assessment_sessions")
      .select("id, student_id")
      .eq("school_id", schoolId)
      .eq("category_id", categoryId)
      .eq("is_void", false);

    if (sidErr) {
      return NextResponse.json({ error: "Gagal mengambil data sesi." }, { status: 500 });
    }

    if (!sessionIds || sessionIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const sessionStudentMap = new Map<string, string>();
    sessionIds.forEach((s) => {
      if (s.student_id) sessionStudentMap.set(s.id, s.student_id);
    });

    // Ambil jawaban dengan level info
    const { data: answers, error: answersErr } = await supabase
      .from("student_answers")
      .select(`
        session_id,
        questions (
          level_id,
          question_levels ( level_number )
        )
      `)
      .in("session_id", sessionIds.map((s) => s.id));

    if (answersErr) {
      return NextResponse.json({ error: "Gagal mengambil data jawaban." }, { status: 500 });
    }

    // Hitung siswa unik per level_number
    const levelStudentMap = new Map<number, Set<string>>();
    (answers ?? []).forEach((ans: any) => {
      const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions;
      const levelNum = Array.isArray(q?.question_levels)
        ? q?.question_levels[0]?.level_number
        : q?.question_levels?.level_number;

      if (typeof levelNum === "number") {
        if (!levelStudentMap.has(levelNum)) levelStudentMap.set(levelNum, new Set());
        const studentId = sessionStudentMap.get(ans.session_id);
        if (studentId) levelStudentMap.get(levelNum)!.add(studentId);
      }
    });

    // Hanya level yang punya data (spec §4.8.2.C)
    const data = Array.from(levelStudentMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([level_number, students]) => ({
        level_number,
        student_count: students.size,
      }));

    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "Section tidak dikenali." }, { status: 400 });
}
