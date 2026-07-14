"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAuth } from "./auth";
import { headers } from "next/headers";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

function generateRandomString(length = 5) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function processClassesString(classesStr: string, schoolId: string) {
  if (!classesStr) return [];
  const classNames = classesStr.split(",").map(c => c.trim()).filter(c => c.length > 0);
  const currentYear = new Date().getFullYear();
  const academic_year = `${currentYear}/${currentYear + 1}`;
  
  return classNames.map(name => {
    let grade = 1;
    const match = name.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (parsed >= 1 && parsed <= 9) grade = parsed;
      else if (parsed > 9) grade = 9;
    }
    return { school_id: schoolId, name, grade, academic_year, is_active: true };
  });
}

export async function createSchoolAction(
  formData: FormData
): Promise<ActionResponse> {
  try {
    await requireAuth(["super_admin"]);
    const community_id = (formData.get("community_id") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const npsn = (formData.get("npsn") as string)?.trim() || null;
    const address = (formData.get("address") as string)?.trim() || null;
    const province = (formData.get("province") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const district = (formData.get("district") as string)?.trim() || null;
    const village = (formData.get("village") as string)?.trim() || null;
    const principal_name = (formData.get("principal_name") as string)?.trim() || null;
    const contact_phone = (formData.get("contact_phone") as string)?.trim() || null;
    const is_active = formData.get("is_active") !== "false";
    const classesStr = (formData.get("classes") as string)?.trim() || "";

    if (!name || !province || !city || !district || !village || !classesStr) {
      return { success: false, error: "Nama Sekolah, Provinsi, Kota, Kecamatan, Desa, dan Daftar Kelas wajib diisi." };
    }

    const supabase = createServerClient();

    let finalCommunityId: string | null = community_id as string;
    if (!finalCommunityId || finalCommunityId === "null" || finalCommunityId === "independent") {
      finalCommunityId = null;
    }

    // Check NPSN uniqueness if provided
    if (npsn) {
      const { data: existing } = await supabase
        .from("schools")
        .select("id")
        .eq("npsn", npsn)
        .maybeSingle();
      if (existing) {
        return { success: false, error: `NPSN '${npsn}' sudah digunakan.` };
      }
    }

    const { data: newSchool, error } = await (supabase as any).from("schools").insert({
      community_id: finalCommunityId,
      name,
      npsn,
      address,
      province,
      city,
      district,
      village,
      principal_name,
      contact_phone,
      is_active,
      import_source: "manual",  
    }).select().single();

    if (error || !newSchool) {
      return { success: false, error: "Gagal membuat sekolah: " + error?.message };
    }

    await (supabase as any).from("school_assessment_stages").insert({
      school_id: newSchool.id,
      community_id: finalCommunityId || null,
      current_stage: "persiapan_akun",
    });

    if (classesStr) {
      const classesToInsert = processClassesString(classesStr, newSchool.id);
      if (classesToInsert.length > 0) {
        const { error: classesErr } = await supabase.from("classes").insert(classesToInsert);
        if (classesErr) console.error("Failed to insert classes:", classesErr);
      }
    }

    const defaultPassword = "Password123!";
    const username = `sch_${npsn || generateRandomString(5)}`;
    const adminEmail = `${username}@pemantik.local`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: `Admin ${name}`,
        role: 'school',
      }
    });

    if (authError || !authData.user) {
      console.error("Failed to create school admin auth user:", authError);
      await supabase.from("schools").delete().eq("id", newSchool.id);
      return { success: false, error: "Gagal membuat akun login sekolah: " + (authError?.message || "Unknown error") };
    }

    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      username: username,
      full_name: `Admin ${name}`,
      role: "school",
      school_id: newSchool.id,
      is_active: true,
    });

    if (userError) {
      console.error("Failed to insert into public.users:", userError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from("schools").delete().eq("id", newSchool.id);
      return { success: false, error: "Gagal menyimpan data pengguna sekolah: " + userError.message };
    }

    revalidatePath("/super-admin/sekolah");
    revalidatePath("/komunitas/sekolah");
    return { 
      success: true, 
      message: `Sekolah berhasil ditambahkan. Akun Admin: ${username} | Pass: ${defaultPassword}` 
    };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan: " + (err.message || String(err)) };
  }
}

