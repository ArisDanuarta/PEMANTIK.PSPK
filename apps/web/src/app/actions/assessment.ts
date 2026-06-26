"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";

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

    // 3. Buat session baru untuk siswa yang sama, di kategori yang sama, attempt + 1
    const { error: insertErr } = await supabase
      .from("assessment_sessions")
      .insert({
        student_id: oldSession.student_id,
        category_id: oldSession.category_id,
        school_id: oldSession.school_id,
        phase: oldSession.phase || "Tahap 1",
        attempt_number: (oldSession.attempt_number || 1) + 1,
        status: "pending",
      });

    if (insertErr) {
      // Rollback is complex without RPC transaction, but setting void is fine since we can manually retry
      return { success: false, error: "Sesi lama dibatalkan, namun gagal membuat sesi baru." };
    }

    revalidatePath("/guru/dashboard");
    revalidatePath("/sekolah/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("Reset session error:", err);
    return { success: false, error: "Terjadi kesalahan internal server." };
  }
}
