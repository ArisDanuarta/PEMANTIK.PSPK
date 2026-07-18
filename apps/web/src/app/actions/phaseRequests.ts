"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notifyAllSuperAdmins } from "./notifications";
import { distributeAccessToSchools } from "./assessment";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PhaseRequestPayload {
  categoryIds: string[];
  phase: string;
  targetSchoolIds: string[];
  validFrom: string;  // ISO string
  validUntil: string; // ISO string
}

export interface PhaseRequest {
  id: string;
  community_id: string;
  category_id: string;
  phase: string;
  target_school_ids: string[];
  valid_from: string;
  valid_until: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  question_categories?: { name: string; subject_area: string };
  communities?: { name: string };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getCommunityIdFromHeader(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-community-id");
}

// ─── Actions ───────────────────────────────────────────────────────────────

/**
 * Komunitas mengajukan fase asesmen ke Super Admin.
 *
 * Validasi sebelum insert:
 * 1. Semua target_school_ids harus milik community_id ini
 * 2. Semua sekolah target harus berada di stage 'pengajuan_fase' (siap)
 * 3. valid_until > valid_from
 * 4. categoryId harus ada di question_categories
 */
export async function submitPhaseRequestAction(
  payload: PhaseRequestPayload,
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    const communityId = await getCommunityIdFromHeader();
    if (!communityId) {
      return { success: false, error: "Tidak dapat mengidentifikasi komunitas Anda." };
    }

    // Validasi payload
    if (!payload.categoryIds || payload.categoryIds.length === 0 || !payload.phase || !payload.validFrom || !payload.validUntil) {
      return { success: false, error: "Semua field wajib diisi (kategori, fase, tanggal)." };
    }
    if (payload.targetSchoolIds.length === 0) {
      return { success: false, error: "Pilih minimal 1 sekolah yang dituju." };
    }
    if (new Date(payload.validFrom) >= new Date(payload.validUntil)) {
      return { success: false, error: "Tanggal mulai harus sebelum tanggal selesai." };
    }

    const supabase = await createServerClient();

    // Ambil data user yang sedang login dari header proxy
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) {
      console.error("[submitPhaseRequestAction] Auth error: x-user-id header missing");
      return { success: false, error: "Sesi login tidak valid." };
    }

    // Cek apakah kategori yang diajukan termasuk dalam allowed_categories komunitas (jika diatur)
    const { data: commInfo } = await (supabase as any)
      .from("communities")
      .select("allowed_categories")
      .eq("id", communityId)
      .maybeSingle();

    if (commInfo?.allowed_categories && Array.isArray(commInfo.allowed_categories) && commInfo.allowed_categories.length > 0) {
      const allowedSet = new Set(commInfo.allowed_categories);
      const invalidCategories = payload.categoryIds.filter(id => !allowedSet.has(id));
      if (invalidCategories.length > 0) {
        return {
          success: false,
          error: "Satu atau lebih kategori paket soal tidak diizinkan untuk komunitas Anda. Silakan hubungi Super Admin.",
        };
      }
    }

    // Validasi 1: semua sekolah target milik komunitas ini
    const { data: validSchools, error: schoolErr } = await supabase
      .from("schools")
      .select("id")
      .eq("community_id", communityId)
      .in("id", payload.targetSchoolIds)
      .eq("is_active", true);

    if (schoolErr) throw schoolErr;

    const validSchoolIds = new Set((validSchools || []).map((s) => s.id));
    const invalidSchools = payload.targetSchoolIds.filter((id) => !validSchoolIds.has(id));
    if (invalidSchools.length > 0) {
      return {
        success: false,
        error: `${invalidSchools.length} sekolah tidak valid atau bukan binaan komunitas Anda.`,
      };
    }

    // Validasi 2: semua sekolah harus di stage 'pengajuan_fase'
    const { data: readyStages } = await (supabase as any)
      .from("school_assessment_stages")
      .select("school_id")
      .eq("community_id", communityId)
      .eq("current_stage", "pengajuan_fase")
      .in("school_id", payload.targetSchoolIds);

    const readySchoolIds = new Set((readyStages as Array<{ school_id: string }> || []).map((s) => s.school_id));
    const notReadySchools = payload.targetSchoolIds.filter((id) => !readySchoolIds.has(id));
    if (notReadySchools.length > 0) {
      return {
        success: false,
        error: `${notReadySchools.length} sekolah belum menyelesaikan tahap Persiapan Akun. Pastikan semua sekolah sudah ditandai siap sebelum mengajukan fase.`,
      };
    }