export async function updateSchoolAction(
  id: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { role, schoolId: authSchoolId } = await requireAuth(["super_admin", "school"]);
    if (role === "school" && authSchoolId !== id) {
      return { success: false, error: "Akses ditolak." };
    }
    const community_id = (formData.get("community_id") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const npsn = (formData.get("npsn") as string)?.trim() || null;
    const address = (formData.get("address") as string)?.trim() || null;
    const province = (formData.get("province") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const district = (formData.get("district") as string)?.trim() || null;
    const village = (formData.get("village") as string)?.trim() || null;
    const principal_name = (formData.get("principal_name") as string)?.trim() || null;
    const contact_phone = (formData.get("contact_phone") as string)?.trim() || null;
    const is_active = formData.get("is_active") !== "false";
    const classesStr = (formData.get("classes") as string)?.trim() || "";

    if (!name || !province || !city || !district || !village || !classesStr) {
      return { success: false, error: "Nama Sekolah, Provinsi, Kota, Kecamatan, Desa, dan Daftar Kelas wajib diisi." };
    }

    const supabase = createServerClient();

    let finalCommunityId: string | null = community_id as string;
    if (!finalCommunityId || finalCommunityId === "null" || finalCommunityId === "independent") {
      finalCommunityId = null;
    }

    if (npsn) {
      const { data: existing } = await supabase
        .from("schools")
        .select("id")
        .eq("npsn", npsn)
        .neq("id", id)
        .maybeSingle();
      if (existing) {
        return { success: false, error: `NPSN '${npsn}' sudah digunakan oleh sekolah lain.` };
      }
    }

    const { error } = await (supabase as any)
      .from("schools")
      .update({
        community_id: finalCommunityId,
        name,
        npsn,
        address,
        province,
        city,
        district,
        village,
        principal_name,
        contact_phone,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: "Gagal memperbarui sekolah: " + error.message };
    }

    if (classesStr) {
      const newClasses = processClassesString(classesStr, id);
      const { data: existingClasses } = await supabase.from("classes").select("name").eq("school_id", id);
      const existingNames = new Set((existingClasses || []).map(c => c.name.toLowerCase()));
      
      const toInsert = newClasses.filter(c => !existingNames.has(c.name.toLowerCase()));
      if (toInsert.length > 0) {
        await supabase.from("classes").insert(toInsert);
      }
    }

    revalidatePath("/super-admin/sekolah");
    revalidatePath("/komunitas/sekolah");
    return { success: true, message: "Sekolah berhasil diperbarui." };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + err.message };
  }
}

