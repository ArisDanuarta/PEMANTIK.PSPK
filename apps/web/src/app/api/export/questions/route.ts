import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    const headersList = await headers();
    const userRole = headersList.get("x-user-role");

    const supabase = createServerClient();
    
    // Auth check based on middleware headers (if available) or let RLS handle it
    const role = userRole || headersList.get("x-supabase-role");
    
    // You can add strict role checking here if needed
    // if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let query = supabase
      .from("questions")
      .select("*, question_levels(*, question_categories(*))");

    // Terapkan filter yang sama dengan halaman Admin Soal
    if (subject) query = query.eq("subject_area", subject as any);
    if (type) query = query.eq("question_type", type as any);
    if (status === "published") query = query.eq("is_published", true);
    if (status === "draft") query = query.eq("is_published", false);
    if (search) query = query.ilike("question_text", `%${search}%`);

    query = query.order("created_at", { ascending: false });

    const { data: questions, error } = await query;

    if (error) {
      console.error("[export/questions] error:", error);
      return NextResponse.json({ error: "Gagal mengambil data soal." }, { status: 500 });
    }

    // Format Data untuk Excel
    const excelData = (questions || []).map((q: any) => {
      // Ambil Level & Kategori
      const level = Array.isArray(q.question_levels) ? q.question_levels[0] : q.question_levels;
      const category = level ? (Array.isArray(level.question_categories) ? level.question_categories[0] : level.question_categories) : null;

      const levelNumber = level?.level_number != null ? `Level ${level.level_number}` : "-";
      const categoryName = category?.name || "-";
      const learningObj = level?.learning_objective || "-";
      const passingThreshold = level?.passing_threshold ?? "-";

      // Format Opsi Jawaban (Gabungkan jika berupa array)
      let optionsStr = "-";
      if (Array.isArray(q.options)) {
        optionsStr = q.options.map((opt: any, i: number) => {
          if (typeof opt === 'string') return `${String.fromCharCode(65 + i)}. ${opt}`;
          if (opt && opt.text) return `${String.fromCharCode(65 + i)}. ${opt.text}`;
          if (opt && opt.value) return `${String.fromCharCode(65 + i)}. ${opt.value}`;
          return `${String.fromCharCode(65 + i)}. [Objek Jawaban]`;
        }).join("\n");
      }

      // Format Jawaban Benar
      let correctStr = "-";
      if (q.correct_answer != null) {
        if (typeof q.correct_answer === 'string' || typeof q.correct_answer === 'number') {
          correctStr = String(q.correct_answer);
        } else if (Array.isArray(q.correct_answer)) {
          correctStr = q.correct_answer.join(", ");
        } else {
          correctStr = JSON.stringify(q.correct_answer);
        }
      }

      // Ambil URL Media jika ada
      const mediaUrl = q.question_image_url || q.question_audio_url || q.question_video_url || "-";
      
      // Hitung tipe
      let typeLabel = q.question_type;
      switch(q.question_type) {
        case 'multiple_choice': typeLabel = 'Pilihan Ganda'; break;
        case 'image_choice': typeLabel = 'Pilihan Gambar'; break;
        case 'drag_drop': typeLabel = 'Drag & Drop'; break;
        case 'audio_question': typeLabel = 'Audio'; break;
        case 'video_question': typeLabel = 'Video'; break;
        case 'voice_recording': typeLabel = 'Rekaman Suara'; break;
      }

      return {
        "Kode Soal": q.question_code || "-",
        "Tipe Soal": typeLabel || "-",
        "Status": q.is_published ? "Published" : "Draft",
        "Mata Pelajaran": q.subject_area === 'literasi' ? 'Literasi' : (q.subject_area === 'numerasi' ? 'Numerasi' : q.subject_area),
        "Paket Soal (Kategori)": categoryName,
        "Level": levelNumber,
        "Batas Lulus (Threshold)": passingThreshold,
        "Instruksi Soal": q.question_instruction || "-",
        "Teks Pertanyaan": q.question_text || "-",
        "Opsi Jawaban": optionsStr,
        "Jawaban Benar": correctStr,
        "Pembahasan/Penjelasan": q.explanation || "-",
        "Media URL": mediaUrl,
        "Tujuan Pembelajaran (Learning Objective)": learningObj,
        "Urutan (Order Index)": q.order_index ?? 0,
        "Dibuat Pada": q.created_at ? new Date(q.created_at).toLocaleString('id-ID') : "-",
      };
    });

    const wb = XLSX.utils.book_new();

    // Berikan fallback jika kosong
    if (excelData.length === 0) {
      excelData.push({
        "Kode Soal": "-", "Tipe Soal": "-", "Status": "-", "Mata Pelajaran": "-",
        "Paket Soal (Kategori)": "-", "Level": "-", "Batas Lulus (Threshold)": "-", 
        "Instruksi Soal": "Tidak ada data soal yang sesuai dengan filter",
        "Teks Pertanyaan": "-", "Opsi Jawaban": "-", "Jawaban Benar": "-", 
        "Pembahasan/Penjelasan": "-", "Media URL": "-", "Tujuan Pembelajaran (Learning Objective)": "-",
        "Urutan (Order Index)": "-", "Dibuat Pada": "-"
      });
    }

    const ws = XLSX.utils.json_to_sheet(excelData);

    // Styling sedikit untuk mempermudah baca (wrap text untuk Opsi Jawaban)
    const colWidths = [
      { wch: 15 }, // Kode Soal
      { wch: 15 }, // Tipe Soal
      { wch: 10 }, // Status
      { wch: 15 }, // Mata Pelajaran
      { wch: 25 }, // Paket
      { wch: 10 }, // Level
      { wch: 20 }, // Threshold
      { wch: 30 }, // Instruksi
      { wch: 50 }, // Pertanyaan
      { wch: 40 }, // Opsi
      { wch: 25 }, // Jawaban Benar
      { wch: 40 }, // Penjelasan
      { wch: 40 }, // Media
      { wch: 50 }, // Learning Obj
      { wch: 15 }, // Order
      { wch: 20 }, // Dibuat Pada
    ];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Daftar Soal");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Export_Daftar_Soal_Pemantik_${new Date().toISOString().split('T')[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (err: any) {
    console.error("[export/questions] Catch error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan sistem saat mengekspor data." }, { status: 500 });
  }
}
