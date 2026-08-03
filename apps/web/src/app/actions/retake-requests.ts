"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import { resetStudentSession } from "./assessment";

export async function requestRetakeAction(data: { categoryId: string; phase: string; schoolId: string; studentId: string; reason: string; levelName?: string }) {
  try {
    const supabase = createServerClient();
    
    const { data: latestSession } = await supabase
      .from("assessment_sessions")
      .select("id")
      .eq("student_id", data.studentId)
      .eq("category_id", data.categoryId)
      .eq("phase", data.phase)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
      
    if (!latestSession) {
      return { success: false, error: "Anak ini belum pernah memulai sesi ujian pada paket tersebut." };
    }
    const targetSessionId = latestSession.id;

    // Check if there's already a pending request for this session
    const { data: existingReq } = await (supabase as any)
      .from("assessment_retake_requests")
      .select("id")
      .eq("session_id", targetSessionId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingReq) {
      return { success: false, error: "Permintaan ujian ulang untuk sesi ini sudah diajukan dan sedang menunggu persetujuan." };
    }

    const finalReason = data.levelName ? `[Bermasalah di ${data.levelName}] ${data.reason}` : data.reason;

    const { error } = await (supabase as any)
      .from("assessment_retake_requests")
      .insert({
        session_id: targetSessionId,
        school_id: data.schoolId,
        student_id: data.studentId,
        reason: finalReason,
        status: "pending"
      });

    if (error) {
      throw error;
    }

    revalidatePath("/sekolah/siswa");
    return { success: true, message: "Permintaan ujian ulang berhasil dikirim ke Super Admin." };
  } catch (err: any) {
    console.error("requestRetakeAction error:", err);
    return { success: false, error: "Gagal mengirim permintaan ujian ulang." };
  }
}

export async function approveRetakeAction(requestId: string, sessionId: string) {
  try {
    const supabase = createServerClient();
    
    const { data: reqData, error: reqErr } = await (supabase as any)
      .from("assessment_retake_requests")
      .select("student_id, school_id, session_id")
      .eq("id", requestId)
      .single();

    if (reqErr || !reqData) throw new Error("Request not found");

    const { data: sessionData, error: sessErr } = await supabase
      .from("assessment_sessions")
      .select("category_id, phase")
      .eq("id", reqData.session_id)
      .single();

    if (sessErr || !sessionData) throw new Error("Session not found");

    // Sesuai requirement, kita HAPUS pembuatan access_access secara individu (perpanjangan masa aktif).
    // Sesi baru akan secara natural terikat dengan tanggal kadaluarsa dari paket/fase yang sedang aktif bagi sekolah.

    const { error: updateErr } = await (supabase as any)
      .from("assessment_retake_requests")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (updateErr) throw updateErr;

    const resetResult = await resetStudentSession(sessionId);
    if (!resetResult.success) {
      return { success: false, error: resetResult.error };
    }

    revalidatePath("/super-admin/sesi-siswa"); 
    return { success: true, message: "Permintaan ujian ulang disetujui, akses diberikan & sesi di-reset." };
  } catch (err: any) {
    console.error("approveRetakeAction error:", err);
    return { success: false, error: "Gagal menyetujui ujian ulang." };
  }
}