    // Insert pengajuan (Bulk Insert)
    const inserts = payload.categoryIds.map(categoryId => ({
      community_id: communityId,
      category_id: categoryId,
      phase: payload.phase,
      target_school_ids: payload.targetSchoolIds,
      valid_from: new Date(payload.validFrom).toISOString(),
      valid_until: new Date(payload.validUntil).toISOString(),
      status: "pending",
      requested_by: userId,
    }));

    const { data: newRequests, error: insertErr } = await (supabase as any)
      .from("assessment_phase_requests")
      .insert(inserts)
      .select("id");

    if (insertErr || !newRequests) {
      return { success: false, error: "Gagal menyimpan pengajuan fase: " + insertErr?.message };
    }

    // Notifikasi semua Super Admin
    await notifyAllSuperAdmins(
      "Pengajuan Fase Asesmen Baru",
      `Komunitas mengajukan fase asesmen baru: "${payload.phase}" untuk ${payload.targetSchoolIds.length} sekolah.`,
      { request_ids: newRequests.map((r: any) => r.id), community_id: communityId },
    );

    revalidatePath("/komunitas/akses-ujian");
    return { success: true, requestId: newRequests[0]?.id };
  } catch (err: any) {
    console.error("[submitPhaseRequestAction]", err);
    return { success: false, error: err.message || "Terjadi kesalahan sistem." };
  }
}

/**
 * Sekolah Independen mengajukan fase asesmen langsung ke Super Admin.
 */
export async function submitPhaseRequestForIndependentSchoolAction(
  payload: {
    schoolId: string;
    categoryId: string;
    phase: string;
    validFrom: string;
    validUntil: string;
  }
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    const { schoolId, categoryId, phase, validFrom, validUntil } = payload;
    if (!schoolId || !categoryId || !phase || !validFrom || !validUntil) {
      return { success: false, error: "Semua field wajib diisi (kategori, fase, tanggal)." };
    }
    if (new Date(validFrom) >= new Date(validUntil)) {
      return { success: false, error: "Tanggal mulai harus sebelum tanggal selesai." };
    }

    const supabase = await createServerClient();
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return { success: false, error: "Sesi pengguna tidak valid." };

    // Cek info sekolah
    const { data: school } = await (supabase as any)
      .from("schools")
      .select("name, community_id")
      .eq("id", schoolId)
      .maybeSingle();

    if (!school) return { success: false, error: "Sekolah tidak ditemukan." };
    if (school.community_id) {
      return { success: false, error: "Sekolah ini berada di bawah naungan komunitas, pengajuan fase wajib melalui Admin Komunitas Induk." };
    }

    // Insert pengajuan (community_id null karena sekolah independen)
    const { data: newRequest, error: insertErr } = await (supabase as any)
      .from("assessment_phase_requests")
      .insert({
        community_id: null,
        category_id: categoryId,
        phase: phase.trim(),
        target_school_ids: [schoolId],
        valid_from: new Date(validFrom).toISOString(),
        valid_until: new Date(validUntil).toISOString(),
        status: "pending",
        requested_by: userId,
      })
      .select("id")
      .single();

    if (insertErr || !newRequest) throw insertErr || new Error("Gagal membuat pengajuan.");

    // Update stage sekolah menjadi 'pengajuan_fase' jika belum
    await (supabase as any).from("school_assessment_stages").upsert({
      school_id: schoolId,
      community_id: null,
      phase: phase.trim(),
      current_stage: "pengajuan_fase",
      phase_request_id: newRequest.id,
      stage_updated_at: new Date().toISOString(),
    }, { onConflict: "school_id,phase,community_id" });

    // Notifikasi Super Admin
    await notifyAllSuperAdmins(
      "Pengajuan Fase Sekolah Independen",
      `Sekolah Independen "${school.name}" mengajukan fase asesmen: "${phase}".`,
      { request_id: newRequest.id, school_id: schoolId },
    );

    revalidatePath("/sekolah/akses-ujian");
    revalidatePath("/super-admin/persetujuan");
    return { success: true, requestId: newRequest.id };
  } catch (err: any) {
    console.error("[submitPhaseRequestForIndependentSchoolAction]", err);
    return { success: false, error: err.message || "Terjadi kesalahan sistem." };
  }
}