export async function deleteSchoolAction(id: string): Promise<ActionResponse> {
  try {
    await requireAuth(["super_admin"]);
    const supabase = createServerClient();
    
    const { data: usersData } = await supabase
      .from("users")
      .select("id")
      .eq("school_id", id);

    if (usersData && usersData.length > 0) {
      for (const u of usersData) {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }

    // Explicitly delete records with RESTRICT foreign keys to allow school deletion
    await supabase.from("assessment_sessions").delete().eq("school_id", id);
    await supabase.from("students").delete().eq("school_id", id);

    const { error } = await supabase.from("schools").delete().eq("id", id);
    
    if (error) {
      return { success: false, error: "Gagal menghapus sekolah: " + error.message };
    }

    revalidatePath("/super-admin/sekolah");
    revalidatePath("/komunitas/sekolah");
    return { success: true, message: "Sekolah berhasil dihapus." };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan: " + err.message };
  }
}

export async function bulkCreateSchoolsAction(
  dataArray: any[]
): Promise<ActionResponse> {
  try {
    const { role, communityId: authCommunityId } = await requireAuth(["super_admin", "community"]);
    if (!dataArray || dataArray.length === 0) {
      return { success: false, error: "Data kosong." };
    }

    const supabase = createServerClient();
    const { data: commsData } = await supabase.from("communities").select("id, name");
    const commsMap = new Map((commsData || []).map((c: any) => [c.name.toLowerCase().trim(), c.id]));

    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const row = dataArray[i];
      const name = row.Nama_Sekolah || row.name || row.nama_sekolah;
      const province = row.Provinsi || row.province;
      const city = row.Kota || row.city;
      const district = row.Kecamatan || row.district;
      const village = row.Desa || row.Kelurahan || row.village;
      const classesStr = row.Daftar_Kelas || row.daftar_kelas || row.classes;

      if (!name || !province || !city || !district || !village || !classesStr) {
        errors.push(`Baris ${i + 2} gagal: Kolom 'Nama_Sekolah', 'Provinsi', 'Kota', 'Kecamatan', 'Desa', dan 'Daftar_Kelas' wajib diisi.`);
        continue;
      }

      let community_id: string | undefined;

      if (role === "community") {
        community_id = authCommunityId;
      } else {
        const directCommunityId = row.community_id;
        const isUUID = directCommunityId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(directCommunityId));

        if (isUUID) {
          community_id = directCommunityId;
        } else {
          const commName = row.nama_komunitas || row.Nama_Komunitas || row.Community_ID || row.community_id;
          if (commName) {
            community_id = commsMap.get(String(commName).toLowerCase().trim());
            if (!community_id && String(commName).length === 36) {
              const exactMatch = (commsData || []).find((c: any) => c.id === commName);
              if (exactMatch) community_id = exactMatch.id;
            }
          }
        }
      }

      if (!community_id) {
        const commName = row.nama_komunitas || row.Nama_Komunitas || row.community_id || "(tidak ada)";
        errors.push(`Baris ${i + 2} gagal: Komunitas "${commName}" tidak ditemukan di database.`);
        continue;
      }

      const npsn = row.NPSN || row.npsn ? String(row.NPSN || row.npsn).trim() : null;

      const { data: newSchool, error: schoolErr } = await supabase.from("schools").insert({
        community_id,
        name,
        npsn,
        address: row.Alamat || row.address || null,
        province: row.Provinsi || row.province || null,
        city: row.Kota || row.city || null,
        district: row.Kecamatan || row.district || null,
        village: row.Desa || row.Kelurahan || row.village || null,
        principal_name: row.Nama_Kepsek || row.principal_name || null,
        contact_phone: row.Telp || row.contact_phone ? String(row.Telp || row.contact_phone) : null,
        is_active: true,
        import_source: "manual", 
      }).select().single();

      if (schoolErr || !newSchool) {
        errors.push(`Baris ${i + 2} gagal: ${schoolErr?.message || "Unknown error"}`);
        continue;
      }

      await (supabase as any).from("school_assessment_stages").insert({
        school_id: newSchool.id,
        community_id: community_id || null,
        current_stage: "persiapan_akun",
      });

      const defaultPassword = "Password123!";
      const username = `sch_${npsn || generateRandomString(5)}`;
      const adminEmail = `${username}@pemantik.local`;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          full_name: `Admin ${name}`,
          role: 'school',
        }
      });

      if (authError || !authData.user) {
         await supabase.from("schools").delete().eq("id", newSchool.id);
         errors.push(`Baris ${i + 2} gagal buat auth: ${authError?.message}`);
         continue;
      }

      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        username: username,
        full_name: `Admin ${name}`,
        role: "school",
        school_id: newSchool.id,
        is_active: true,
      });

      if (userError) {
         await supabase.auth.admin.deleteUser(authData.user.id);
         await supabase.from("schools").delete().eq("id", newSchool.id);
         errors.push(`Baris ${i + 2} gagal insert user: ${userError.message}`);
         continue;
      }

      if (classesStr) {
        const classesToInsert = processClassesString(String(classesStr), newSchool.id);
        if (classesToInsert.length > 0) {
          const { error: classesErr } = await supabase.from("classes").insert(classesToInsert);
          if (classesErr) console.error(`Failed to insert classes for school ${newSchool.id}:`, classesErr);
        }
      }

      successCount++;
    }

    revalidatePath("/super-admin/sekolah");
    revalidatePath("/komunitas/sekolah");
    
    if (successCount === 0 && errors.length > 0) {
       return { success: false, error: "Semua baris gagal diimpor. Detail: " + errors.slice(0, 3).join(" | ") + (errors.length > 3 ? "..." : "") };
    }

    const errText = errors.length > 0 ? " | Detail Gagal: " + errors.slice(0, 3).join(" | ") + (errors.length > 3 ? "..." : "") : "";
    return { success: true, message: `${successCount} Sekolah dan Akun berhasil ditambahkan.` + errText };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + err.message };
  }
}

export async function resetSchoolPasswordAction(schoolId: string): Promise<ActionResponse> {
  try {
    await requireAuth(["super_admin"]);
    const supabase = createServerClient();
    
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("school_id", schoolId)
      .eq("role", "school")
      .maybeSingle();

    if (userError || !user) {
      return { success: false, error: "Akun admin sekolah tidak ditemukan." };
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
      password: "Password123!"
    });
    
    if (authError) {
      return { success: false, error: "Gagal mereset password: " + authError.message };
    }

    revalidatePath("/super-admin/sekolah");
    revalidatePath("/komunitas/sekolah");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + (err.message || String(err)) };
  }
}