export async function rejectRetakeAction(requestId: string) {
  try {
    const supabase = createServerClient();
    
    const { error } = await (supabase as any)
      .from("assessment_retake_requests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) throw error;

    revalidatePath("/super-admin/sesi-siswa");
    return { success: true, message: "Permintaan ujian ulang ditolak." };
  } catch (err: any) {
    console.error("rejectRetakeAction error:", err);
    return { success: false, error: "Gagal menolak ujian ulang." };
  }
}

export async function bulkRequestRetakeAction(data: { schoolId: string; studentIds: string[]; reason: string; categoryId: string; phase: string; levelName?: string }) {
  try {
    const supabase = createServerClient();
    
    let successCount = 0;
    
    for (const studentId of data.studentIds) {
      const { data: latestSession } = await supabase
        .from("assessment_sessions")
        .select("id")
        .eq("student_id", studentId)
        .eq("category_id", data.categoryId)
        .eq("phase", data.phase)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (!latestSession) continue;
      
      const targetSessionId = latestSession.id;

      // Check if there's already a pending request for this session
      const { data: existingReq } = await (supabase as any)
        .from("assessment_retake_requests")
        .select("id")
        .eq("session_id", targetSessionId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingReq) continue;

      const finalReason = data.levelName ? `[Bermasalah di ${data.levelName}] ${data.reason}` : data.reason;

      const { error } = await (supabase as any)
        .from("assessment_retake_requests")
        .insert({
          session_id: targetSessionId,
          school_id: data.schoolId,
          student_id: studentId,
          reason: finalReason,
          status: "pending"
        });

      if (!error) successCount++;
    }

    revalidatePath("/sekolah/siswa");
    return { success: true, message: `Permintaan ujian ulang untuk ${successCount} siswa berhasil dikirim ke Super Admin.` };
  } catch (err: any) {
    console.error("bulkRequestRetakeAction error:", err);
    return { success: false, error: "Gagal mengirim permintaan ujian ulang masal." };
  }
}

export async function bulkApproveRetakeAction(requests: { id: string; sessionId: string }[]) {
  try {
    const supabase = createServerClient();
    let successCount = 0;

    for (const req of requests) {
      const { data: reqData, error: reqErr } = await (supabase as any)
        .from("assessment_retake_requests")
        .select("student_id, school_id, session_id")
        .eq("id", req.id)
        .single();

      if (reqErr || !reqData) continue;

      const { data: sessionData, error: sessErr } = await supabase
        .from("assessment_sessions")
        .select("category_id, phase")
        .eq("id", reqData.session_id)
        .single();

      if (sessErr || !sessionData) continue;

      // Sesuai requirement, tidak perlu insert ke assessment_access untuk individu

      const { error: updateErr } = await (supabase as any)
        .from("assessment_retake_requests")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", req.id);

      if (updateErr) continue;

      const resetResult = await resetStudentSession(req.sessionId);
      if (resetResult.success) successCount++;
    }

    revalidatePath("/super-admin/sesi-siswa"); 
    return { success: true, message: `${successCount} permintaan ujian ulang disetujui.` };
  } catch (err: any) {
    console.error("bulkApproveRetakeAction error:", err);
    return { success: false, error: "Gagal menyetujui ujian ulang masal." };
  }
}

export async function bulkRejectRetakeAction(requestIds: string[]) {
  try {
    const supabase = createServerClient();
    
    const { error } = await (supabase as any)
      .from("assessment_retake_requests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .in("id", requestIds);

    if (error) throw error;

    revalidatePath("/super-admin/sesi-siswa");
    return { success: true, message: `${requestIds.length} permintaan ujian ulang ditolak.` };
  } catch (err: any) {
    console.error("bulkRejectRetakeAction error:", err);
    return { success: false, error: "Gagal menolak ujian ulang masal." };
  }
}

export async function getStudentSessionsForRetakeAction(studentId: string) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("assessment_sessions")
      .select("id, phase, category_id, status, created_at, question_categories(name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSchoolAvailableAssessmentsAction(schoolId: string) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("assessment_access")
      .select("phase, category_id, question_categories(name)")
      .eq("target_type", "school")
      .eq("target_id", schoolId)
      .eq("is_active", true);

    if (error) throw error;
    
    // Deduplikasi berdasar category_id & phase
    const uniqueMap = new Map();
    data?.forEach(item => {
      const key = `${item.category_id}-${item.phase}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    });
    
    return { success: true, data: Array.from(uniqueMap.values()) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCategoryLevelsAction(categoryId: string) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("question_levels")
      .select("id, level_number")
      .eq("category_id", categoryId)
      .order("level_number", { ascending: true });

    if (error) {
      console.error("Error getCategoryLevelsAction:", error);
      throw error;
    }
    console.log("getCategoryLevelsAction data:", data);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
