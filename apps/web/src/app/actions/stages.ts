"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface StageRow {
  id: string;
  school_id: string;
  community_id: string;
  phase: string;
  current_stage: "persiapan_akun" | "pengajuan_fase" | "proses_asesmen" | "intervensi" | "selesai";
  phase_request_id: string | null;
  stage_updated_at: string;
  created_at: string;
  schools?: { name: string; npsn: string | null; community_id?: string | null };
}

export type StageName = StageRow["current_stage"];
export type SchoolAssessmentStageRow = StageRow;

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Ekstrak community_id dari header yang diinjeksi middleware */
async function getCommunityIdFromHeader(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-community-id");
}

// ─── Actions ───────────────────────────────────────────────────────────────

/**
 * Tahap 1→2: Komunitas menandai sebuah sekolah sudah selesai persiapan akun.
 * UI hanya memunculkan tombol "Ajukan Fase" setelah stage ini = 'pengajuan_fase'.
 *
 * Jika belum ada baris stage → INSERT (persiapan_akun → pengajuan_fase langsung)
 * Jika sudah ada dan masih 'persiapan_akun' → UPDATE ke 'pengajuan_fase'
 * Jika sudah di stage lain → kembalikan error (tidak bisa mundur)
 */
export async function markPersiapanSelesaiAction(
  schoolId: string,
  phase: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const communityId = await getCommunityIdFromHeader();
    if (!communityId) {
      return { success: false, error: "Tidak dapat mengidentifikasi komunitas Anda." };
    }

    const supabase = await createServerClient();

    // Cek apakah sekolah memang milik komunitas ini
    const { data: school, error: schoolErr } = await supabase
      .from("schools")
      .select("id, name, community_id")
      .eq("id", schoolId)
      .eq("community_id", communityId)
      .maybeSingle();

    if (schoolErr || !school) {
      return { success: false, error: "Sekolah tidak ditemukan atau bukan binaan komunitas Anda." };
    }

    // Cek apakah sudah ada stage untuk kombinasi (school, phase, community) ini
    const { data: existing } = await (supabase as any)
      .from("school_assessment_stages")
      .select("id, current_stage")
      .eq("school_id", schoolId)
      .eq("phase", phase)
      .eq("community_id", communityId)
      .maybeSingle();

    if (existing) {
      // Sudah ada — validasi bisa di-update
      if (existing.current_stage !== "persiapan_akun") {
        return {
          success: false,
          error: `Sekolah ini sudah berada di tahap '${existing.current_stage}'. Tidak bisa kembali ke Persiapan Akun.`,
        };
      }
      // Update ke pengajuan_fase
      const { error: updateErr } = await (supabase as any)
        .from("school_assessment_stages")
        .update({
          current_stage: "pengajuan_fase",
          stage_updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateErr) throw updateErr;
    } else {
      // Belum ada — buat baru langsung di 'pengajuan_fase'
      const { error: insertErr } = await (supabase as any)
        .from("school_assessment_stages")
        .insert({
          school_id: schoolId,
          community_id: communityId,
          phase,
          current_stage: "pengajuan_fase",
          stage_updated_at: new Date().toISOString(),
        });

      if (insertErr) throw insertErr;
    }

    revalidatePath("/komunitas/dashboard");
    revalidatePath("/komunitas/akses-ujian");
    return { success: true };
  } catch (err: any) {
    console.error("[markPersiapanSelesaiAction]", err);
    return { success: false, error: err.message || "Terjadi kesalahan sistem." };
  }
}

/**
 * Tahap 1→2 Bulk: Komunitas melanjutkan semua sekolah binaan yang ada di persiapan_akun sekaligus.
 */
