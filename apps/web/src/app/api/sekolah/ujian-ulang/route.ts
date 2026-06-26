import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/sekolah/ujian-ulang
 * 
 * Mekanisme Ujian Ulang:
 * 1. Verifikasi kelas milik sekolah ini
 * 2. Void semua sesi ongoing/completed yang tidak void untuk kombinasi kelas + kategori
 * 3. Siswa yang bersangkutan kini bisa memulai sesi baru
 */
export async function POST(request: Request) {
  try {
    const { class_id, student_id, category_id, school_id } = await request.json();

    if (!class_id || !category_id || !school_id) {
      return NextResponse.json(
        { error: "class_id, category_id, dan school_id wajib diisi." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 1. Verifikasi kelas benar-benar milik sekolah ini (keamanan kritis)
    const { data: cls } = await supabase
      .from("classes")
      .select("id, school_id, name")
      .eq("id", class_id)
      .eq("school_id", school_id)
      .maybeSingle();

    if (!cls) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan atau bukan milik sekolah ini." },
        { status: 403 }
      );
    }

    // 2. Dapatkan student_id
    let studentIds: string[] = [];

    if (student_id) {
      // Jika siswa spesifik, verifikasi siswa itu ada di kelas tersebut
      const { data: singleStudent } = await supabase
        .from("students")
        .select("id")
        .eq("id", student_id)
        .eq("class_id", class_id)
        .eq("school_id", school_id)
        .maybeSingle();

      if (!singleStudent) {
        return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
      }
      studentIds = [singleStudent.id];
    } else {
      // Jika seluruh kelas
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", class_id)
        .eq("school_id", school_id);

      if (!students || students.length === 0) {
        return NextResponse.json({ success: true, voidedCount: 0 });
      }
      studentIds = students.map((s: any) => s.id);
    }

    // 3. Void semua sesi yang belum di-void untuk kategori ini
    const { data: voidedSessions, error: voidError } = await supabase
      .from("assessment_sessions")
      .update({ is_void: true })
      .in("student_id", studentIds)
      .eq("category_id", category_id)
      .eq("is_void", false)
      .select("id");

    if (voidError) {
      return NextResponse.json(
        { error: "Gagal memproses ujian ulang: " + voidError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      voidedCount: voidedSessions?.length ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
