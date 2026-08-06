import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Section = "per_level" | "per_phase" | "per_school";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get("community_id");
  const categoryId = searchParams.get("category_id");
  const section = searchParams.get("section") as Section | null;

  if (!communityId || !categoryId || !section) {
    return NextResponse.json(
      { error: "community_id, category_id, dan section wajib diisi." },
      { status: 400 }
    );
  }

  if (!["per_level", "per_phase", "per_school"].includes(section)) {
    return NextResponse.json(
      { error: "section harus salah satu dari: per_level, per_phase, per_school." },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // ── Isolasi scope: semua sekolah dalam komunitas ini (termasuk arsip) ────────
  const { data: schools, error: schoolsErr } = await supabase
    .from("schools")
    .select("id, name, npsn, city")
    .eq("community_id", communityId);

  if (schoolsErr) {
    return NextResponse.json({ error: "Gagal mengambil data sekolah." }, { status: 500 });
  }

  const schoolIds = (schools ?? []).map((s) => s.id);
  if (schoolIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: per_school
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "per_school") {
    // Ambil agregat jumlah sesi per sekolah
    // TIDAK filter is_active → mendukung arsip permanen (spec §2.2.5)
    let sessionsQuery = supabase
      .from("assessment_sessions")
      .select("school_id, student_id")
      .in("school_id", schoolIds)
      .eq("is_void", false);

    if (categoryId !== "all") {
      sessionsQuery = sessionsQuery.eq("category_id", categoryId);
    }

    const { data: sessions, error: sessErr } = await sessionsQuery;

    if (sessErr) {
      return NextResponse.json({ error: "Gagal mengambil data sesi." }, { status: 500 });
    }

    // Agregat unik siswa per sekolah
    const countMap = new Map<string, Set<string>>();
    (sessions ?? []).forEach((s) => {
      if (!countMap.has(s.school_id)) countMap.set(s.school_id, new Set());
      if (s.student_id) countMap.get(s.school_id)!.add(s.student_id);
    });

    const schoolMap = new Map(schools!.map((s) => [s.id, s]));
    const data = schoolIds
      .filter((id) => countMap.has(id))
      .map((id) => ({
        school_id: id,
        school_name: schoolMap.get(id)?.name ?? "-",
        npsn: schoolMap.get(id)?.npsn ?? "-",
        city: schoolMap.get(id)?.city ?? "-",
        student_count: countMap.get(id)?.size ?? 0,
      }))
      .sort((a, b) => b.student_count - a.student_count);

    return NextResponse.json({ data });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: per_phase
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "per_phase") {
    // Ambil sesi per fase
    let sessionsQuery = supabase
      .from("assessment_sessions")
      .select("phase, student_id")
      .in("school_id", schoolIds)
      .eq("is_void", false)
      .not("phase", "is", null);

    if (categoryId !== "all") {
      sessionsQuery = sessionsQuery.eq("category_id", categoryId);
    }

    const { data: sessions, error: sessErr } = await sessionsQuery;

    if (sessErr) {
      return NextResponse.json({ error: "Gagal mengambil data sesi." }, { status: 500 });
    }

    // Agregat unik siswa per fase
    const phaseMap = new Map<string, Set<string>>();
    (sessions ?? []).forEach((s) => {
      const phase = s.phase as string;
      if (!phaseMap.has(phase)) phaseMap.set(phase, new Set());
      if (s.student_id) phaseMap.get(phase)!.add(s.student_id);
    });

    // Ambil rentang waktu per fase dari assessment_access
    // TIDAK filter is_active → mendukung arsip (spec §2.2.5)
    const distinctPhases = Array.from(phaseMap.keys());
    let accessQuery = supabase
      .from("assessment_access")
      .select("phase, valid_from, valid_until")
      .in("target_id", schoolIds)
      .eq("target_type", "school")
      .in("phase", distinctPhases);

    if (categoryId !== "all") {
      accessQuery = accessQuery.eq("category_id", categoryId);
    }

    const { data: accessData } = await accessQuery;

    // Ambil rentang waktu terluas per fase (max valid_until, min valid_from)
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
  // SECTION: per_level  (Opsi B: student_answers → questions.level_id → question_levels)
  // Gap 7.5 Decision: Opsi B - level yang benar-benar pernah dikerjakan.
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "per_level") {
    // Ambil session ids & student_id yang relevan di komunitas ini dulu
    let sessionsQuery = supabase
      .from("assessment_sessions")
      .select("id, student_id")
      .in("school_id", schoolIds)
      .eq("is_void", false);

    if (categoryId !== "all") {
      sessionsQuery = sessionsQuery.eq("category_id", categoryId);
    }

    const { data: sessions, error: sidErr } = await sessionsQuery;

    if (sidErr) {
      return NextResponse.json({ error: "Gagal mengambil data sesi." }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const sessionIds = sessions.map((s) => s.id);
    const sessionStudentMap = new Map<string, string>();
    sessions.forEach((s) => {
      if (s.student_id) sessionStudentMap.set(s.id, s.student_id);
    });

    // Ambil semua student_answers yang relevan, join questions → question_levels
    const { data: answers, error: answersErr } = await supabase
      .from("student_answers")
      .select(`
        session_id,
        questions (
          level_id,
          question_levels ( level_number )
        )
      `)
      .in("session_id", sessionIds);

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

    // Sort level_number ascending, hanya level yang punya data (spec §4.8.1.A)
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