export async function bulkMarkPersiapanSelesaiAction(
  schoolIds: string[],
  phase: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const communityId = await getCommunityIdFromHeader();
    if (!communityId) {
      return { success: false, error: "Tidak dapat mengidentifikasi komunitas Anda." };
    }
    if (!schoolIds || schoolIds.length === 0) {
      return { success: false, error: "Tidak ada sekolah yang dipilih." };
    }

    const supabase = await createServerClient();

    for (const schoolId of schoolIds) {
      const { data: existing } = await (supabase as any)
        .from("school_assessment_stages")
        .select("id, current_stage")
        .eq("school_id", schoolId)
        .eq("phase", phase)
        .eq("community_id", communityId)
        .maybeSingle();

      if (existing) {
        if (existing.current_stage === "persiapan_akun") {
          await (supabase as any)
            .from("school_assessment_stages")
            .update({
              current_stage: "pengajuan_fase",
              stage_updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        }
      } else {
        await (supabase as any)
          .from("school_assessment_stages")
          .insert({
            school_id: schoolId,
            community_id: communityId,
            phase,
            current_stage: "pengajuan_fase",
            stage_updated_at: new Date().toISOString(),
          });
      }
    }

    revalidatePath("/komunitas/dashboard");
    revalidatePath("/komunitas/akses-ujian");
    return { success: true };
  } catch (err: any) {
    console.error("[bulkMarkPersiapanSelesaiAction]", err);
    return { success: false, error: err.message || "Terjadi kesalahan sistem." };
  }
}

/**
 * Ambil semua stages aktif milik komunitas yang login,
 * diurutkan dari yang paling baru diperbarui.
 * Digunakan oleh dashboard untuk rendering StageTimeline.
 */
export async function getActiveStagesForCommunity(includeCompleted = true): Promise<{
  success: boolean;
  data?: StageRow[];
  error?: string;
}> {
  try {
    const communityId = await getCommunityIdFromHeader();
    if (!communityId) {
      return { success: false, error: "Tidak dapat mengidentifikasi komunitas." };
    }

    const supabase = await createServerClient();

    let query = (supabase as any)
      .from("school_assessment_stages")
      .select(`
        id, school_id, community_id, phase, current_stage,
        phase_request_id, stage_updated_at, created_at,
        schools(name, npsn, community_id)
      `)
      .eq("community_id", communityId);

    if (!includeCompleted) {
      query = query.neq("current_stage", "selesai");
    }

    const { data, error } = await query.order("stage_updated_at", { ascending: false });

    if (error) throw error;

    return { success: true, data: (data || []) as StageRow[] };
  } catch (err: any) {
    console.error("[getActiveStagesForCommunity]", err);
    return { success: false, error: err.message };
  }
}

/**
 * Cek on-demand: apakah ada stages yang harusnya auto-transition
 * dari 'proses_asesmen' ke 'intervensi' karena valid_until sudah lewat.
 *
 * Dipanggil setiap kali dashboard Komunitas di-render (Server Component).
 * Aman dijalankan berulang karena hanya UPDATE stages yang memenuhi syarat.
 */
export async function checkAndAutoTransitionStages(communityId: string): Promise<void> {
  try {
    const supabase = await createServerClient();

    // Cari stages yang masih di 'proses_asesmen' dan phase_request_id-nya
    // punya valid_until sudah terlewat
    const { data: activeStages } = await (supabase as any)
      .from("school_assessment_stages")
      .select("id, phase_request_id")
      .eq("community_id", communityId)
      .eq("current_stage", "proses_asesmen")
      .not("phase_request_id", "is", null);

    if (!activeStages || activeStages.length === 0) return;

    const requestIds = (activeStages as Array<{ id: string; phase_request_id: string | null }>)
      .map((s) => s.phase_request_id)
      .filter(Boolean) as string[];

    // Cek phase_requests mana yang valid_until-nya sudah lewat
    const { data: expiredRequests } = await (supabase as any)
      .from("assessment_phase_requests")
      .select("id")
      .in("id", requestIds)
      .lt("valid_until", new Date().toISOString());

    if (!expiredRequests || expiredRequests.length === 0) return;

    const expiredRequestIds = new Set((expiredRequests as Array<{ id: string }>).map((r) => r.id));
    const stagesToTransition = (activeStages as Array<{ id: string; phase_request_id: string | null }>)
      .filter((s) => s.phase_request_id && expiredRequestIds.has(s.phase_request_id))
      .map((s) => s.id);

    if (stagesToTransition.length === 0) return;

    // Batch update ke 'intervensi'
    await (supabase as any)
      .from("school_assessment_stages")
      .update({
        current_stage: "intervensi",
        stage_updated_at: new Date().toISOString(),
      })
      .in("id", stagesToTransition);

    console.log(`[AutoTransition] ${stagesToTransition.length} stage(s) diubah ke 'intervensi'.`);
  } catch (err: any) {
    // Gagal silent — tidak boleh crash dashboard
    console.error("[checkAndAutoTransitionStages]", err);
  }
}

/**
 * Q2 (Manual): Tutup asesmen sebelum tanggal habis.
 * Mengubah stage dari 'proses_asesmen' ke 'intervensi' secara paksa.
 */
export async function closeAssessmentManuallyAction(
  stageId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const communityId = await getCommunityIdFromHeader();
    if (!communityId) {
      return { success: false, error: "Tidak dapat mengidentifikasi komunitas Anda." };
    }

    const supabase = await createServerClient();

    // Ambil stage dan pastikan milik komunitas ini
    const { data: stage, error: fetchErr } = await (supabase as any)
      .from("school_assessment_stages")
      .select("id, current_stage, community_id")
      .eq("id", stageId)
      .eq("community_id", communityId)
      .maybeSingle();

    if (fetchErr || !stage) {
      return { success: false, error: "Tahap tidak ditemukan atau bukan milik komunitas Anda." };
    }

    if (stage.current_stage !== "proses_asesmen") {
      return {
        success: false,
        error: `Hanya bisa menutup asesmen yang sedang aktif. Tahap saat ini: '${stage.current_stage}'.`,
      };
    }

    const { error: updateErr } = await (supabase as any)
      .from("school_assessment_stages")
      .update({
        current_stage: "intervensi",
        stage_updated_at: new Date().toISOString(),
      })
      .eq("id", stageId);

    if (updateErr) throw updateErr;

    revalidatePath("/komunitas/dashboard");
    revalidatePath("/komunitas/akses-ujian");
    return { success: true };
  } catch (err: any) {
    console.error("[closeAssessmentManuallyAction]", err);
    return { success: false, error: err.message };
  }
}

