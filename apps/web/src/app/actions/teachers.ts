"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { parseFlexibleDate, normalizeIdentityNumber, normalizeSearchString, normalizeText } from "@/lib/normalizationUtils";
import { requireAuth } from "./auth";
import { generateTeacherCredentials } from "@/lib/credentialGenerator";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  insertedIds?: string[];
  credentials?: {
    username?: string;
    password?: string;
    pin?: string;
  };
}

function normalizeGender(val: any): "L" | "P" {
  if (!val) return "L";
  const s = String(val).toLowerCase().trim();
  if (s === "l" || s.includes("laki") || s === "pria" || s === "male" || s === "m") return "L";
  return "P";
}


export async function createTeacherAction(
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { role, schoolId: authSchoolId } = await requireAuth(["super_admin", "school", "community"]);
    const school_id = (formData.get("school_id") as string)?.trim();
    if (role === "school" && authSchoolId !== school_id) {
      return { success: false, error: "Akses ditolak. Bukan data sekolah Anda." };
    }
    const full_name = (formData.get("full_name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim() || null;
    const nip = (formData.get("nip") as string)?.trim() || null;
    const gender = (formData.get("gender") as string)?.trim() || null;
    const birth_date = (formData.get("birth_date") as string)?.trim() || null;
    
    const village = (formData.get("village") as string)?.trim() || null;
    const district = (formData.get("district") as string)?.trim() || null;
    const regency = (formData.get("regency") as string)?.trim() || null;
    const province = (formData.get("province") as string)?.trim() || null;
    
    const is_active = formData.get("is_active") !== "false";
    const class_ids = formData.getAll("class_ids") as string[];

    if (!school_id || !full_name || !gender || !birth_date || !village || !district || !regency || !province || !class_ids || class_ids.length === 0) {
      return { success: false, error: "Sekolah, Nama, Gender, Tanggal Lahir, Wilayah, dan Daftar Kelas wajib diisi." };
    }

    const supabase = createServerClient();

    // Dapatkan data sekolah untuk kredensial dan community_id
    const { data: schoolData } = await supabase.from("schools").select("community_id, name").eq("id", school_id).single();
    
    const teacherCreds = generateTeacherCredentials(full_name, schoolData?.name || "Sekolah", nip, birth_date);
    const { username, password: generatedPassword } = teacherCreds;
    
    const adminEmail = email || `${username}@pemantik.local`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: "teacher",
      }
    });

    if (authError || !authData.user) {
      return { success: false, error: "Gagal membuat akun Auth guru: " + (authError?.message || "Unknown") };
    }

    const community_id = schoolData?.community_id || authSchoolId; // fallback jika somehow gagal tapi role komunitas

    const { error: userError } = await (supabase as any).from("users").insert({
      id: authData.user.id,
      username,
      full_name,
      role: "teacher",
      school_id,
      community_id,
      nip,
      email: email || null,
      gender: normalizeGender(gender) as any,
      birth_date,
      village,
      district,
      city: regency,
      province,
      is_active,
      plain_password: generatedPassword
    } as any);

    if (userError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: "Gagal menyimpan data guru: " + userError.message };
    }

    // Simpan relasi kelas di class_teachers (many-to-many)
    if (class_ids && class_ids.length > 0) {
      // Set wali kelas utama (teacher_id) di kelas pertama
      await supabase.from("classes").update({ teacher_id: authData.user.id }).eq("id", class_ids[0]);
      // Simpan semua relasi ke class_teachers
      const classTeacherRows = class_ids.map((cid: string) => ({ class_id: cid, teacher_id: authData.user.id }));
      const { error: ctErr } = await (supabase as any).from("class_teachers").insert(classTeacherRows);
      if (ctErr) console.error("Failed to insert class_teachers:", ctErr);
    }

    revalidatePath("/super-admin/guru");
    revalidatePath("/komunitas/guru");
    return { 
      success: true, 
      message: `Guru berhasil ditambahkan.`,
      credentials: { username, password: generatedPassword },
    };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan: " + (err.message || String(err)) };
  }
}

