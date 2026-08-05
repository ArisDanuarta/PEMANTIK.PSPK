"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function deleteAssessmentAccessAction(id: string) {
  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from("assessment_access")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    
    revalidatePath("/super-admin/akses-ujian");
    revalidatePath("/komunitas/akses-ujian");
    revalidatePath("/sekolah/akses-ujian");
    return { success: true, message: "Akses ujian berhasil dihapus." };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal menghapus akses ujian." };
  }
}

export async function updateAssessmentAccessAction(id: string, data: { phase: string, valid_from: string, valid_until: string }) {
  try {
    const supabase = createServerClient();
    
    // Validasi basic
    if (!data.phase || !data.valid_from || !data.valid_until) {
      return { success: false, error: "Semua field (fase, tanggal mulai, tanggal selesai) harus diisi." };
    }
    if (new Date(data.valid_from) >= new Date(data.valid_until)) {
      return { success: false, error: "Tanggal mulai harus sebelum tanggal selesai." };
    }

    const { error } = await supabase
      .from("assessment_access")
      .update({
        phase: data.phase,
        valid_from: data.valid_from,
        valid_until: data.valid_until
      })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/super-admin/akses-ujian");
    revalidatePath("/komunitas/akses-ujian");
    revalidatePath("/sekolah/akses-ujian");
    return { success: true, message: "Akses ujian berhasil diperbarui." };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memperbarui akses ujian." };
  }
}

export async function assignAssessmentPackage(data: {
  categoryIds: string[];
  targetId: string;
  targetType: "community" | "school" | "class" | "student";
  phase: string;
  validFrom: string;
  validUntil: string;
}) {
  try {
    const supabase = createServerClient();

    // Pastikan user memiliki hak akses (RLS atau role check jika diperlukan)
    // Server action dijalankan dengan cookie user auth, jadi RLS Supabase berlaku otomatis

    const insertData = data.categoryIds.map((pid) => ({
      category_id: pid,
      target_id: data.targetId,
      target_type: data.targetType,
      phase: data.phase,
      valid_from: new Date(data.validFrom).toISOString(),
      valid_until: new Date(data.validUntil).toISOString(),
    }));

    const { error } = await supabase.from("assessment_access").insert(insertData);

    if (error) {
      if (error.code === "23505") { // Unique violation
        return { success: false, error: "Kategori dan fase ini sudah pernah ditugaskan ke target tersebut." };
      }
      console.error("Supabase insert error:", error);
      return { success: false, error: "Gagal menyimpan penugasan ujian." };
    }

    revalidatePath("/super-admin/akses-ujian");
    revalidatePath("/komunitas/akses-ujian");

    return { success: true };
  } catch (err: any) {
    console.error("Assign package error:", err);
    return { success: false, error: "Terjadi kesalahan internal server." };
  }
}

export async function assignCommunityPackageToSchool(data: {
  categoryIds: string[];
  schoolId: string;
  communityId: string;
}) {
  try {
    const supabase = createServerClient();

    // 1. Dapatkan akses komunitas untuk kategori-kategori tersebut
    const { data: accessData } = await supabase
      .from("assessment_access")
      .select("category_id, phase, valid_from, valid_until")
      .eq('target_type', 'community')
      .eq('target_id', data.communityId)
      .in('category_id', data.categoryIds)
      .eq('is_active', true);

    if (!accessData || accessData.length === 0) {
      return { success: false, error: "Kategori ujian tidak ditemukan pada akses komunitas Anda." };
    }

    // 2. Insert untuk masing-masing kategori dengan mewarisi phase dan valid dates
    const insertData = accessData.map(acc => ({
      category_id: acc.category_id,
      target_id: data.schoolId,
      target_type: "school",
      phase: acc.phase,
      valid_from: acc.valid_from,
      valid_until: acc.valid_until,
    }));

    const { error } = await supabase.from("assessment_access").insert(insertData);

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Kategori ini sudah pernah ditugaskan ke sekolah tersebut." };
      }
      console.error("Supabase insert error (community to school):", error);
      return { success: false, error: "Gagal menyimpan penugasan ujian." };
    }

    revalidatePath("/komunitas/akses-ujian");
    return { success: true };
  } catch (err: any) {
    console.error("Assign community package error:", err);
    return { success: false, error: "Terjadi kesalahan internal server." };
  }
}

