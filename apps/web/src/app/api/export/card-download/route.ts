import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/card-download
 *
 * Query params:
 *  - type: "level" | "phase" | "school" | "class"
 *  - category_id: UUID (wajib)
 *  - filter_value: string (level_number | phase | school_id | class_id) (wajib)
 *  - scope_type: "community" | "school" (wajib)
 *  - scope_id: UUID (wajib) — community_id atau school_id sesuai scope_type
 *
 * Menghasilkan file .xlsx per-baris siswa sesuai scope kartu yang diklik.
 * TIDAK filter is_active → mendukung arsip permanen (spec §2.2.5).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as "level" | "phase" | "school" | "class" | null;
  const categoryId = searchParams.get("category_id");
  const filterValue = searchParams.get("filter_value");
  const scopeType = searchParams.get("scope_type") as "community" | "school" | null;
  const scopeId = searchParams.get("scope_id");

  if (!type || !categoryId || !filterValue || !scopeType || !scopeId) {
    return NextResponse.json(
      { error: "Parameter type, category_id, filter_value, scope_type, scope_id wajib diisi." },
      { status: 400 }
    );
  }

  if (!["level", "phase", "school", "class"].includes(type)) {
    return NextResponse.json({ error: "type tidak valid." }, { status: 400 });
  }

  const supabase = createServerClient();

  // ── Tentukan school_ids berdasarkan scope ────────────────────────────────
  let schoolIds: string[] = [];

  if (scopeType === "community") {
    const { data: schools, error } = await supabase
      .from("schools")
      .select("id")
      .eq("community_id", scopeId)
      .eq("is_active", true);
    if (error) return NextResponse.json({ error: "Gagal mengambil sekolah komunitas." }, { status: 500 });
    schoolIds = (schools ?? []).map((s) => s.id);
  } else {
    // scope_type === "school"
    schoolIds = [scopeId];
  }

  if (schoolIds.length === 0) {
    return NextResponse.json({ error: "Tidak ada sekolah dalam scope ini." }, { status: 404 });
  }

  // ── Ambil sesi ujian sesuai scope ────────────────────────────────────────
  let sessionQuery = supabase
    .from("assessment_sessions")
    .select(`
      id,
      student_id,
      school_id,
      phase,
      attempt_number,
      status,
      score,
      completed_at,
      students (
        full_name,
        nisn,
        gender,
        class_id,
        classes ( name, grade )
      ),
      schools ( name, npsn )
    `)
    .in("school_id", schoolIds)
    .eq("category_id", categoryId)
    .eq("is_void", false);

  // Filter tambahan sesuai type
  if (type === "phase") {
    sessionQuery = sessionQuery.eq("phase", filterValue);
  } else if (type === "school") {
    sessionQuery = sessionQuery.eq("school_id", filterValue);
  }
  // type "level" dan "class" — filter dilakukan setelah fetch (butuh join ke answers/students)

  const { data: sessions, error: sessErr } = await sessionQuery.order("completed_at", { ascending: false });

  if (sessErr) {
    return NextResponse.json({ error: "Gagal mengambil data sesi." }, { status: 500 });
  }

  let filteredSessions = sessions ?? [];

  // ── Filter tambahan untuk type=class ────────────────────────────────────
  if (type === "class") {
    filteredSessions = filteredSessions.filter((s: any) => {
      const student = Array.isArray(s.students) ? s.students[0] : s.students;
      return student?.class_id === filterValue;
    });
  }

  // ── Filter tambahan untuk type=level (Opsi B — Gap 7.5) ─────────────────
  if (type === "level") {
    const targetLevelNumber = parseInt(filterValue, 10);
    if (isNaN(targetLevelNumber)) {
      return NextResponse.json({ error: "filter_value untuk type=level harus berupa angka." }, { status: 400 });
    }

    const sessionIdsAll = filteredSessions.map((s: any) => s.id);
    if (sessionIdsAll.length === 0) {
      filteredSessions = [];
    } else {
      // Ambil session_id yang punya jawaban di level ini
      const { data: answers } = await supabase
        .from("student_answers")
        .select(`
          session_id,
          questions (
            question_levels ( level_number )
          )
        `)
        .in("session_id", sessionIdsAll);

      const sessionIdsWithLevel = new Set<string>();
      (answers ?? []).forEach((ans: any) => {
        const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions;
        const lvl = Array.isArray(q?.question_levels)
          ? q?.question_levels[0]?.level_number
          : q?.question_levels?.level_number;
        if (lvl === targetLevelNumber) sessionIdsWithLevel.add(ans.session_id);
      });

      filteredSessions = filteredSessions.filter((s: any) => sessionIdsWithLevel.has(s.id));
    }
  }

  // ── Susun baris Excel ────────────────────────────────────────────────────
  const rows = filteredSessions.map((s: any) => {
    const student = Array.isArray(s.students) ? s.students[0] : s.students;
    const school = Array.isArray(s.schools) ? s.schools[0] : s.schools;
    const cls = Array.isArray(student?.classes) ? student?.classes[0] : student?.classes;

    return {
      "Nama Siswa": student?.full_name ?? "—",
      "NISN": student?.nisn ?? "—",
      "Gender": student?.gender === "L" ? "Laki-laki" : student?.gender === "P" ? "Perempuan" : "—",
      "Kelas": cls ? `${cls.grade} — ${cls.name}` : "—",
      "Sekolah": school?.name ?? "—",
      "NPSN Sekolah": school?.npsn ?? "—",
      "Fase Ujian": s.phase ?? "—",
      "Percobaan ke-": s.attempt_number ?? 1,
      "Status": s.status === "completed" ? "Selesai" : "Berlangsung",
      "Skor": s.score ?? 0,
      "Tanggal Selesai": s.completed_at
        ? new Date(s.completed_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "—",
    };
  });

  // ── Buat file Excel ──────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ "Info": "Tidak ada data untuk filter ini." }]);

  // Lebar kolom otomatis
  if (rows.length > 0) {
    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] ?? "").length)) + 2,
    }));
    ws["!cols"] = colWidths;
  }

  XLSX.utils.book_append_sheet(wb, ws, "Hasil Ujian");

  // Nama file deskriptif (spec §4.10)
  const dateStr = new Date().toISOString().split("T")[0];
  const typeLabel: Record<string, string> = {
    level: `Level-${filterValue}`,
    phase: filterValue.replace(/\s+/g, "-"),
    school: `Sekolah`,
    class: `Kelas`,
  };
  const fileName = `hasil-ujian_${typeLabel[type]}_${dateStr}.xlsx`;

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "no-store",
    },
  });
}