import { parseDapodikFile, type DapodikParseResult } from "@/lib/parseDapodik";

export interface ParseDapodikResponse {
  success: boolean;
  error?: string;
  parse_token?: string;
  summary?: {
    detected_school_name: string | null;
    detected_npsn: string | null;
    detected_province: string | null;
    detected_city: string | null;
    detected_district: string | null;
    detected_village: string | null;
    raw_header_text: string;
    row_count: number;
    skipped_count: number;
    detected_classes: string[];
    missing_ses_count: number;
    preview_rows: any[];
    warning_count: number;
    skipped_rows: any[];
  };
}

export interface ImportDapodikPayload {
  parse_token: string;
  school_choice: "new" | "existing";
  existing_school_id?: string;
  confirmed_name?: string;
  confirmed_npsn?: string;
  confirmed_province?: string;
  confirmed_city?: string;
  confirmed_district?: string;
  confirmed_village?: string;
  academic_year?: string;
}

export interface ImportDapodikResponse {
  success: boolean;
  error?: string;
  batch_id?: string;
}

function generateStudentUsername(fullName: string, npsn?: string | null, nisn?: string | null, nipd?: string | null): string {
  const words = fullName.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, "").toLowerCase()).filter(w => w.length > 0);
  const balineseTitles = new Set([
    "i", "ni", "ida", "aa", "anak", "tjokorda", "cokorda", "desak", "gusti", "ngakan", 
    "putu", "wayan", "gede", "gde", "iluh", "luh",
    "made", "kadek", "nengah", "kdk", "md",
    "nyoman", "komang", "nym", "kmg",
    "ketut", "kt"
  ]);

  let firstName = "siswa";
  for (const word of words) {
    if (!balineseTitles.has(word) && word.length > 1) {
      firstName = word.slice(0, 10);
      break;
    }
  }
  
  if (firstName === "siswa" && words.length > 0) {
    firstName = words[0].slice(0, 10);
  }

  const identifier = (nisn || nipd || "").replace(/[^0-9]/g, "");
  let digits = "";
  if (identifier.length >= 4) {
    digits = identifier.slice(-4);
  } else {
    digits = Math.floor(1000 + Math.random() * 9000).toString();
  }

  return `${firstName}${digits}`;
}

async function resolveOrCreateSesVariable(
  supabase: any,
  name: string,
  type: "education" | "occupation",
  sesVariablesCache: Map<string, string>
): Promise<string | null> {
  if (!name) return null;
  const key = `${type}:${name.toLowerCase().trim()}`;
  if (sesVariablesCache.has(key)) return sesVariablesCache.get(key)!;

  const { data: existing } = await supabase
    .from("ses_variables")
    .select("id")
    .eq("type", type)
    .ilike("name", name.trim())
    .maybeSingle();

  if (existing) {
    sesVariablesCache.set(key, existing.id);
    return existing.id;
  }

  const { data: newVar, error } = await supabase
    .from("ses_variables")
    .insert({ type, name: name.trim(), score: 0, needs_review: true, source: "dapodik_auto" })
    .select("id")
    .single();

  if (error || !newVar) {
    console.error(`Failed to create ses_variable [${type}] "${name}":`, error);
    return null;
  }

  sesVariablesCache.set(key, newVar.id);
  return newVar.id;
}

