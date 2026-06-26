import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category_id = searchParams.get('category_id');
  const target_id = searchParams.get('target_id'); // e.g. community_id or school_id
  const target_type = searchParams.get('target_type'); // 'community' | 'school' | 'super-admin'
  const phase = searchParams.get('phase');

  if (!category_id || !target_id || !target_type) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const supabase = createServerClient();

  // 1. Determine school IDs to filter
  let schoolIds: string[] = [];
  let studentIds: string[] = [];

  if (target_type === 'school') {
    schoolIds = [target_id];
  } else if (target_type === 'community') {
    const { data: schools } = await supabase
      .from('schools')
      .select('id')
      .eq('community_id', target_id);
    if (schools) {
      schoolIds = schools.map(s => s.id);
    }
  } else if (target_type === 'super-admin') {
    // Super admin can see all or filter by a specific param if needed. 
    // We'll leave it empty to signify no filter if they want all, but usually we filter by target.
  } else if (target_type === 'teacher') {
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', target_id);
      
    if (classes && classes.length > 0) {
      const classIds = classes.map(c => c.id);
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .in('class_id', classIds);
      if (students) {
        studentIds = students.map(s => s.id);
      }
    }
  }

  // 1.5 Fetch SES variables to map education and occupation IDs
  const { data: sesVars } = await supabase.from('ses_variables').select('id, name');
  const sesMap = new Map<string, string>();
  sesVars?.forEach(v => sesMap.set(v.id, v.name));

  // 2. Fetch assessment sessions WITH student_answers and questions
  let query = supabase
    .from('assessment_sessions')
    .select(`
      id,
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
        ses_class,
        province,
        city,
        district,
        village,
        father_education_id,
        mother_education_id,
        father_occupation_id,
        mother_occupation_id,
        schools ( name ),
        classes ( name, grade )
      ),
      student_answers (
        is_correct,
        score,
        answer_data,
        questions (
          id,
          subject_area,
          question_type,
          question_text
        )
      )
    `)
    .eq('category_id', category_id)
    .eq('is_void', false);

  if (schoolIds.length > 0) {
    query = query.in('school_id', schoolIds);
  } else if (target_type === 'teacher' && studentIds.length > 0) {
    query = query.in('student_id', studentIds);
  }

  if (phase) {
    query = query.eq('phase', phase);
  }

  const { data: sessions, error } = await query;

  if (error) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // Fetch levels to get their IDs and numbers
  const { data: levels } = await supabase
    .from('question_levels')
    .select('id, level_number')
    .eq('category_id', category_id);

  const levelMap = new Map<string, number>();
  levels?.forEach(l => levelMap.set(l.id, l.level_number));
  const levelIds = levels ? levels.map(l => l.id) : [];

  let allQuestions: any[] = [];
  if (levelIds.length > 0) {
    const { data: questionsData } = await supabase
      .from('questions')
      .select('id, level_id, order_index, created_at')
      .in('level_id', levelIds);

    // Sort in JS: first by level_number, then order_index, then created_at
    allQuestions = (questionsData || []).sort((a, b) => {
      const lnA = levelMap.get(a.level_id) || 0;
      const lnB = levelMap.get(b.level_id) || 0;
      if (lnA !== lnB) return lnA - lnB;
      if (a.order_index !== b.order_index) return (a.order_index || 0) - (b.order_index || 0);
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  const questionIndexMap = new Map<string, number>();
  const questionHeaders: string[] = [];

  if (allQuestions) {
    // Group by level to count the sequence properly
    const levelCounts: Record<string, number> = {};
    allQuestions.forEach((q, index) => {
      questionIndexMap.set(q.id, index);
      const ln = levelMap.get(q.level_id) ?? '?';
      if (!levelCounts[ln]) levelCounts[ln] = 1;
      else levelCounts[ln]++;
      const sequence = levelCounts[ln];
      questionHeaders.push(`[Level ${ln}] Soal ${sequence}`);
    });
  }

  const headers = [
    "NISN", "Nama Siswa", "Gender", "Kelas", "SES", "Sekolah", "Fase",
    "Provinsi", "Kabupaten", "Kecamatan", "Desa", 
    "Pendidikan Ayah", "Pendidikan Ibu", "Pekerjaan Ayah", "Pekerjaan Ibu",
    "Percobaan ke", "Status", "Jumlah Soal", "Jawaban Benar", "Jawaban Salah",
    "Skor Total", "Skor Literasi", "Skor Numerasi", "Waktu Pengerjaan (Detik)", "Tanggal Selesai"
  ];

  // Append master question headers
  headers.push(...questionHeaders);

  // If community has no schools, or teacher has no students, return empty XLSX
  if ((target_type === 'community' && schoolIds.length === 0) || (target_type === 'teacher' && studentIds.length === 0)) {
    const emptyWorkbook = XLSX.utils.book_new();
    const emptyWorksheet = XLSX.utils.json_to_sheet([], { header: headers });
    XLSX.utils.book_append_sheet(emptyWorkbook, emptyWorksheet, "Hasil Ujian");
    const emptyBuffer = XLSX.write(emptyWorkbook, { bookType: 'xlsx', type: 'array' });

    return new NextResponse(emptyBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan_detail_${category_id.substring(0, 8)}.xlsx"`
      }
    });
  }

  // (Query was moved above)

  // 3. Generate Excel using xlsx
  const excelData = (sessions || []).map(session => {
    const student: any = Array.isArray(session.students) ? session.students[0] : session.students;
    const answers: any[] = session.student_answers || [];

    // Aggregations
    let scoreLit = 0;
    let scoreNum = 0;
    let totalCorrect = 0;

    answers.forEach(ans => {
      const q = ans.questions;
      const isCorrect = ans.is_correct === true;
      const pointValue = ans.score ?? (isCorrect ? 1 : 0);
      if (!q) return;
      if (isCorrect) totalCorrect++;

      // Subject
      if (q.subject_area === 'literasi') scoreLit += pointValue;
      if (q.subject_area === 'numerasi') scoreNum += pointValue;
    });

    const cls = student?.classes;
    const className = cls ? `Kelas ${cls.grade} - ${cls.name}` : "-";

    const rowData: any = {
      "NISN": student?.nisn || "-",
      "Nama Siswa": student?.full_name || "-",
      "Gender": student?.gender || "-",
      "Kelas": className,
      "SES": student?.ses_class || "-",
      "Sekolah": student?.schools?.name || "-",
      "Fase": session.phase || "-",
      "Provinsi": student?.province || "-",
      "Kabupaten": student?.city || "-",
      "Kecamatan": student?.district || "-",
      "Desa": student?.village || "-",
      "Pendidikan Ayah": student?.father_education_id ? sesMap.get(student.father_education_id) || "-" : "-",
      "Pendidikan Ibu": student?.mother_education_id ? sesMap.get(student.mother_education_id) || "-" : "-",
      "Pekerjaan Ayah": student?.father_occupation_id ? sesMap.get(student.father_occupation_id) || "-" : "-",
      "Pekerjaan Ibu": student?.mother_occupation_id ? sesMap.get(student.mother_occupation_id) || "-" : "-",
      "Percobaan ke": session.attempt_number ?? 1,
      "Status": session.status,
      "Jumlah Soal": answers.length,
      "Jawaban Benar": totalCorrect,
      "Jawaban Salah": answers.length - totalCorrect,
      "Skor Total": session.score ?? totalCorrect,
      "Skor Literasi": scoreLit,
      "Skor Numerasi": scoreNum,
      "Waktu Pengerjaan (Detik)": session.time_spent_sec || 0,
      "Tanggal Selesai": session.completed_at ? new Date(session.completed_at).toLocaleString('id-ID') : "-"
    };

    // Initialize all question columns to "-"
    questionHeaders.forEach(header => {
      rowData[header] = "-";
    });

    // Map answers to their specific master question column
    answers.forEach(ans => {
      if (ans.questions && ans.questions.id) {
        const idx = questionIndexMap.get(ans.questions.id);
        if (idx !== undefined) {
          const headerName = questionHeaders[idx];
          rowData[headerName] = ans.is_correct ? "Benar" : "Salah";
        }
      }
    });

    return rowData;
  });

  // Create worksheet and workbook
  const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Ujian");

  // Generate array buffer (safest for Next.js NextResponse)
  const excelArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  return new NextResponse(excelArray, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="laporan_detail_${category_id.substring(0, 8)}.xlsx"`
    }
  });
}