export async function bulkCreateTeachersAction(
  dataArray: any[]
): Promise<ActionResponse> {
  try {
    const { role, schoolId: authSchoolId, communityId: authCommunityId } = await requireAuth(["super_admin", "school", "community"]);
    if (!dataArray || dataArray.length === 0) {
      return { success: false, error: "Data kosong." };
    }

    const supabase = createServerClient();
    
    // Fetch all schools for case-insensitive matching
    let query = supabase.from("schools").select("id, name, community_id");
    if (role === "community" && authCommunityId) {
      query = query.eq("community_id", authCommunityId);
    }
    const { data: schoolsData } = await query;
    const schoolsMap = new Map((schoolsData || []).map((s: any) => [normalizeSearchString(s.name), s.id]));

    // Fetch all classes
    const { data: allClasses } = await supabase.from("classes").select("id, name, school_id");

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    const insertedIds: string[] = [];

    for (let i = 0; i < dataArray.length; i++) {
      const row = dataArray[i];
      // Key sudah lowercase setelah normalisasi BulkUploadModal
      const full_name = normalizeText(row.nama_guru);
      const nip = normalizeIdentityNumber(row.nip) || null;
      const email = normalizeText(row.email_guru) || null;
      const schoolName = normalizeSearchString(row.nama_sekolah);
      const gender = String(row.jenis_kelamin || "").trim();
      const village = normalizeText(row.kelurahan_desa);
      const district = normalizeText(row.kecamatan);
      const regency = normalizeText(row.kabupaten);
      const province = normalizeText(row.provinsi);
      const inputKelas = normalizeText(row.kelas);
      let birth_date = row.tanggal_lahir || null;

      const missingCols = [];
      if (!schoolName) missingCols.push("Nama Sekolah");
      if (!full_name) missingCols.push("Nama Guru");
      if (!gender) missingCols.push("Jenis Kelamin");
      if (!birth_date) missingCols.push("Tanggal Lahir");
      if (!village) missingCols.push("Kelurahan/Desa");
      if (!district) missingCols.push("Kecamatan");
      if (!regency) missingCols.push("Kabupaten/Kota");
      if (!province) missingCols.push("Provinsi");
      if (!inputKelas) missingCols.push("Kelas");

      if (missingCols.length > 0) {
        failCount++;
        errors.push(`Baris ${i + 2} gagal: Kolom berikut kosong atau salah format: ${missingCols.join(", ")}.`);
        continue;
      }

      const school_id = schoolsMap.get(schoolName);
      if (!school_id) {
         failCount++;
         errors.push(`Baris ${i + 2} gagal: Sekolah "${schoolName}" tidak ditemukan atau bukan binaan komunitas Anda.`);
         continue;
      }

      const parsedDate = parseFlexibleDate(birth_date);
      if (!parsedDate) {
        failCount++;
        errors.push(`Baris ${i + 2} gagal: Format tanggal lahir '${birth_date}' tidak dikenali.`);
        continue;
      }
      birth_date = parsedDate;

      const birth_date_val = birth_date;

      const bulkTeacherCreds = generateTeacherCredentials(full_name as string, schoolName, nip, birth_date_val);
      const { username, password: generatedPassword } = bulkTeacherCreds;
      
      const adminEmail = email || `${username}@pemantik.local`;
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { full_name, role: "teacher" }
      });

      if (authError || !authData.user) {
        failCount++;
        errors.push(`Baris ${i + 2} gagal (Auth): ${authError?.message}`);
        continue;
      }

      // Get community_id from the pre-fetched schools map
      const schoolObj = schoolsData?.find((s: any) => s.id === school_id);
      const community_id = schoolObj?.community_id || authCommunityId;

      const { error: userError } = await (supabase as any).from("users").insert({
        id: authData.user.id,
        username,
        full_name,
        role: "teacher",
        school_id,
        community_id,
        nip: row.nip ? String(row.nip) : null,
        email: email || null,
        gender: normalizeGender(gender) as any,
        birth_date: birth_date,
        village: village,
        district: district,
        city: regency,
        province: province,
        is_active: true,
        plain_password: generatedPassword
      } as any);

      if (userError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        failCount++;
        errors.push(`Baris ${i + 2} gagal (Insert DB): ${userError.message}`);
        continue;
      }

      // Process Kelas - simpan ke class_teachers (many-to-many)
      if (inputKelas) {
        const classNames = String(inputKelas).split(",").map(c => c.trim().toLowerCase());
        const matchedClassIds = (allClasses || [])
           .filter(c => c.school_id === school_id && classNames.includes(c.name.toLowerCase()))
           .map(c => c.id);

        if (matchedClassIds.length > 0) {
           // Set wali kelas utama di kelas pertama
           await supabase.from("classes").update({ teacher_id: authData.user.id }).eq("id", matchedClassIds[0]);
           // Simpan semua ke class_teachers
           const classTeacherRows = matchedClassIds.map((cid: string) => ({ class_id: cid, teacher_id: authData.user.id }));
           await (supabase as any).from("class_teachers").insert(classTeacherRows);
        } else {
           console.warn(`Kelas [${inputKelas}] tidak ditemukan untuk sekolah ID: ${school_id}`);
        }
      }

      insertedIds.push(authData.user.id);
      successCount++;
    }

    revalidatePath("/super-admin/guru");
    revalidatePath("/komunitas/guru");
    const errText = errors.length > 0 ? " Detail: " + errors.slice(0, 3).join(" | ") + (errors.length > 3 ? "..." : "") : "";
    
    if (successCount === 0) {
      return {
        success: false,
        error: `Gagal mengimpor guru. Terdapat ${failCount} baris bermasalah.${errText}`
      };
    }

    return { 
      success: true, 
      message: `Berhasil mengimpor ${successCount} guru. Gagal: ${failCount} baris.${errText}`,
      insertedIds
    };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + err.message };
  }
}

