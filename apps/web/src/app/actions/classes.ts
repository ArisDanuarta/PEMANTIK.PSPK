"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import { requireAuth } from "./auth";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function createClassAction(formData: FormData): Promise<ActionResponse> {
  try {
    const { role, schoolId: authSchoolId } = await requireAuth(["super_admin", "school", "community"]);
    const school_id = (formData.get("school_id") as string)?.trim();
    if (role === "school" && authSchoolId !== school_id) {
      return { success: false, error: "Akses ditolak. Bukan data sekolah Anda." };
    }
    const name = (formData.get("name") as string)?.trim();
    const grade = parseInt((formData.get("grade") as string) ?? "1", 10);
    const teacher_id = (formData.get("teacher_id") as string)?.trim() || null;
    const academic_year = (formData.get("academic_year") as string)?.trim() || "";

    if (!school_id || !name || !grade) {
      return { success: false, error: "Sekolah, Nama Kelas, dan Tingkat Kelas wajib diisi." };
    }

    const supabase = createServerClient();

    // Cek duplikat nama kelas di sekolah yang sama
    const { data: existing } = await supabase
      .from("classes")
      .select("id")
      .eq("school_id", school_id)
      .ilike("name", name)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Kelas dengan nama "${name}" sudah ada di sekolah ini.` };
    }

    const { error } = await supabase.from("classes").insert({
      school_id,
      name,
      grade,
      teacher_id,
      academic_year: academic_year || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      is_active: true,
    });

    if (error) {
      return { success: false, error: "Gagal membuat kelas: " + error.message };
    }

    revalidatePath("/sekolah/kelas");
    revalidatePath("/sekolah/dashboard");
    return { success: true, message: `Kelas "${name}" berhasil ditambahkan.` };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + (err.message || String(err)) };
  }
}

export async function updateClassAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const { role, schoolId: authSchoolId } = await requireAuth(["super_admin", "school", "community"]);
    const school_id = (formData.get("school_id") as string)?.trim();
    if (role === "school" && authSchoolId !== school_id) {
      return { success: false, error: "Akses ditolak. Bukan data sekolah Anda." };
    }
    const name = (formData.get("name") as string)?.trim();
    const grade = parseInt((formData.get("grade") as string) ?? "1", 10);
    const teacher_id = (formData.get("teacher_id") as string)?.trim() || null;
    const academic_year = (formData.get("academic_year") as string)?.trim() || "";

    if (!name || !grade) {
      return { success: false, error: "Nama Kelas dan Tingkat Kelas wajib diisi." };
    }

    const supabase = createServerClient();

    // Cek duplikat nama (kecuali kelas yang sedang diedit)
    if (school_id) {
      const { data: existing } = await supabase
        .from("classes")
        .select("id")
        .eq("school_id", school_id)
        .ilike("name", name)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        return { success: false, error: `Kelas dengan nama "${name}" sudah ada di sekolah ini.` };
      }
    }

    const { error } = await supabase
      .from("classes")
      .update({
        name,
        grade,
        teacher_id,
        academic_year,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: "Gagal memperbarui kelas: " + error.message };
    }

    revalidatePath("/sekolah/kelas");
    revalidatePath("/sekolah/guru");
    revalidatePath("/sekolah/siswa");
    return { success: true, message: `Kelas berhasil diperbarui.` };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + (err.message || String(err)) };
  }
}

export async function deleteClassAction(id: string): Promise<ActionResponse> {
  try {
    await requireAuth(["super_admin", "school", "community"]);
    const supabase = createServerClient();

    // Cek apakah kelas masih punya siswa
    const { count: studentCount } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", id);

    if (studentCount && studentCount > 0) {
      return {
        success: false,
        error: `Kelas tidak bisa dihapus karena masih memiliki ${studentCount} siswa. Pindahkan siswa ke kelas lain terlebih dahulu.`,
      };
    }

    // Lepas teacher_id dulu dari kelas ini
    await supabase.from("classes").update({ teacher_id: null }).eq("id", id);

    const { error } = await supabase.from("classes").delete().eq("id", id);

    if (error) {
      return { success: false, error: "Gagal menghapus kelas: " + error.message };
    }

    revalidatePath("/sekolah/kelas");
    revalidatePath("/sekolah/dashboard");
    return { success: true, message: "Kelas berhasil dihapus." };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan: " + (err.message || String(err)) };
  }
}

export async function toggleClassStatusAction(id: string, isActive: boolean): Promise<ActionResponse> {
  try {
    await requireAuth(["super_admin", "school", "community"]);
    const supabase = createServerClient();

    const { error } = await supabase
      .from("classes")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return { success: false, error: "Gagal mengubah status kelas: " + error.message };
    }

    revalidatePath("/sekolah/kelas");
    revalidatePath("/sekolah/dashboard");
    return { success: true, message: `Kelas berhasil ${isActive ? "diaktifkan" : "dinonaktifkan"}.` };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan: " + (err.message || String(err)) };
  }
}