async function resolveSesIds(
  supabase: any,
  row: any,
  sesVariablesCache: Map<string, string>
): Promise<{
  father_education_id: string | null;
  mother_education_id: string | null;
  father_occupation_id: string | null;
  mother_occupation_id: string | null;
  ses_score: number | null; 
  new_ses_names: string[];
}> {
  const newSesNames: string[] = [];

  const f_edu_raw = row.pendidikan_ayah || row.wali_pendidikan || null;
  const m_edu_raw = row.pendidikan_ibu || row.wali_pendidikan || null;
  const f_occ_raw = row.pekerjaan_ayah || row.wali_pekerjaan || null;
  const m_occ_raw = row.pekerjaan_ibu || row.wali_pekerjaan || null;

  const resolve = async (name: string | null, type: "education" | "occupation") => {
    if (!name) return null;
    const id = await resolveOrCreateSesVariable(supabase, name, type, sesVariablesCache);
    if (id && !sesVariablesCache.has(`existing:${id}`)) {
      newSesNames.push(`${type}:${name}`);
    }
    return id;
  };

  const [father_education_id, mother_education_id, father_occupation_id, mother_occupation_id] =
    await Promise.all([
      resolve(f_edu_raw, "education"),
      resolve(m_edu_raw, "education"),
      resolve(f_occ_raw, "occupation"),
      resolve(m_occ_raw, "occupation"),
    ]);

  const ids = [father_education_id, mother_education_id, father_occupation_id, mother_occupation_id].filter(Boolean) as string[];
  let ses_score: number | null = null;

  if (ids.length > 0) {
    const { data: vars } = await supabase
      .from("ses_variables")
      .select("id, score, needs_review")
      .in("id", ids);

    if (vars) {
      const hasUnreviewed = vars.some((v: any) => v.needs_review === true);
      if (!hasUnreviewed) {
        ses_score = vars.reduce((sum: number, v: any) => sum + (v.score || 0), 0);
      }
    }
  }

  return { father_education_id, mother_education_id, father_occupation_id, mother_occupation_id, ses_score, new_ses_names: newSesNames };
}

export async function parseDapodikAction(formData: FormData): Promise<ParseDapodikResponse> {
  try {
    await requireAuth(["super_admin", "school", "community"]);
    const supabase = createServerClient();

    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return { success: false, error: "Tidak terautentikasi." };
    const { data: userData } = await supabase.from("users").select("id, role").eq("id", userId).single();
    if (!userData || !["super_admin", "school", "community"].includes(userData.role)) {
      return { success: false, error: "Akses ditolak." };
    }

    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "File tidak ditemukan." };

    const buffer = await file.arrayBuffer();

    let parseResult: DapodikParseResult;
    try {
      parseResult = parseDapodikFile(buffer);
    } catch (parseErr: any) {
      return { success: false, error: parseErr.message };
    }

    const { data: existingSes } = await supabase
      .from("ses_variables")
      .select("type, name");

    const existingSesSet = new Set(
      (existingSes || []).map((v: any) => `${v.type}:${v.name.toLowerCase().trim()}`)
    );

    const missing_ses_count = [
      ...parseResult.detected_ses_values.pendidikan.map((n) => `education:${n.toLowerCase().trim()}`),
      ...parseResult.detected_ses_values.pekerjaan.map((n) => `occupation:${n.toLowerCase().trim()}`),
    ].filter((k) => !existingSesSet.has(k)).length;

    const { data: cacheRow, error: cacheErr } = await (supabase as any)
      .from("dapodik_parse_cache")
      .insert({
        uploaded_by: userData.id,
        parsed_data: parseResult as any,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select("parse_token")
      .single();

    if (cacheErr || !cacheRow) {
      return { success: false, error: "Gagal menyimpan hasil parsing: " + cacheErr?.message };
    }

    return {
      success: true,
      parse_token: cacheRow.parse_token,
      summary: {
        detected_school_name: parseResult.detected_school_name,
        detected_npsn: parseResult.detected_npsn,
        detected_province: parseResult.detected_province,
        detected_city: parseResult.detected_city,
        detected_district: parseResult.detected_district,
        detected_village: parseResult.detected_village,
        raw_header_text: parseResult.raw_header_text,
        row_count: parseResult.row_count,
        skipped_count: parseResult.skipped_count,
        detected_classes: parseResult.detected_classes,
        missing_ses_count,
        preview_rows: parseResult.preview_rows,
        warning_count: parseResult.warnings.length,
        skipped_rows: parseResult.skipped_rows,
      },
    };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + err.message };
  }
}

