import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category_id = searchParams.get('category_id');
  const target_id = searchParams.get('target_id');
  const target_type = searchParams.get('target_type');
  const phase = searchParams.get('phase');

  if (!category_id || !target_id || !target_type) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Validate authorization (user must be authenticated)
  const headersList = await headers();
  const userRole = headersList.get('x-user-role');
  if (!userRole) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine school IDs to filter
  let schoolIds: string[] = [];

  if (target_type === 'school') {
    schoolIds = [target_id];
  } else if (target_type === 'community') {
    // Fetch all schools under this community
    const { data: schools } = await supabase
      .from('schools')
      .select('id')
      .eq('community_id', target_id);
    
    if (schools) {
      schoolIds = schools.map(s => s.id);
    }
  }

  if (schoolIds.length === 0) {
    return new NextResponse("NIS,Nama Siswa,Gender,Status,Skor,Waktu (detik),Tanggal\n", {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="hasil_ujian.csv"`
      }
    });
  }

  // Fetch assessment sessions
  let query = supabase
    .from('assessment_sessions')
    .select(`
      id,
      status,
      score,
      time_spent_sec,
      completed_at,
      phase,
      students (
        nis,
        full_name,
        gender
      )
    `)
    .eq('category_id', category_id)
    .in('school_id', schoolIds)
    .eq('is_void', false);

  if (phase) {
    query = query.eq('phase', phase);
  }

  const { data: sessions, error } = await query;

  if (error) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // Generate CSV
  const csvHeaders = ["NIS", "Nama Siswa", "Gender", "Fase", "Status", "Skor", "Waktu Pengerjaan (Detik)", "Tanggal Selesai"];
  
  const csvRows = (sessions || []).map(session => {
    const student = Array.isArray(session.students) ? session.students[0] : session.students;
    return [
      student?.nis || "-",
      `"${student?.full_name || "-"}"`,
      student?.gender || "-",
      session.phase || "-",
      session.status,
      session.score || 0,
      session.time_spent_sec || 0,
      session.completed_at ? new Date(session.completed_at).toLocaleString('id-ID') : "-"
    ].join(",");
  });

  const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hasil_ujian_${category_id.substring(0, 8)}.csv"`
    }
  });
}
