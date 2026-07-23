"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { parseFlexibleDate, normalizeIdentityNumber, normalizeSearchString, normalizeText } from "@/lib/normalizationUtils";
import { requireAuth } from "./auth";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
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

    const words = full_name.split(/\s+/).map((w: string) => w.replace(/[^a-zA-Z]/g, "").toLowerCase()).filter((w: string) => w.length > 0);
    const balineseTitles = new Set(["i", "ni", "ida", "aa", "anak", "agung", "tjokorda", "cokorda", "dewa", "desak", "gusti", "ngakan", "bagus", "ayu", "putu", "wayan", "gede", "gde", "iluh", "luh", "made", "kadek", "nengah", "kdk", "md", "nyoman", "komang", "nym", "kmg", "ketut", "kt"]);
    let validNames = words.filter((word: string) => !balineseTitles.has(word) && word.length > 1);
    if (validNames.length === 0) validNames = words;
    let randomNamePart = "guru";
    if (validNames.length > 0) {
      randomNamePart = validNames[Math.floor(Math.random() * validNames.length)].slice(0, 10);
    }
    const nipDigits = (nip || "").replace(/[^0-9]/g, "");
    let digitsPart = nipDigits.length >= 3 ? nipDigits.slice(-3) : Math.floor(100 + Math.random() * 900).toString();
    const username = `${randomNamePart}${digitsPart}`;
    const defaultPassword = "Password123!";
    
    const adminEmail = email || `${username}@pemantik.local`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: "teacher",
      }
    });

    if (authError || !authData.user) {
      return { success: false, error: "Gagal membuat akun Auth guru: " + (authError?.message || "Unknown") };
    }

    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      username,
      full_name,
      role: "teacher",
      school_id,
      nip,
      email: email || null,
      gender: normalizeGender(gender) as any,
      birth_date,
      village,
      district,
      city: regency,
      province,
      is_active
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
    return { success: true, message: `Guru berhasil ditambahkan. Username: ${username} | Pass: ${defaultPassword}` };
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

      const words = (full_name as string).split(/\s+/).map((w: string) => w.replace(/[^a-zA-Z]/g, "").toLowerCase()).filter((w: string) => w.length > 0);
      const balineseTitles = new Set(["i", "ni", "ida", "aa", "anak", "agung", "tjokorda", "cokorda", "dewa", "desak", "gusti", "ngakan", "bagus", "ayu", "putu", "wayan", "gede", "gde", "iluh", "luh", "made", "kadek", "nengah", "kdk", "md", "nyoman", "komang", "nym", "kmg", "ketut", "kt"]);
      let validNames = words.filter((word: string) => !balineseTitles.has(word) && word.length > 1);
      if (validNames.length === 0) validNames = words;
      let randomNamePart = "guru";
      if (validNames.length > 0) {
        randomNamePart = validNames[Math.floor(Math.random() * validNames.length)].slice(0, 10);
      }
      const nipDigits = (nip || "").replace(/[^0-9]/g, "");
      let digitsPart = nipDigits.length >= 3 ? nipDigits.slice(-3) : Math.floor(100 + Math.random() * 900).toString();
      const username = `${randomNamePart}${digitsPart}`;
      
      const adminEmail = email || `${username}@pemantik.local`;
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: "Password123!",
        email_confirm: true,
        user_metadata: { full_name, role: "teacher" }
      });

      if (authError || !authData.user) {
        failCount++;
        errors.push(`Baris ${i + 2} gagal (Auth): ${authError?.message}`);
        continue;
      }

      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        username,
        full_name,
        role: "teacher",
        school_id,
        nip: row.nip ? String(row.nip) : null,
        email: email || null,
        gender: normalizeGender(gender) as any,
        birth_date: birth_date,
        village: village,
        district: district,
        city: regency,
        province: province,
        is_active: true
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
      message: `Berhasil mengimpor ${successCount} guru. Gagal: ${failCount} baris.${errText}` 
    };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + err.message };
  }
}

export async function updateTeacherAction(id: string, formData: FormData) {
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
    
    // For teachers, teacherId is their auth user id
    const { error: authError } = await supabase.auth.admin.updateUserById(teacherId, {
      password: "Password123!"
    });
    
    if (authError) {
      return { success: false, error: "Gagal mereset password: " + authError.message };
    }

    revalidatePath("/super-admin/guru");
    revalidatePath("/komunitas/guru");
    return { success: true };
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