export async function updateTeacherAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const { role, schoolId: authSchoolId } = await requireAuth(["super_admin", "school", "community"]);
    const school_id = (formData.get("school_id") as string)?.trim();
    if (role === "school" && authSchoolId !== school_id) {
      return { success: false, error: "Akses ditolak. Bukan data sekolah Anda." };
    }
    const full_name = (formData.get("full_name") as string)?.trim();
    const nip = (formData.get("nip") as string)?.trim() || null;
    const gender = (formData.get("gender") as string)?.trim() || null;
    const birth_date = (formData.get("birth_date") as string)?.trim() || null;
    const village = (formData.get("village") as string)?.trim() || null;
    const district = (formData.get("district") as string)?.trim() || null;
    const regency = (formData.get("regency") as string)?.trim() || null;
    const province = (formData.get("province") as string)?.trim() || null;
    const is_active = formData.get("is_active") !== "false";
    const class_ids = formData.getAll("class_ids") as string[];

    if (!school_id || !full_name || !gender || !birth_date || !village || !district || !regency || !province || !class_ids || class_ids.length === 0) {
      return { success: false, error: "Semua kolom wajib harus diisi." };
    }

    const supabase = createServerClient();
    
    const { error: userError } = await supabase.from("users").update({
      full_name,
      school_id,
      nip,
      gender: gender as any,
      birth_date,
      village,
      district,
      city: regency,
      province,
      is_active
    } as any).eq("id", id);

    if (userError) {
      return { success: false, error: "Gagal memperbarui data guru: " + userError.message };
    }

    // Reset classes first (remove teacher from all classes)
    await supabase.from("classes").update({ teacher_id: null }).eq("teacher_id", id);
    await (supabase as any).from("class_teachers").delete().eq("teacher_id", id);
    
    // Assign new classes
    if (class_ids && class_ids.length > 0) {
      await supabase.from("classes").update({ teacher_id: id }).in("id", class_ids);
      const classTeacherRows = class_ids.map((cid: string) => ({ class_id: cid, teacher_id: id }));
      await (supabase as any).from("class_teachers").insert(classTeacherRows);
    }

    revalidatePath("/super-admin/guru");
    revalidatePath("/komunitas/guru");
    return { success: true, message: "Data guru berhasil diperbarui." };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan: " + (err.message || String(err)) };
  }
}

export async function resetTeacherPasswordAction(teacherId: string): Promise<ActionResponse> {
  try {
    await requireAuth(["super_admin", "school", "community"]);
    const supabase = createServerClient();
    
    // Ambil data guru untuk generate password kontekstual
    const { data: teacherData } = await supabase
      .from("users")
      .select("username, full_name, nip, birth_date, schools(name)")
      .eq("id", teacherId)
      .maybeSingle();

    const creds = generateTeacherCredentials(
      (teacherData as any)?.full_name || "guru",
      (teacherData as any)?.schools?.name || "Sekolah",
      (teacherData as any)?.nip || null,
      (teacherData as any)?.birth_date || null,
    );

    const { error: authError } = await supabase.auth.admin.updateUserById(teacherId, {
      password: creds.password
    });
    
    if (authError) {
      return { success: false, error: "Gagal mereset password: " + authError.message };
    }

    const { error: updateError } = await (supabase as any).from("users").update({
      plain_password: creds.password
    }).eq("id", teacherId);

    if (updateError) {
      return { success: false, error: "Berhasil mereset password, tetapi gagal mengupdate tabel users." };
    }

    revalidatePath("/super-admin/guru");
    revalidatePath("/komunitas/guru");
    return { 
      success: true,
      credentials: { username: (teacherData as any)?.username, password: creds.password },
    };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + (err.message || String(err)) };
  }
}

export async function deleteTeacherAction(id: string) {
  try {
    await requireAuth(["super_admin", "school", "community"]);
    const supabase = createServerClient();
    
    // Auth account must be deleted, which deletes cascade user
    // Wait, we need to use admin auth client to delete the auth account.
    // If not, we can soft delete or hard delete. But let's delete using auth admin.
    const { error: deleteAuthErr } = await supabase.auth.admin.deleteUser(id);
    if (deleteAuthErr) {
       // if we don't have auth admin privileges from standard client, we might just delete from users
       // but supabase RLS handles it. Let's try direct table deletion if auth admin fails
       console.error("Auth Admin deletion failed, falling back to users table deletion", deleteAuthErr);
       const { error } = await supabase.from("users").delete().eq("id", id);
       if (error) return { success: false, error: "Gagal menghapus data: " + error.message };
    }

    revalidatePath("/super-admin/guru");
    revalidatePath("/komunitas/guru");
    return { success: true, message: "Guru berhasil dihapus." };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan: " + err.message };
  }
}

export async function bulkDeleteTeachersAction(ids: string[]) {
  const { role } = await requireAuth(["super_admin", "school", "community"]);
  if (role !== "super_admin" && role !== "school" && role !== "community") {
    return { success: false, error: "Unauthorized" };
  }
  if (!ids || ids.length === 0) return { success: true };
  
  try {
    const supabase = createServerClient();
    for (const id of ids) {
      await supabase.auth.admin.deleteUser(id);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