/**
 * Super Admin mereview (approve/reject) pengajuan fase asesmen.
 *
 * Jika APPROVE:
 * 1. Insert baris assessment_access (target_type='community', target_id=community_id)
 * 2. Distribusikan akses ke semua sekolah target (auto-insert per sekolah)
 * 3. UPSERT school_assessment_stages → current_stage = 'proses_asesmen'
 * 4. Update status request → 'approved'
 * 5. Notifikasi komunitas pengaju
 *
 * Jika REJECT:
 * 1. Update status → 'rejected' + rejection_reason
 * 2. Notifikasi komunitas pengaju
 */
export async function reviewPhaseRequestAction(
  requestId: string,
  decision: "approved" | "rejected",
  rejectionReason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();

    // Ambil data pengajuan
    const { data: request, error: fetchErr } = await (supabase as any)
      .from("assessment_phase_requests")
      .select(`
        id, community_id, category_id, phase, target_school_ids,
        valid_from, valid_until, status, requested_by,
        question_categories(name, subject_area),
        communities(name)
      `)
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr || !request) {
      return { success: false, error: "Pengajuan tidak ditemukan." };
    }
    if (request.status !== "pending") {
      return { success: false, error: `Pengajuan ini sudah di-${request.status}.` };
    }

    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return { success: false, error: "Sesi tidak valid." };

    if (decision === "rejected") {
      const { error } = await (supabase as any)
        .from("assessment_phase_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason || "Tidak ada alasan diberikan.",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Notif ke user komunitas yang mengajukan
      await _notifyUser(request.requested_by, "Pengajuan Fase Ditolak", 
        `Pengajuan fase "${request.phase}" Anda telah ditolak. Alasan: ${rejectionReason || "-"}`);

      revalidatePath("/super-admin/persetujuan");
      revalidatePath("/komunitas/akses-ujian");
      return { success: true };
    }

    // === APPROVE ===

    if (!request.community_id) {
      // ── Sekolah Independen ──
      const schoolId = request.target_school_ids[0];
      const { data: schoolAccess, error: accessErr } = await supabase
        .from("assessment_access")
        .insert({
          category_id: request.category_id,
          target_type: "school",
          target_id: schoolId,
          phase: request.phase,
          valid_from: request.valid_from,
          valid_until: request.valid_until,
          is_active: true,
          granted_by: userId,
        })
        .select("id")
        .single();

      if (accessErr && accessErr.code !== "23505") throw accessErr;

      // Upsert stage ke proses_asesmen
      await (supabase as any)
        .from("school_assessment_stages")
        .upsert({
          school_id: schoolId,
          community_id: null,
          phase: request.phase,
          current_stage: "proses_asesmen",
          phase_request_id: requestId,
          stage_updated_at: new Date().toISOString(),
        }, { onConflict: "school_id,phase,community_id" });

      await (supabase as any)
        .from("assessment_phase_requests")
        .update({
          status: "approved",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      await _notifyUser(request.requested_by, "Pengajuan Fase Disetujui",
        `Pengajuan fase "${request.phase}" sekolah Anda telah disetujui! Akses ujian kini terbuka.`);

      revalidatePath("/super-admin/persetujuan");
      revalidatePath("/sekolah/akses-ujian");
      return { success: true };
    }

    // 1. Insert assessment_access untuk komunitas
    const { data: communityAccess, error: accessErr } = await supabase
      .from("assessment_access")
      .insert({
        category_id: request.category_id,
        target_type: "community",
        target_id: request.community_id,
        phase: request.phase,
        valid_from: request.valid_from,
        valid_until: request.valid_until,
        is_active: true,
        granted_by: userId,
      })
      .select("id")
      .single();

    if (accessErr) {
      // Unique violation: akses sudah ada - ambil yang existing
      if (accessErr.code !== "23505") throw accessErr;
    }

    // Ambil ID access (yang baru atau yang sudah ada)
    let accessId = communityAccess?.id;
    if (!accessId) {
      const { data: existingAccess } = await supabase
        .from("assessment_access")
        .select("id")
        .eq("category_id", request.category_id)
        .eq("target_type", "community")
        .eq("target_id", request.community_id)
        .eq("phase", request.phase)
        .maybeSingle();
      accessId = existingAccess?.id;
    }

    if (!accessId) {
      return { success: false, error: "Gagal membuat atau menemukan akses komunitas." };
    }

    // 2. Distribusikan ke semua sekolah target (reuse fungsi existing)
    const distResult = await distributeAccessToSchools(
      accessId,
      request.target_school_ids,
      request.community_id,
    );

    if (!distResult.success) {
      console.warn("[reviewPhaseRequestAction] Distribusi parsial:", distResult.error);
      // Lanjutkan walau distribusi parsial - jangan batalkan approve
    }

    // 3. UPSERT school_assessment_stages → proses_asesmen
    const stageRows = request.target_school_ids.map((schoolId: string) => ({
      school_id: schoolId,
      community_id: request.community_id,
      phase: request.phase,
      current_stage: "proses_asesmen",
      phase_request_id: requestId,
      stage_updated_at: new Date().toISOString(),
    }));

    const { error: stageErr } = await (supabase as any)
      .from("school_assessment_stages")
      .upsert(stageRows, {
        onConflict: "school_id,phase,community_id",
        ignoreDuplicates: false,  // Update jika sudah ada
      });

    if (stageErr) {
      console.error("[reviewPhaseRequestAction] Gagal upsert stages:", stageErr);
    }

    // 4. Update status request
    const { error: updateErr } = await (supabase as any)
      .from("assessment_phase_requests")
      .update({
        status: "approved",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateErr) throw updateErr;

    // 5. Notif ke komunitas pengaju
    await _notifyUser(request.requested_by, "Pengajuan Fase Disetujui",
      `Pengajuan fase "${request.phase}" Anda telah disetujui! Asesmen untuk ${request.target_school_ids.length} sekolah kini aktif.`);

    revalidatePath("/super-admin/persetujuan");
    revalidatePath("/komunitas/akses-ujian");
    revalidatePath("/komunitas/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[reviewPhaseRequestAction]", err);
    return { success: false, error: err.message || "Terjadi kesalahan sistem." };
  }
}

/**
 * Ambil semua pengajuan fase milik komunitas yang login.
 * Digunakan oleh tab Akses Ujian untuk menampilkan riwayat.
 */
export async function getPhaseRequestsForCommunity(): Promise<{
  success: boolean;
  data?: PhaseRequest[];
  error?: string;
}> {
  try {
    const communityId = await getCommunityIdFromHeader();
    if (!communityId) return { success: false, error: "Komunitas tidak teridentifikasi." };

    const supabase = await createServerClient();

    const { data, error } = await (supabase as any)
      .from("assessment_phase_requests")
      .select(`
        id, community_id, category_id, phase, target_school_ids,
        valid_from, valid_until, status, rejection_reason, created_at,
        question_categories(name, subject_area)
      `)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: (data || []) as PhaseRequest[] };
  } catch (err: any) {
    console.error("[getPhaseRequestsForCommunity]", err);
    return { success: false, error: err.message };
  }
}

/**
 * Ambil semua pengajuan yang masih pending - digunakan oleh halaman Approval Center Super Admin.
 */
export async function getPendingPhaseRequests(): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await (supabase as any)
      .from("assessment_phase_requests")
      .select(`
        id, community_id, category_id, phase, target_school_ids,
        valid_from, valid_until, status, created_at,
        question_categories(name, subject_area),
        communities(name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Ambil SEMUA pengajuan (pending, approved, rejected) untuk Super Admin Approval Center.
 */
export async function getAllPhaseRequests(): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await (supabase as any)
      .from("assessment_phase_requests")
      .select(`
        id, community_id, category_id, phase, target_school_ids,
        valid_from, valid_until, status, rejection_reason, created_at, reviewed_at,
        question_categories(name, subject_area),
        communities(name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Internal Helper ────────────────────────────────────────────────────────

/** Kirim notifikasi ke 1 user spesifik (untuk feedback approve/reject) */
async function _notifyUser(userId: string, title: string, message: string): Promise<void> {
  try {
    // Gunakan import dinamis untuk menghindari circular dependency
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await (admin as any).from("notifications").insert({
      user_id: userId,
      title,
      message,
      is_read: false,
    });
  } catch (err) {
    console.error("[_notifyUser]", err);
  }
}
