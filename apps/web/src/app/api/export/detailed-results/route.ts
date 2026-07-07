import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: group baris view per sekolah untuk Sheet 1 — Ringkasan Sekolah
// ─────────────────────────────────────────────────────────────────────────────
function buildRingkasanSekolah(rows: any[]) {
  const schools = new Map<string, any>();

  rows.forEach((row) => {
    const sid = row.school_id;
    if (!schools.has(sid)) {
      schools.set(sid, {
        Komunitas:       row.community_name ?? "—",
        Sekolah:         row.school_name    ?? "—",
        NPSN:            row.npsn           ?? "—",
        Provinsi:        row.province       ?? "—",
        Kota:            row.city           ?? "—",
        _totalStudents:  new Set<string>(),
        _completedCount: 0,
        _scores:         [] as number[],
        _levels:         [] as number[],
      });
    }
    const s = schools.get(sid)!;
    if (row.student_id) s._totalStudents.add(row.student_id);
    if (row.session_status === "completed") {
      s._completedCount++;
      if (row.final_score != null)       s._scores.push(Number(row.final_score));
      if (row.final_level_number != null) s._levels.push(Number(row.final_level_number));
    }
  });

  return Array.from(schools.values()).map((s) => {
    const avgScore  = s._scores.length > 0
      ? (s._scores.reduce((a: number, b: number) => a + b, 0) / s._scores.length).toFixed(1)
      : "—";
    const maxLevel  = s._levels.length > 0 ? Math.max(...s._levels) : "—";
    const total     = s._totalStudents.size;
    const passRate  = total > 0 ? ((s._completedCount / total) * 100).toFixed(1) + "%" : "—";

    return {
      Komunitas:        s.Komunitas,
      Sekolah:          s.Sekolah,
      NPSN:             s.NPSN,
      Provinsi:         s.Provinsi,
      Kota:             s.Kota,
      "Jumlah Siswa":   total,
      "Siswa Selesai":  s._completedCount,
      "Rata-rata Skor": avgScore,
      "Level Tertinggi": maxLevel,
      "% Selesai":       passRate,
    };
  }).sort((a, b) => a.Sekolah.localeCompare(b.Sekolah));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build Sheet 3 — Hasil per Level dari student_answers
// ─────────────────────────────────────────────────────────────────────────────
function buildHasilPerLevel(
  viewRows: any[],
  answers: any[]
): any[] {
  // index answers by session_id → grouped by level
  const bySessionLevel = new Map<string, Map<number, { correct: number; total: number }>>();

  answers.forEach((ans: any) => {
    const sid = ans.session_id;
    const lvl = ans.questions?.question_levels?.level_number ?? 0;
    if (!bySessionLevel.has(sid)) bySessionLevel.set(sid, new Map());
    const lvlMap = bySessionLevel.get(sid)!;
    if (!lvlMap.has(lvl)) lvlMap.set(lvl, { correct: 0, total: 0 });
    const agg = lvlMap.get(lvl)!;
    agg.total++;
    if (ans.is_correct === true) agg.correct++;
  });

  const result: any[] = [];

  viewRows.forEach((row) => {
    if (!row.session_id) return;
    const lvlMap = bySessionLevel.get(row.session_id);
    if (!lvlMap) return;

    lvlMap.forEach((agg, levelNumber) => {
      const pct = agg.total > 0 ? ((agg.correct / agg.total) * 100).toFixed(1) + "%" : "—";
      result.push({
        Komunitas:      row.community_name   ?? "—",
        Sekolah:        row.school_name      ?? "—",
        "Nama Siswa":   row.student_name     ?? "—",
        NISN:           row.nisn             ?? "—",
        Fase:           row.phase            ?? "—",
        Level:          levelNumber,
        "Soal Dijawab": agg.total,
        "Jawaban Benar": agg.correct,
        "% Benar":       pct,
        "Level Dicapai": row.final_level_number ?? "—",
      });
    });
  });

  return result.sort((a, b) => {
    const school = a.Sekolah.localeCompare(b.Sekolah);
    if (school !== 0) return school;
    return a.Level - b.Level;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build Sheet Analisis Soal (Item Analysis)
// ─────────────────────────────────────────────────────────────────────────────
function buildAnalisisSoal(allQuestions: any[], answers: any[], levelMap: Map<string, number>) {
  const byQuestion = new Map<string, { total: number; correct: number; incorrect: number; totalTime: number }>();
  
  answers.forEach((ans) => {
    const qid = ans.question_id;
    if (!qid) return;
    if (!byQuestion.has(qid)) {
      byQuestion.set(qid, { total: 0, correct: 0, incorrect: 0, totalTime: 0 });
    }
    const stat = byQuestion.get(qid)!;
    stat.total++;
    if (ans.is_correct === true) stat.correct++;
    else if (ans.is_correct === false) stat.incorrect++;
    stat.totalTime += Number(ans.time_spent_sec || 0);
  });

  const levelCounts: Record<number, number> = {};

  return allQuestions.map((q) => {
    const ln = levelMap.get(q.level_id) ?? 0;
    levelCounts[ln] = (levelCounts[ln] ?? 0) + 1;
    const stat = byQuestion.get(q.id) || { total: 0, correct: 0, incorrect: 0, totalTime: 0 };
    const pctNum = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
    const pctStr = stat.total > 0 ? pctNum.toFixed(1) + "%" : "—";
    
    let difficulty = "—";
    if (stat.total > 0) {
      if (pctNum < 30) difficulty = "Sulit";
      else if (pctNum <= 70) difficulty = "Sedang";
      else difficulty = "Mudah";
    }

    const avgTime = stat.total > 0 ? (stat.totalTime / stat.total).toFixed(1) : "0";

    return {
      Level: `Level ${ln}`,
      "Urutan Soal (Admin)": `Soal ${levelCounts[ln]}`,
      "Teks Soal": q.question_text ?? "—",
      "Tipe Soal": q.question_type ?? "—",
      "Total Siswa Menjawab": stat.total,
      "Jumlah Benar": stat.correct,
      "Jumlah Salah": stat.incorrect,
      "Persentase Benar (%)": pctStr,
      "Kategori Kesulitan": difficulty,
      "Rata-rata Waktu (Detik)": avgTime,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/export/detailed-results
//
// Export Excel 5 Sheet via v_assessment_report VIEW + student_answers detail.
//
// Params:
//   - category_id (required)
//   - target_id   — school_id, community_id, atau 'all'
//   - target_type — 'school' | 'community' | 'teacher' | 'all'
//   - phase       (optional)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category_id = searchParams.get("category_id");
  const target_id   = searchParams.get("target_id");
  const target_type = searchParams.get("target_type");
  const phase       = searchParams.get("phase");

  if (!category_id || !target_id || !target_type) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const supabase    = createServerClient();
  const headersList = await headers();
  const userRole    = headersList.get("x-user-role");

  if (!userRole) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 1. Query v_assessment_report ─────────────────────────────────────────
  let viewQuery = (supabase as any)
    .from("v_assessment_report")
    .select(`
      access_id, phase, valid_from, valid_until,
      category_id, category_name, subject_area,
      community_id, community_name,
      school_id, school_name, npsn, province, city,
      class_id, class_name, grade,
      teacher_name,
      student_id, student_name, student_username,
      nisn, gender, birth_date,
      ses_class, ses_score,
      student_province, student_city, student_district, student_village,
      session_id, session_status, started_at, completed_at,
      final_score, time_spent_sec, attempt_number, is_void,
      current_level_id, final_level_number, passing_threshold
    `)
    .eq("category_id", category_id)
    .not("session_id", "is", null);

  // ── Keamanan Hirarki (RLS / Isolation) ────────────────────────────────────
  const userCommunityId = headersList.get("x-community-id");
  const userSchoolId    = headersList.get("x-school-id");
  const userId          = headersList.get("x-user-id");

  if (userRole === "community") {
    if (!userCommunityId) return NextResponse.json({ error: "Community ID missing" }, { status: 403 });
    viewQuery = viewQuery.eq("community_id", userCommunityId);
  } else if (userRole === "school") {
    if (!userSchoolId) return NextResponse.json({ error: "School ID missing" }, { status: 403 });
    viewQuery = viewQuery.eq("school_id", userSchoolId);
  } else if (userRole === "teacher") {
    if (!userId) return NextResponse.json({ error: "Teacher ID missing" }, { status: 403 });
    const { data: teacherClasses } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", userId);
    const teacherClassIds = (teacherClasses ?? []).map((c: any) => c.id);
    if (teacherClassIds.length === 0) {
      return NextResponse.json({ data: [] });
    }
    viewQuery = viewQuery.in("class_id", teacherClassIds);
  }

  // ── Filter Target & Opsional dari UI ──────────────────────────────────────
  if (target_type === "school" && target_id !== "all") {
    viewQuery = viewQuery.eq("school_id", target_id);
  } else if (target_type === "community" && target_id !== "all") {
    viewQuery = viewQuery.eq("community_id", target_id);
  } else if (target_type === "teacher" && target_id !== "all") {
    const { data: tClasses } = await supabase.from("classes").select("id").eq("teacher_id", target_id);
    const tClassIds = (tClasses ?? []).map((c: any) => c.id);
    if (tClassIds.length > 0) viewQuery = viewQuery.in("class_id", tClassIds);
    else return NextResponse.json({ data: [] });
  }

  const school_id = searchParams.get("school_id");
  const class_id  = searchParams.get("class_id");
  const gender    = searchParams.get("gender");
  const ses_class = searchParams.get("ses_class");
  const search    = searchParams.get("search");

  if (school_id && school_id !== "all") viewQuery = viewQuery.eq("school_id", school_id);
  if (class_id && class_id !== "all")   viewQuery = viewQuery.eq("class_id", class_id);
  if (gender && gender !== "all")       viewQuery = viewQuery.eq("gender", gender);
  if (ses_class && ses_class !== "all") viewQuery = viewQuery.eq("ses_class", ses_class);
  if (phase && phase !== "all")         viewQuery = viewQuery.eq("phase", phase);
  if (search) {
    viewQuery = viewQuery.or(`student_name.ilike.%${search}%,nisn.ilike.%${search}%,student_username.ilike.%${search}%`);
  }

  const { data: viewData, error: viewErr } = await viewQuery;

  if (viewErr) {
    console.error("[export/detailed-results] view error:", viewErr);
    return NextResponse.json({ error: "Gagal mengambil data laporan." }, { status: 500 });
  }

  let rows: any[] = (viewData as any[]) ?? [];

  // ── 2. Fetch detail jawaban + soal + level untuk Sheet 3, 4, 5 ───────────────
  let sessionIds: string[] = [
    ...new Set(rows.map((r: any) => r.session_id as string).filter(Boolean))
  ];
  let studentIds: string[] = [
    ...new Set(rows.map((r: any) => r.student_id as string).filter(Boolean))
  ];

  let answers: any[] = [];
  let allQuestions: any[] = [];
  let levelMap = new Map<string, number>();

  if (sessionIds.length > 0) {
    const { data: answersData } = await supabase
      .from("student_answers")
      .select(`
        id, session_id, question_id,
        is_correct, score, answer_data, time_spent_sec, answered_at,
        recording_url,
        questions (
          id, question_text, question_type, subject_area, level_id,
          order_index,
          question_levels ( level_number )
        )
      `)
      .in("session_id", sessionIds);

    answers = answersData ?? [];

    const levelParam = searchParams.get("level");
    if (levelParam && levelParam !== "all") {
      const targetLevelNum = parseInt(levelParam, 10);
      if (!isNaN(targetLevelNum)) {
        const sessionIdsWithLevel = new Set<string>();
        answers.forEach((ans) => {
          const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions;
          const lvl = Array.isArray(q?.question_levels)
            ? q?.question_levels[0]?.level_number
            : q?.question_levels?.level_number;
          if (lvl === targetLevelNum) sessionIdsWithLevel.add(ans.session_id);
        });
        rows = rows.filter((r: any) => sessionIdsWithLevel.has(r.session_id));
        sessionIds = [...new Set(rows.map((r: any) => r.session_id as string).filter(Boolean))];
        studentIds = [...new Set(rows.map((r: any) => r.student_id as string).filter(Boolean))];

        // Filter jawaban: HANYA untuk soal di level tersebut!
        answers = answers.filter((ans) => {
          const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions;
          const lvl = Array.isArray(q?.question_levels)
            ? q?.question_levels[0]?.level_number
            : q?.question_levels?.level_number;
          return lvl === targetLevelNum;
        });
      }
    }

    // Kumpulkan level_id yang benar-benar dikerjakan pada sesi/filter ini
    const activeLevelIds = new Set<string>();
    answers.forEach((ans) => {
      const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions;
      if (q?.level_id) activeLevelIds.add(q.level_id);
    });

    const { data: levelsData } = await supabase
      .from("question_levels")
      .select("id, level_number")
      .eq("category_id", category_id);

    (levelsData ?? []).forEach((l) => {
      if (levelParam && levelParam !== "all") {
        const targetLevelNum = parseInt(levelParam, 10);
        if (!isNaN(targetLevelNum) && l.level_number !== targetLevelNum) {
          return;
        }
      } else if (activeLevelIds.size > 0 && !activeLevelIds.has(l.id)) {
        return;
      }
      levelMap.set(l.id, l.level_number);
    });

    const levelIds = [...levelMap.keys()];
    if (levelIds.length > 0) {
      const { data: qData } = await supabase
        .from("questions")
        .select("id, level_id, order_index, created_at, question_text, question_type")
        .in("level_id", levelIds);

      allQuestions = (qData ?? []).sort((a, b) => {
        const lnA = levelMap.get(a.level_id) ?? 0;
        const lnB = levelMap.get(b.level_id) ?? 0;
        if (lnA !== lnB) return lnA - lnB;
        if ((a.order_index ?? 0) !== (b.order_index ?? 0)) return (a.order_index ?? 0) - (b.order_index ?? 0);
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }
  }

  // Fetch demografi orang tua dari tabel students
  const studentDemoMap = new Map<string, any>();
  if (studentIds.length > 0) {
    const { data: stData } = await supabase
      .from("students")
      .select("id, father_education_id, mother_education_id, father_occupation_id, mother_occupation_id")
      .in("id", studentIds);
    (stData ?? []).forEach((s) => studentDemoMap.set(s.id, s));
  }

  // Fetch ses_variables untuk label SES
  const { data: sesVars } = await supabase.from("ses_variables").select("id, name");
  const sesMap = new Map<string, string>();
  (sesVars ?? []).forEach((v) => sesMap.set(v.id, v.name));

  // ── Build question index & headers ────────────────────────────────────────
  const questionIndexMap = new Map<string, number>();
  const questionHeaders: string[] = [];
  const levelCounts: Record<number, number> = {};

  allQuestions.forEach((q) => {
    const ln = levelMap.get(q.level_id) ?? 0;
    levelCounts[ln] = (levelCounts[ln] ?? 0) + 1;
    questionIndexMap.set(q.id, questionHeaders.length);
    questionHeaders.push(`[Level ${ln}] Soal ${levelCounts[ln]}`);
  });

  // Map jawaban per sesi dan soal (1 = benar, 0 = salah) untuk matriks di Sheet 2
  const answerMatrixMap = new Map<string, Map<string, number>>();
  answers.forEach((ans) => {
    if (!ans.session_id || !ans.question_id) return;
    if (!answerMatrixMap.has(ans.session_id)) answerMatrixMap.set(ans.session_id, new Map());
    const val = ans.is_correct ? 1 : 0;
    answerMatrixMap.get(ans.session_id)!.set(ans.question_id, val);
  });

  // ── 3. WORKBOOK ───────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  // ── SHEET 1: Ringkasan Sekolah ────────────────────────────────────────────
  const sheet1 = buildRingkasanSekolah(rows);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), "Ringkasan Sekolah");

  // ── SHEET 2: Data Siswa Lengkap + Matriks Soal ────────────────────────────
  const sheet2Headers = [
    "Komunitas", "Sekolah", "NPSN", "Kelas", "Guru",
    "Nama Siswa", "Username", "NISN", "Gender", "Tanggal Lahir",
    "Pendidikan Ayah", "Pendidikan Ibu", "Pekerjaan Ayah", "Pekerjaan Ibu",
    "SES Class", "SES Score",
    "Provinsi", "Kota", "Kecamatan", "Desa",
    "Fase", "Status", "Skor Akhir", "Level Dicapai",
    "Waktu (Detik)", "Percobaan ke", "Mulai", "Selesai",
    ...questionHeaders,
  ];

  const sheet2Data = rows.map((row) => {
    const demo = studentDemoMap.get(row.student_id) || {};
    const pendAyah = sesMap.get(demo.father_education_id) ?? "—";
    const pendIbu  = sesMap.get(demo.mother_education_id) ?? "—";
    const kerjAyah = sesMap.get(demo.father_occupation_id) ?? "—";
    const kerjIbu  = sesMap.get(demo.mother_occupation_id) ?? "—";

    const baseRow: Record<string, any> = {
      Komunitas:         row.community_name    ?? "—",
      Sekolah:           row.school_name       ?? "—",
      NPSN:              row.npsn              ?? "—",
      Kelas:             row.class_name        ? `Kelas ${row.grade} - ${row.class_name}` : "—",
      Guru:              row.teacher_name      ?? "—",
      "Nama Siswa":      row.student_name      ?? "—",
      Username:          row.student_username  ?? "—",
      NISN:              row.nisn              ?? "—",
      Gender:            row.gender            ?? "—",
      "Tanggal Lahir":   row.birth_date        ?? "—",
      "Pendidikan Ayah": pendAyah,
      "Pendidikan Ibu":  pendIbu,
      "Pekerjaan Ayah":  kerjAyah,
      "Pekerjaan Ibu":   kerjIbu,
      "SES Class":       row.ses_class         ?? "—",
      "SES Score":       row.ses_score         ?? "—",
      Provinsi:          row.student_province  ?? "—",
      Kota:              row.student_city      ?? "—",
      Kecamatan:         row.student_district  ?? "—",
      Desa:              row.student_village   ?? "—",
      Fase:              row.phase             ?? "—",
      Status:            row.session_status    ?? "—",
      "Skor Akhir":      row.final_score       ?? "—",
      "Level Dicapai":   row.final_level_number ?? "—",
      "Waktu (Detik)":   row.time_spent_sec    ?? 0,
      "Percobaan ke":    row.attempt_number    ?? 1,
      Mulai:             row.started_at        ? new Date(row.started_at).toLocaleString("id-ID") : "—",
      Selesai:           row.completed_at      ? new Date(row.completed_at).toLocaleString("id-ID") : "—",
    };

    const sessMatrix = answerMatrixMap.get(row.session_id);
    allQuestions.forEach((q, idx) => {
      const headerName = questionHeaders[idx];
      baseRow[headerName] = sessMatrix && sessMatrix.has(q.id) ? sessMatrix.get(q.id) : 0;
    });

    return baseRow;
  });

  const ws2 = XLSX.utils.json_to_sheet(sheet2Data, { header: sheet2Headers });
  XLSX.utils.book_append_sheet(wb, ws2, "Data Siswa");

  // ── SHEET 3: Analisis Soal (Item Analysis) ────────────────────────────────
  const sheetAnalisisData = buildAnalisisSoal(allQuestions, answers, levelMap);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sheetAnalisisData.length > 0 ? sheetAnalisisData : [{}]),
    "Analisis Soal"
  );

  // ── SHEET 4: Hasil per Level ──────────────────────────────────────────────
  const sheet3Data = buildHasilPerLevel(rows, answers);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sheet3Data.length > 0 ? sheet3Data : [{}]),
    "Hasil per Level"
  );

  // ── SHEET 5: Detail Jawaban (Diurutkan berdasarkan Urutan Admin Soal) ─────
  const studentBySession = new Map<string, string>();
  rows.forEach((r) => { if (r.session_id) studentBySession.set(r.session_id, r.student_name ?? "—"); });

  // Urutkan jawaban: Nama Siswa -> Level -> order_index
  const sortedAnswers = [...answers].sort((a, b) => {
    const nameA = studentBySession.get(a.session_id) ?? "";
    const nameB = studentBySession.get(b.session_id) ?? "";
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    const lnA = (a.questions as any)?.question_levels?.level_number ?? 0;
    const lnB = (b.questions as any)?.question_levels?.level_number ?? 0;
    if (lnA !== lnB) return lnA - lnB;
    const ordA = (a.questions as any)?.order_index ?? 0;
    const ordB = (b.questions as any)?.order_index ?? 0;
    return ordA - ordB;
  });

  const sheet4Data = sortedAnswers.map((ans) => {
    const qObj = (ans.questions as any) || {};
    const lvlNum = qObj?.question_levels?.level_number ?? "—";
    const ordIdx = qObj?.order_index != null ? `Soal ${qObj.order_index}` : "—";

    return {
      "Session ID":          ans.session_id,
      "Nama Siswa":          studentBySession.get(ans.session_id) ?? "—",
      Level:                 lvlNum,
      "Urutan Soal (Admin)": ordIdx,
      Soal:                  qObj?.question_text ?? "—",
      "Tipe Soal":           qObj?.question_type ?? "—",
      Jawaban:               ans.answer_data ? JSON.stringify(ans.answer_data) : "—",
      Benar:                 ans.is_correct ? "Ya" : "Tidak",
      Skor:                  ans.score ?? 0,
      "Waktu (Detik)":       ans.time_spent_sec ?? 0,
      "Ada Rekaman":         ans.recording_url ? "Ya" : "Tidak",
      "Dijawab Pada":        ans.answered_at ? new Date(ans.answered_at).toLocaleString("id-ID") : "—",
    };
  });

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sheet4Data.length > 0 ? sheet4Data : [{}]),
    "Detail Jawaban"
  );

  // ── Generate filename ─────────────────────────────────────────────────────
  const ts       = new Date().toISOString().slice(0, 10);
  const phaseStr = phase ? `_${phase.replace(/\s+/g, "-")}` : "";
  const levelStr = searchParams.get("level") ? `_Level-${searchParams.get("level")}` : "";
  const classStr = searchParams.get("class_id") && searchParams.get("class_id") !== "all" ? `_Kelas` : "";
  const filename = `Laporan_PEMANTIK${phaseStr}${levelStr}${classStr}_${ts}.xlsx`;

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