export async function importDapodikAction(
  payload: ImportDapodikPayload
): Promise<ImportDapodikResponse> {
  try {
    const { role, schoolId: authSchoolId, communityId: authCommunityId } = await requireAuth(["super_admin", "school", "community"]);
    const targetSchoolId = payload.existing_school_id;
    if (role === "school" && (!targetSchoolId || authSchoolId !== targetSchoolId)) {
      return { success: false, error: "Akses ditolak. Bukan data sekolah Anda." };
    }
    
    const supabase = createServerClient();

    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return { success: false, error: "Tidak terautentikasi." };
    const { data: userData } = await supabase.from("users").select("id, role").eq("id", userId).single();
    if (!userData || !["super_admin", "school", "community"].includes(userData.role)) {
      return { success: false, error: "Akses ditolak. Akses terbatas." };
    }

    if (role === "community") {
      if (payload.school_choice === "existing" && targetSchoolId) {
        const { data: checkSchool } = await supabase.from("schools").select("id").eq("id", targetSchoolId).eq("community_id", authCommunityId || "").maybeSingle();
        if (!checkSchool) return { success: false, error: "Akses ditolak. Sekolah bukan di bawah komunitas Anda." };
      }
    }

    const { data: cacheRow, error: cacheErr } = await (supabase as any)
      .from("dapodik_parse_cache")
      .select("parsed_data, expires_at")
      .eq("parse_token", payload.parse_token)
      .eq("uploaded_by", userData.id)
      .single();

    if (cacheErr || !cacheRow) {
      return { success: false, error: "Token parsing tidak valid atau sudah kedaluwarsa. Silakan upload ulang file." };
    }

    if (new Date((cacheRow as any).expires_at) < new Date()) {
      await (supabase as any).from("dapodik_parse_cache").delete().eq("parse_token", payload.parse_token);
      return { success: false, error: "Sesi parsing sudah kedaluwarsa (>30 menit). Silakan upload ulang." };
    }

    const parseResult: DapodikParseResult = (cacheRow as any).parsed_data as any;

    let schoolId: string;

    if (payload.school_choice === "existing" && payload.existing_school_id) {
      schoolId = payload.existing_school_id;

      await (supabase as any).from("schools").update({
        dapodik_imported_at: new Date().toISOString(),
        raw_dapodik_header: { raw_header_text: parseResult.raw_header_text },
        import_source: "dapodik",
      }).eq("id", schoolId);
    } else {
      // Sekolah independen: community_id = null jika bukan dari role community.
      // Superadmin yang membuat sekolah via Dapodik = sekolah independen (tidak punya induk komunitas).
      let finalCommunityId = null as string | null;
      if (role === "community" && authCommunityId) {
        finalCommunityId = authCommunityId;
      }
      // ↑ Tidak ada lagi pencarian/pembuatan komunitas "SEKOLAH INDEPENDEN".

      const npsn = payload.confirmed_npsn?.trim() || null;
      if (npsn) {
        const { data: existingSchool } = await supabase.from("schools").select("id").eq("npsn", npsn).maybeSingle();
        if (existingSchool) {
          return { success: false, error: `NPSN '${npsn}' sudah terdaftar. Pilih "sekolah yang sudah ada" jika ingin update data.` };
        }
      }

      const schoolName = payload.confirmed_name?.trim() || parseResult.detected_school_name || "Sekolah Dapodik";
      const { data: newSchool, error: schoolErr } = await (supabase as any)
        .from("schools")
        .insert({
          community_id: finalCommunityId,
          name: schoolName,
          npsn,
          province: payload.confirmed_province || null,
          city: payload.confirmed_city || null,
          district: payload.confirmed_district || null,
          village: payload.confirmed_village || null,
          is_active: true,
          import_source: "manual", 
          dapodik_imported_at: new Date().toISOString(),
          raw_dapodik_header: { raw_header_text: parseResult.raw_header_text },
        })
        .select("id")
        .single();

      if (schoolErr || !newSchool) {
        throw new Error("Gagal membuat sekolah: " + schoolErr?.message);
      }
      schoolId = newSchool.id;

      await (supabase as any).from("school_assessment_stages").insert({
        school_id: schoolId,
        community_id: finalCommunityId || null,
        current_stage: "persiapan_akun",
      });

      const username = `sch_${npsn || generateRandomString(5)}`;
      const adminEmail = `${username}@pemantik.local`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: "Password123!",
        email_confirm: true,
        user_metadata: { full_name: `Admin ${schoolName}`, role: "school" },
      });

      if (authError || !authData.user) {
        await supabase.from("schools").delete().eq("id", newSchool.id);
        return { success: false, error: "Gagal membuat akun admin sekolah: " + authError?.message };
      }

      const { error: userErr } = await supabase.from("users").insert({
        id: authData.user.id,
        username,
        full_name: `Admin ${schoolName}`,
        role: "school",
        school_id: newSchool.id,
        is_active: true,
      });

      if (userErr) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from("schools").delete().eq("id", newSchool.id);
        return { success: false, error: "Gagal menyimpan user admin sekolah: " + userErr.message };
      }

      schoolId = newSchool.id;
    }

    // --- Ensure School Admin Account Exists ---
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("school_id", schoolId)
      .eq("role", "school")
      .maybeSingle();

    if (!existingUser) {
      const { data: schoolData } = await supabase.from("schools").select("npsn, name").eq("id", schoolId).single();
      if (schoolData) {
        const username = `sch_${schoolData.npsn || generateRandomString(5)}`;
        const adminEmail = `${username}@pemantik.local`;
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: adminEmail,
          password: "Password123!",
          email_confirm: true,
          user_metadata: { full_name: `Admin ${schoolData.name}`, role: "school" },
        });

        if (!authError && authData.user) {
          await supabase.from("users").insert({
            id: authData.user.id,
            username,
            full_name: `Admin ${schoolData.name}`,
            role: "school",
            school_id: schoolId,
            is_active: true,
          });
        }
      }
    }
    // ------------------------------------------

    const classIdMap = new Map<string, string>(); 

    let academic_year = payload.academic_year?.trim() || "";
    if (!academic_year) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; 
      const startYear = month >= 7 ? year : year - 1;
      academic_year = `${startYear}/${startYear + 1}`;
    }

    for (const rombelName of parseResult.detected_classes) {
      const { data: existingClass } = await supabase
        .from("classes")
        .select("id")
        .eq("school_id", schoolId)
        .ilike("name", rombelName)
        .maybeSingle();

      if (existingClass) {
        classIdMap.set(rombelName.toLowerCase(), existingClass.id);
      } else {
        const gradeMatch = rombelName.match(/\d+/);
        let grade = 1;
        if (gradeMatch) {
          const parsed = parseInt(gradeMatch[0], 10);
          if (parsed >= 1 && parsed <= 9) grade = parsed;
          else if (parsed > 9) grade = 9;
        }
        const { data: newClass } = await supabase
          .from("classes")
          .insert({ school_id: schoolId, name: rombelName, grade, academic_year, is_active: true })
          .select("id")
          .single();
        if (newClass) classIdMap.set(rombelName.toLowerCase(), newClass.id);
      }
    }

    const { data: batchRow, error: batchErr } = await (supabase as any)
      .from("dapodik_import_batches")
      .insert({
        school_id: schoolId,
        uploaded_by: userData.id,
        file_name: `dapodik_import_${new Date().toISOString()}`,
        total_rows: parseResult.rows.length,
        status: "queued",
      })
      .select("id")
      .single();

    if (batchErr || !batchRow) {
      return { success: false, error: "Gagal membuat batch record: " + batchErr?.message };
    }

    const batchId = batchRow.id;

    void (async () => {
      const errors: any[] = [];
      const warnings: any[] = [...parseResult.skipped_rows.map(s => ({ ...s, type: "skipped" }))];
      const newSesVariables: any[] = [];
      let successCount = 0;

      await (supabase as any).from("dapodik_import_batches").update({ status: "processing" }).eq("id", batchId);

      const sesVariablesCache = new Map<string, string>();

      const { data: existingSes } = await supabase.from("ses_variables").select("id, type, name");
      (existingSes || []).forEach((v: any) => {
        const key = `${v.type}:${v.name.toLowerCase().trim()}`;
        sesVariablesCache.set(key, v.id);
        sesVariablesCache.set(`existing:${v.id}`, "true");
      });

      const rows = parseResult.rows;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        try {
          const classId = row.rombel
            ? (classIdMap.get(row.rombel.toLowerCase()) ?? null)
            : null;

          if (!classId && row.rombel) {
            warnings.push({
              row_number: rowNum,
              full_name: row.full_name,
              field: "rombel",
              message: `Rombel "${row.rombel}" tidak bisa dibuat/ditemukan — siswa diimport tanpa kelas.`,
            });
          }

          const sesData = await resolveSesIds(supabase, row, sesVariablesCache);
          if (sesData.new_ses_names.length > 0) {
            newSesVariables.push(...sesData.new_ses_names);
          }

          const { data: thresholds } = await supabase.from("ses_thresholds").select("*");
          let ses_class: string | null = null;
          if (sesData.ses_score !== null && thresholds && thresholds.length > 0) {
            const sorted = [...thresholds].sort((a: any, b: any) => a.min_score - b.min_score);
            const matched = sorted.find((t: any) => sesData.ses_score! >= t.min_score && sesData.ses_score! <= t.max_score);
            if (matched) ses_class = matched.name;
          }

          let existingStudentId: string | null = null;

          if (row.nisn) {
            const { data: existing } = await (supabase as any)
              .from("students")
              .select("id")
              .eq("nisn", row.nisn)
              .eq("school_id", schoolId)
              .maybeSingle();
            if (existing) existingStudentId = existing.id;
          }

          if (!existingStudentId && row.nipd) {
            const { data: existing } = await (supabase as any)
              .from("students")
              .select("id")
              .eq("nipd", row.nipd)
              .eq("school_id", schoolId)
              .maybeSingle();
            if (existing) existingStudentId = existing.id;
          }

          const studentPayload: any = {
            school_id: schoolId,
            class_id: classId,
            nisn: row.nisn,
            nipd: row.nipd,
            nik: row.nik,
            full_name: row.full_name,
            gender: row.gender,
            birth_date: row.birth_date,
            birth_date_parse_error: row.birth_date_parse_error,
            agama: row.agama,
            village: row.kelurahan,
            district: row.kecamatan,
            wali_nama: row.wali_nama,
            wali_nik: row.wali_nik,
            wali_pendidikan: row.wali_pendidikan,
            wali_pekerjaan: row.wali_pekerjaan,
            father_education_id: sesData.father_education_id,
            mother_education_id: sesData.mother_education_id,
            father_occupation_id: sesData.father_occupation_id,
            mother_occupation_id: sesData.mother_occupation_id,
            ses_score: sesData.ses_score,
            ses_class,
            import_source: "dapodik",
            raw_dapodik: row.raw_dapodik as any,
            is_active: true,
          };

          if (existingStudentId) {
            const { error: updateErr } = await supabase
              .from("students")
              .update(studentPayload)
              .eq("id", existingStudentId);
            if (updateErr) throw new Error(updateErr.message);
          } else {
            const pin_hash = bcrypt.hashSync("123456", 10);
            const schoolNpsn = payload.confirmed_npsn || payload.existing_school_id?.slice(-4) || null;
            const username = generateStudentUsername(row.full_name, schoolNpsn, row.nisn, row.nipd);
            const { error: insertErr } = await supabase.from("students").insert({
              ...studentPayload,
              username,
              pin_hash,
            });
            if (insertErr) throw new Error(insertErr.message);
          }

          successCount++;
        } catch (rowErr: any) {
          errors.push({
            row_number: rowNum,
            full_name: row.full_name,
            message: rowErr.message || "Unknown error",
          });
        }
      }

      const finalStatus =
        errors.length === 0
          ? "completed"
          : successCount === 0
          ? "failed"
          : "completed_with_errors";

      const uniqueNewSes = [...new Set(newSesVariables)].map((s) => {
        const [type, name] = s.split(":");
        return { type, name };
      });

      await (supabase as any).from("dapodik_import_batches").update({
        status: finalStatus,
        success_count: successCount,
        fail_count: errors.length,
        errors: errors.length > 0 ? errors : null,
        warnings: warnings.length > 0 ? warnings : null,
        new_ses_variables: uniqueNewSes.length > 0 ? uniqueNewSes : null,
        completed_at: new Date().toISOString(),
      }).eq("id", batchId);

      if (uniqueNewSes.length > 0) {
        const { data: superAdmins } = await supabase
          .from("users")
          .select("id")
          .eq("role", "super_admin")
          .eq("is_active", true);

        if (superAdmins && superAdmins.length > 0) {
          const notifications = superAdmins.map((sa: any) => ({
            user_id: sa.id,
            title: "Indikator SES Baru Perlu Direview",
            message: `Import Dapodik menambahkan ${uniqueNewSes.length} indikator SES baru (skor belum ditentukan). Silakan atur bobotnya di Pengaturan SES agar skor siswa bisa dihitung.`,
            type: "warning",
          }));
          (supabase as any).from("notifications").insert(notifications)
            .then(() => {}).catch(() => {}); 
        }
      }

      await (supabase as any).from("dapodik_parse_cache").delete().eq("parse_token", payload.parse_token);

      revalidatePath("/super-admin/sekolah");
      revalidatePath("/super-admin/siswa");
    })();

    return { success: true, batch_id: batchId };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + err.message };
  }
}