/**
 * Tahap 4→5: Komunitas menandai pengisian intervensi telah tuntas dan siklus fase ini selesai.
 */
export async function markIntervensiSelesaiAction(
  stageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const communityId = await getCommunityIdFromHeader();
    const supabase = await createServerClient();

    let query = (supabase as any)
      .from("school_assessment_stages")
      .select("id, current_stage, community_id, school_id")
      .eq("id", stageId);

    if (communityId) {
      query = query.eq("community_id", communityId);
    }

    const { data: stage, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !stage) {
      return { success: false, error: "Tahap tidak ditemukan atau Anda tidak memiliki akses." };
    }

    if (stage.current_stage !== "intervensi") {
      return {
        success: false,
        error: `Hanya bisa menyelesaikan tahap intervensi. Tahap saat ini: '${stage.current_stage}'.`,
      };
    }

    const { error: updateErr } = await (supabase as any)
      .from("school_assessment_stages")
      .update({
        current_stage: "selesai",
        stage_updated_at: new Date().toISOString(),
      })
      .eq("id", stageId);

    if (updateErr) throw updateErr;

    revalidatePath("/komunitas/dashboard");
    revalidatePath("/komunitas/intervensi");
    revalidatePath("/sekolah/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[markIntervensiSelesaiAction]", err);
    return { success: false, error: err.message };
  }
}

/**
 * Tahap 5→Mulai Siklus Baru: Memulai fase berikutnya (misal Fase 1 -> Fase 2).
 */
export async function advanceStageToNewPhaseAction(
  stageId: string,
  newPhaseName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const communityId = await getCommunityIdFromHeader();
    const supabase = await createServerClient();

    let query = (supabase as any)
      .from("school_assessment_stages")
      .select("id, school_id, community_id, phase, current_stage")
      .eq("id", stageId);

    if (communityId) {
      query = query.eq("community_id", communityId);
    }

    const { data: stage, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !stage) {
      return { success: false, error: "Tahap tidak ditemukan." };
    }

    // Buat row stage baru atau update row saat ini ke fase baru
    const { error: insertErr } = await (supabase as any)
      .from("school_assessment_stages")
      .insert({
        school_id: stage.school_id,
        community_id: stage.community_id,
        phase: newPhaseName || "Fase 2",
        current_stage: "pengajuan_fase",
        stage_updated_at: new Date().toISOString(),
      });

    if (insertErr) throw insertErr;

    revalidatePath("/komunitas/dashboard");
    revalidatePath("/komunitas/akses-ujian");
    revalidatePath("/sekolah/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[advanceStageToNewPhaseAction]", err);
    return { success: false, error: err.message };
  }
}

/**
 * Ambil semua stages untuk satu sekolah (bisa lintas komunitas/fase jika ada).
 * Dipanggil oleh role Sekolah di dashboard / halaman intervensi mereka.
 */
export async function getStagesForSchool(schoolId: string): Promise<{
  success: boolean;
  data?: StageRow[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await (supabase as any)
      .from("school_assessment_stages")
      .select(`
        id, school_id, community_id, phase, current_stage,
        phase_request_id, stage_updated_at, created_at,
        schools(name, npsn, community_id)
      `)
      .eq("school_id", schoolId)
      .order("stage_updated_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: (data || []) as StageRow[] };
  } catch (err: any) {
    console.error("[getStagesForSchool]", err);
    return { success: false, error: err.message };
  }
}

/**
 * Ambil semua stages (opsional di-filter per komunitas) untuk Super Admin.
 */
export async function getStagesForSuperAdmin(communityId?: string): Promise<{
  success: boolean;
  data?: StageRow[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    let query = (supabase as any)
      .from("school_assessment_stages")
      .select(`
        id, school_id, community_id, phase, current_stage,
        phase_request_id, stage_updated_at, created_at,
        schools(name, npsn, community_id)
      `);

    if (communityId) {
      query = query.eq("community_id", communityId);
    }

    const { data, error } = await query.order("stage_updated_at", { ascending: false });
    if (error) throw error;
    return { success: true, data: (data || []) as StageRow[] };
  } catch (err: any) {
    console.error("[getStagesForSuperAdmin]", err);
    return { success: false, error: err.message };
  }
}
