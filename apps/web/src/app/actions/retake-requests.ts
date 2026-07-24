"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import { resetStudentSession } from "./assessment";

export async function requestRetakeAction(data: { sessionId?: string; schoolId: string; studentId: string; reason: string }) {
  try {
    const supabase = createServerClient();
    
    let targetSessionId = data.sessionId;
    
    if (!targetSessionId) {
      const { data: latestSession } = await supabase
        .from("assessment_sessions")
        .select("id")
        .eq("student_id", data.studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (!latestSession) {
        return { success: false, error: "Anak ini belum pernah memulai sesi ujian apapun." };
      }
      targetSessionId = latestSession.id;
    }

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

    const { error } = await (supabase as any)
      .from("assessment_retake_requests")
      .insert({
        session_id: targetSessionId,
        school_id: data.schoolId,
        student_id: data.studentId,
        reason: data.reason,
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
      .select("student_id, school_id")
      .eq("id", requestId)
      .single();

    if (reqErr || !reqData) throw new Error("Request not found");

    const { data: schoolData } = await supabase
      .from("schools")
      .select("community_id")
      .eq("id", reqData.school_id)
      .single();

    const communityId = schoolData?.community_id;

    // Cari fase terakhir (latest assessment_access) untuk sekolah atau komunitas ini
    const { data: latestAccess } = await supabase
      .from("assessment_access")
      .select("category_id, phase")
      .in("target_id", [reqData.school_id, communityId].filter(Boolean))
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestAccess) {
      // Buat hak akses spesifik untuk siswa ini, berlaku 7 hari dari sekarang
      // Mundurkan validFrom 1 jam untuk menghindari masalah perbedaan jam server (Time Drift) yang menyebabkan RLS error
      const validFrom = new Date();
      validFrom.setHours(validFrom.getHours() - 1);
      
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);

      await supabase.from("assessment_access").insert({
        target_type: "student",
        target_id: reqData.student_id,
        category_id: latestAccess.category_id,
        phase: latestAccess.phase || "Tahap 1",
        is_active: true,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
      });
    }

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

export async function bulkRequestRetakeAction(data: { schoolId: string; studentIds: string[]; reason: string }) {
  try {
    const supabase = createServerClient();
    
    let successCount = 0;
    
    for (const studentId of data.studentIds) {
      const { data: latestSession } = await supabase
        .from("assessment_sessions")
        .select("id")
        .eq("student_id", studentId)
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

      const { error } = await (supabase as any)
        .from("assessment_retake_requests")
        .insert({
          session_id: targetSessionId,
          school_id: data.schoolId,
          student_id: studentId,
          reason: data.reason,
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
        .select("student_id, school_id")
        .eq("id", req.id)
        .single();

      if (reqErr || !reqData) continue;

      const { data: schoolData } = await supabase
        .from("schools")
        .select("community_id")
        .eq("id", reqData.school_id)
        .single();

      const communityId = schoolData?.community_id;

      // Cari fase terakhir (latest assessment_access) untuk sekolah atau komunitas ini
      const { data: latestAccess } = await supabase
        .from("assessment_access")
        .select("category_id, phase")
        .in("target_id", [reqData.school_id, communityId].filter(Boolean))
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestAccess) {
        const validFrom = new Date();
        validFrom.setHours(validFrom.getHours() - 1);
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        await supabase.from("assessment_access").insert({
          target_type: "student",
          target_id: reqData.student_id,
          category_id: latestAccess.category_id,
          phase: latestAccess.phase || "Tahap 1",
          is_active: true,
          valid_from: validFrom.toISOString(),
          valid_until: validUntil.toISOString(),
        });
      }

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