export async function resetStudentSession(sessionId: string) {
  try {
    const supabase = createServerClient();
    
    // Server action uses authenticated user context. RLS protects this, 
    // but we might want to manually check role just to be safe,
    // or rely on a Supabase RPC if we want it completely safe.
    // For now we do it step by step via server using the service role to bypass RLS if needed,
    // or just the standard user token. We'll use the standard user token so RLS logs it right.
    
    // 1. Dapatkan info session lama
    const { data: oldSession, error: fetchErr } = await supabase
      .from("assessment_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchErr || !oldSession) {
      return { success: false, error: "Sesi ujian tidak ditemukan." };
    }

    // 2. Tandai session lama sebagai void
    const { error: voidErr } = await supabase
      .from("assessment_sessions")
      .update({ is_void: true, status: 'expired' })
      .eq("id", sessionId);

    if (voidErr) {
      return { success: false, error: "Gagal membatalkan sesi lama." };
    }
    

    revalidatePath("/guru/dashboard");
    revalidatePath("/sekolah/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("Reset session error:", err);
    return { success: false, error: "Terjadi kesalahan internal server." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// distributeAccessToSchools - Minggu 3
// Distribusikan satu parent access (community) ke banyak sekolah sekaligus.
// schoolIds = ['all'] → semua sekolah aktif. Tanggal DIWARISI dari parent.
// ─────────────────────────────────────────────────────────────────────────────
export async function distributeAccessToSchools(
  parentAccessId: string,
  schoolIds: string[],
  communityId: string
): Promise<{
  success: boolean;
  distributed_to?: number;
  skipped?: number;
  total_schools?: number;
  error?: string;
}> {
  try {
    const supabase = createServerClient();

    // 1. Validasi parent access
    const { data: parent, error: parentErr } = await supabase
      .from("assessment_access")
      .select("id, category_id, phase, valid_from, valid_until, max_attempts, target_type, target_id, is_active")
      .eq("id", parentAccessId)
      .single();

    if (parentErr || !parent) {
      return { success: false, error: "Akses ujian induk tidak ditemukan." };
    }
    if (parent.target_type !== "community" || parent.target_id !== communityId) {
      return { success: false, error: "Anda tidak memiliki izin atas akses ujian ini." };
    }
    if (!parent.is_active) {
      return { success: false, error: "Akses ujian induk sudah tidak aktif." };
    }

    // 2. Tentukan target sekolah
    const { data: allSchools } = await supabase
      .from("schools")
      .select("id")
      .eq("community_id", communityId)
      .eq("is_active", true);

    if (!allSchools || allSchools.length === 0) {
      return { success: false, error: "Tidak ada sekolah aktif dalam komunitas ini." };
    }

    let targetIds: string[];
    if (schoolIds.length === 1 && schoolIds[0] === "all") {
      targetIds = allSchools.map((s) => s.id);
    } else {
      const validSet = new Set(allSchools.map((s) => s.id));
      const invalid = schoolIds.filter((id) => !validSet.has(id));
      if (invalid.length > 0) {
        return { success: false, error: `${invalid.length} sekolah tidak termasuk dalam komunitas Anda.` };
      }
      targetIds = schoolIds;
    }

    if (targetIds.length === 0) {
      return { success: false, error: "Tidak ada sekolah yang dipilih." };
    }

    // 3. Cek yang sudah punya akses (idempoten)
    const { data: existing } = await supabase
      .from("assessment_access")
      .select("target_id")
      .eq("category_id", parent.category_id)
      .eq("phase", parent.phase ?? "")
      .eq("target_type", "school")
      .in("target_id", targetIds);

    const haveAccess = new Set(existing?.map((a) => a.target_id) ?? []);
    const toInsert = targetIds.filter((id) => !haveAccess.has(id));
    const skipped = targetIds.length - toInsert.length;

    if (toInsert.length === 0) {
      return { success: true, distributed_to: 0, skipped, total_schools: targetIds.length };
    }

    // 4. Insert - tanggal valid DIWARISI dari parent
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const rows = toInsert.map((schoolId) => ({
      category_id:  parent.category_id,
      target_type:  "school",
      target_id:    schoolId,
      phase:        parent.phase,
      valid_from:   parent.valid_from,
      valid_until:  parent.valid_until,
      max_attempts: parent.max_attempts,
      is_active:    true,
      granted_by:   userId ?? undefined,
    }));

    const { error: insertErr } = await supabase.from("assessment_access").insert(rows);

    if (insertErr) {
      if (insertErr.code === "23505") {
        return { success: false, error: "Beberapa sekolah sudah memiliki akses ujian ini." };
      }
      console.error("[distributeAccessToSchools]", insertErr);
      return { success: false, error: `Gagal mendistribusikan: ${insertErr.message}` };
    }

    revalidatePath("/komunitas/akses-ujian");
    revalidatePath("/sekolah/akses-ujian");
    revalidatePath("/super-admin/akses-ujian");

    return { success: true, distributed_to: toInsert.length, skipped, total_schools: targetIds.length };
  } catch (err: any) {
    console.error("[distributeAccessToSchools]", err);
    return { success: false, error: "Terjadi kesalahan internal server." };
  }
}
