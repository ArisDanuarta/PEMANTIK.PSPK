"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAuth } from "./auth";
import { parseFlexibleDate, normalizeIdentityNumber, normalizeSearchString, normalizeText, normalizeEducation, normalizeOccupation } from "@/lib/normalizationUtils";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

function generatePin(): string {
  // Gunakan PIN default 123456 agar mudah didistribusikan ke anak SD
  return "123456";
}

function generateUsername(fullName: string, nisnOrNpsn?: string | null): string {
  const words = fullName.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, "").toLowerCase()).filter(w => w.length > 0);
  const balineseTitles = new Set([
    "i", "ni", "ida", "aa", "anak", "agung", "tjokorda", "cokorda", 
    "dewa", "desak", "gusti", "ngakan", "bagus", "ayu", 
    "putu", "wayan", "gede", "gde", "iluh", "luh",
    "made", "kadek", "nengah", "kdk", "md",
    "nyoman", "komang", "nym", "kmg",
    "ketut", "kt"
  ]);

  let validNames = words.filter(word => !balineseTitles.has(word) && word.length > 1);
  if (validNames.length === 0) validNames = words;
  
  let randomNamePart = "siswa";
  if (validNames.length > 0) {
    randomNamePart = validNames[Math.floor(Math.random() * validNames.length)].slice(0, 10);
  }

  const identifier = (nisnOrNpsn || "").replace(/[^0-9]/g, "");
  let digits = "";
  if (identifier.length >= 3) {
    digits = identifier.slice(-3);
  } else {
    digits = Math.floor(100 + Math.random() * 900).toString();
  }

  return `${randomNamePart}${digits}`;
}

// FUNGSI BARU: Konversi cerdas gender untuk memastikan format L/P untuk database
function normalizeGenderToEnum(val: any): "L" | "P" {
  if (!val) return "P"; // fallback default
  const s = String(val).toLowerCase().trim();
  if (s === "l" || s.includes("laki") || s === "pria") return "L";
  return "P";
}

export async function createStudentAction(
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { role, schoolId: authSchoolId } = await requireAuth(["super_admin", "school", "community"]);
    const school_id = (formData.get("school_id") as string)?.trim();
    if (role === "school" && authSchoolId !== school_id) {
      return { success: false, error: "Akses ditolak. Bukan data sekolah Anda." };
    }
    const class_id = (formData.get("class_id") as string)?.trim() || null;
    const full_name = (formData.get("full_name") as string)?.trim();
    
    // Terapkan normalisasi gender di sini
    const rawGender = (formData.get("gender") as string)?.trim();
    const gender = normalizeGenderToEnum(rawGender);
    
    const nisn = (formData.get("nisn") as string)?.trim() || null;
    const npsn = (formData.get("npsn") as string)?.trim() || null;
    const ses_class = (formData.get("ses_class") as string)?.trim() || null;
    
    // birth_date is now mandatory
    const birth_date = (formData.get("birth_date") as string)?.trim() || null;
    
    const village = (formData.get("village") as string)?.trim() || null;
    const district = (formData.get("district") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const province = (formData.get("province") as string)?.trim() || null;
    
    const father_education_id = (formData.get("father_education_id") as string)?.trim() || null;
    const mother_education_id = (formData.get("mother_education_id") as string)?.trim() || null;
    const father_occupation_id = (formData.get("father_occupation_id") as string)?.trim() || null;
    const mother_occupation_id = (formData.get("mother_occupation_id") as string)?.trim() || null;

    if (!school_id || !class_id || !full_name || !rawGender || !birth_date || !father_education_id || !mother_education_id || !father_occupation_id || !mother_occupation_id || !village || !district || !city || !province) {
      return { success: false, error: "Semua kolom wajib (*) harus diisi." };
    }

    const supabase = createServerClient();

    // Calculate SES
    let computedSesClass = null;
    if (father_education_id || mother_education_id || father_occupation_id || mother_occupation_id) {
      const [ { data: variables }, { data: thresholds } ] = await Promise.all([
        (supabase as any).from("ses_variables").select("*"),
        (supabase as any).from("ses_thresholds").select("*").limit(1).single()
      ]);

      if (variables && thresholds) {
        let score = 0;
        const addScore = (id: string, type: string) => {
          if (!id) return;
          const v = variables.find((x: any) => x.id === id && x.type === type);
          if (v) score += v.score;
        };

        addScore(father_education_id!, "education");
        addScore(mother_education_id!, "education");
        addScore(father_occupation_id!, "occupation");
        addScore(mother_occupation_id!, "occupation");

        if (score <= thresholds.low_max) {
          computedSesClass = "bawah";
        } else if (score <= thresholds.middle_max) {
          computedSesClass = "menengah";
        } else {
          computedSesClass = "atas";
        }
      }
    }

    // Create credentials
    const pin = generatePin();
    const pin_hash = bcrypt.hashSync(pin, 10);
    const username = generateUsername(full_name, nisn);

    const { error } = await supabase.from("students").insert({
      school_id,
      class_id,
      nisn,
      full_name,
      gender: gender as any, // Sudah pasti "L" atau "P"
      birth_date,
      ses_class: computedSesClass as any,
      village,
      district,
      city,
      province,
      father_education_id,
      mother_education_id,
      father_occupation_id,
      mother_occupation_id,
      pin_hash,
      username,
      is_active: true
    } as any);

    if (error) {
      return { success: false, error: "Gagal membuat data anak: " + error.message };
    }

    revalidatePath("/super-admin/siswa");
    revalidatePath("/komunitas/siswa");
    return { 
      success: true, 
      message: `Anak ditambahkan. Username: ${username} | PIN: ${pin}` 
    };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan: " + (err.message || String(err)) };
  }
}

export async function bulkCreateStudentsAction(
  dataArray: any[]
): Promise<ActionResponse> {
  try {
    const { role, schoolId: authSchoolId, communityId: authCommunityId } = await requireAuth(["super_admin", "school", "community"]);
    if (!dataArray || dataArray.length === 0) {
      return { success: false, error: "Data kosong." };
    }

    const supabase = createServerClient();
    
    // Fetch schools for lookup
    let schoolQuery = supabase.from("schools").select("id, name, community_id");
    if (role === "community" && authCommunityId) {
      schoolQuery = schoolQuery.eq("community_id", authCommunityId);
    }
    if (role === "school" && authSchoolId) {
      schoolQuery = schoolQuery.eq("id", authSchoolId);
    }
    const { data: schoolsData } = await schoolQuery;
    const schoolsMap = new Map((schoolsData || []).map((s: any) => [normalizeSearchString(s.name), s.id]));

    // Fetch all classes in one query
    const schoolIds = (schoolsData || []).map((s: any) => s.id);
    const { data: allClassesData } = await supabase.from("classes").select("id, name, school_id").in("school_id", schoolIds.length > 0 ? schoolIds : ["_none_"]);
    const classesData = allClassesData || [];

    const [ { data: variables }, { data: thresholds } ] = await Promise.all([
      (supabase as any).from("ses_variables").select("*"),
      (supabase as any).from("ses_thresholds").select("*").limit(1).single()
    ]);
    
    const rowsToInsert: any[] = [];

    for (let i = 0; i < dataArray.length; i++) {
      const row = dataArray[i];
      
      // Baca semua kolom (key sudah lowercase setelah normalisasi BulkUploadModal)
      const full_name = normalizeText(row.nama_siswa);
      const rawGender = String(row.jenis_kelamin || "").trim();
      const schoolName = normalizeSearchString(row.nama_sekolah);
      const className = normalizeSearchString(row.kelas);
      const village = normalizeText(row.kelurahan_desa);
      const district = normalizeText(row.kecamatan);
      const city = normalizeText(row.kabupaten);
      const province = normalizeText(row.provinsi);
      const father_edu_text = normalizeEducation(row.pendidikan_ayah);
      const mother_edu_text = normalizeEducation(row.pendidikan_ibu);
      const father_job_text = normalizeOccupation(row.pekerjaan_ayah);
      const mother_job_text = normalizeOccupation(row.pekerjaan_ibu);
      let birth_date = row.tanggal_lahir || null;
      
      // NISN & NPSN bersifat opsional
      const nisn = normalizeIdentityNumber(row.nisn) || null;
      const npsn = normalizeIdentityNumber(row.npsn) || null;
      
      // Validasi kolom wajib
      const missingColumns = [];
      if (!full_name) missingColumns.push("nama_siswa");
      if (!rawGender) missingColumns.push("jenis_kelamin");
      if (!birth_date) missingColumns.push("tanggal_lahir");
      if (!schoolName) missingColumns.push("nama_sekolah");
      if (!className) missingColumns.push("kelas");
      if (!father_edu_text) missingColumns.push("pendidikan_ayah");
      if (!mother_edu_text) missingColumns.push("pendidikan_ibu");
      if (!father_job_text) missingColumns.push("pekerjaan_ayah");
      if (!mother_job_text) missingColumns.push("pekerjaan_ibu");
      if (!village) missingColumns.push("kelurahan_desa");
      if (!district) missingColumns.push("kecamatan");
      if (!city) missingColumns.push("kabupaten");
      if (!province) missingColumns.push("provinsi");

      if (missingColumns.length > 0) {
        return { success: false, error: `Baris ${i + 2} gagal: Kolom berikut kosong atau tidak dikenali: ${missingColumns.join(", ")}.` };
      }

      // Normalisasi gender
      const gender = normalizeGenderToEnum(rawGender);

      // Cari sekolah
      const school_id = schoolsMap.get(schoolName);
      if (!school_id) {
         return { success: false, error: `Baris ${i + 2} gagal: Sekolah "${row.nama_sekolah}" tidak ditemukan di sistem.` };
      }

      // Cari kelas (dari data yang sudah di-fetch sebelumnya)
      const matchedClass = classesData.find((c: any) => c.school_id === school_id && normalizeSearchString(c.name) === className);
      if (!matchedClass) {
        return { success: false, error: `Baris ${i + 2} gagal: Kelas "${row.kelas}" tidak ditemukan pada sekolah "${row.nama_sekolah}".` };
      }
      const class_id = matchedClass.id;

      // Parse tanggal
      const parsedDate = parseFlexibleDate(birth_date);
      if (!parsedDate) {
        return { success: false, error: `Baris ${i + 2} gagal: Format tanggal lahir '${birth_date}' tidak dikenali. Gunakan format DD-MM-YYYY atau YYYY-MM-DD.` };
      }
      birth_date = parsedDate;

      // Kalkulasi SES
      let computedSesClass = null;
      let father_education_id = null;
      let mother_education_id = null;
      let father_occupation_id = null;
      let mother_occupation_id = null;

      if (variables && thresholds) {
        let score = 0;
        const mapVariable = (name: string | null, type: string) => {
          if (!name) return null;
          const matchName = String(name).trim().toLowerCase();
          const v = variables.find((x: any) => normalizeSearchString(x.name) === matchName && x.type === type);
          if (v) { score += v.score; return v.id; }
          return null;
        };

        father_education_id = mapVariable(father_edu_text, "education");
        mother_education_id = mapVariable(mother_edu_text, "education");
        father_occupation_id = mapVariable(father_job_text, "occupation");
        mother_occupation_id = mapVariable(mother_job_text, "occupation");

        if (score <= thresholds.low_max) computedSesClass = "bawah";
        else if (score <= thresholds.middle_max) computedSesClass = "menengah";
        else computedSesClass = "atas";
      }

      // Generate credentials
      const pin = generatePin();
      const pin_hash = bcrypt.hashSync(pin, 10);
      const identifier = nisn || npsn || null;
      const username = generateUsername(full_name as string, identifier);
      
      rowsToInsert.push({
        school_id,
        class_id,
        nisn,
        full_name,
        gender: gender as any,
        birth_date,
        ses_class: computedSesClass as any,
        village,
        district,
        city,
        province,
        father_education_id,
        mother_education_id,
        father_occupation_id,
        mother_occupation_id,
        pin_hash,
        username,
        is_active: true
      });
    }

    const { error } = await supabase.from("students").insert(rowsToInsert as any[]);

    if (error) {
      return { success: false, error: "Gagal memproses bulk insert: " + error.message };
    }

    revalidatePath("/super-admin/siswa");
    revalidatePath("/komunitas/siswa");
    revalidatePath("/sekolah/siswa");
    return { 
      success: true, 
      message: `Berhasil mengimpor ${rowsToInsert.length} siswa.` 
    };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + err.message };
  }
}

export async function updateStudentAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const { role, schoolId: authSchoolId } = await requireAuth(["super_admin", "school", "community"]);
    const school_id = (formData.get("school_id") as string)?.trim();
    
    if (role === "school" && authSchoolId !== school_id) {
      return { success: false, error: "Akses ditolak. Bukan data sekolah Anda." };
    }

    const class_id = (formData.get("class_id") as string)?.trim() || null;
    const full_name = (formData.get("full_name") as string)?.trim();
    
    // Terapkan normalisasi gender
    const rawGender = (formData.get("gender") as string)?.trim();
    const gender = normalizeGenderToEnum(rawGender);
    
    const nisn = (formData.get("nisn") as string)?.trim() || null;
    const birth_date = (formData.get("birth_date") as string)?.trim() || null;
    
    const village = (formData.get("village") as string)?.trim() || null;
    const district = (formData.get("district") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const province = (formData.get("province") as string)?.trim() || null;
    
    const father_education_id = (formData.get("father_education_id") as string)?.trim() || null;
    const mother_education_id = (formData.get("mother_education_id") as string)?.trim() || null;
    const father_occupation_id = (formData.get("father_occupation_id") as string)?.trim() || null;
    const mother_occupation_id = (formData.get("mother_occupation_id") as string)?.trim() || null;

    if (!school_id || !class_id || !full_name || !rawGender || !birth_date || !father_education_id || !mother_education_id || !father_occupation_id || !mother_occupation_id || !village || !district || !city || !province) {
      return { success: false, error: "Semua kolom wajib (*) harus diisi." };
    }

    const supabase = createServerClient();

    let computedSesClass = null;
    if (father_education_id || mother_education_id || father_occupation_id || mother_occupation_id) {
      const [ { data: variables }, { data: thresholds } ] = await Promise.all([
        (supabase as any).from("ses_variables").select("*"),
        (supabase as any).from("ses_thresholds").select("*").limit(1).single()
      ]);

      if (variables && thresholds) {
        let score = 0;
        const addScore = (id: string, type: string) => {
          if (!id) return;
          const v = variables.find((x: any) => x.id === id && x.type === type);
          if (v) score += v.score;
        };

        addScore(father_education_id!, "education");
        addScore(mother_education_id!, "education");
        addScore(father_occupation_id!, "occupation");
        addScore(mother_occupation_id!, "occupation");

        if (score <= thresholds.low_max) {
          computedSesClass = "bawah";
        } else if (score <= thresholds.middle_max) {
          computedSesClass = "menengah";
        } else {
          computedSesClass = "atas";
        }
      }
    }

    const { error } = await supabase.from("students").update({
      school_id,
      class_id,
      nisn,
      full_name,
      gender: gender as any, // Terjamin masuk sebagai L atau P
      birth_date,
      ses_class: computedSesClass as any,
      village,
      district,
      city,
      province,
      father_education_id,
      mother_education_id,
      father_occupation_id,
      mother_occupation_id
    } as any).eq("id", id);

    if (error) {
      return { success: false, error: "Gagal memperbarui data anak: " + error.message };
    }

    revalidatePath("/super-admin/siswa");
    revalidatePath("/komunitas/siswa");
    return { success: true, message: "Data anak berhasil diperbarui." };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan: " + (err.message || String(err)) };
  }
}

export async function deleteStudentAction(id: string): Promise<ActionResponse> {
  try {
    await requireAuth(["super_admin", "school", "community"]);
    const supabase = createServerClient();
    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      return { success: false, error: "Gagal menghapus data anak: " + error.message };
    }

    revalidatePath("/super-admin/siswa");
    revalidatePath("/komunitas/siswa");
    return { success: true, message: "Data anak berhasil dihapus." };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan: " + err.message };
  }
}

export async function resetStudentPasswordAction(studentId: string): Promise<ActionResponse> {
  try {
    await requireAuth(["super_admin", "school", "community"]);
    const supabase = createServerClient();
    
    const pin = generatePin();
    const pin_hash = bcrypt.hashSync(pin, 10);

    const { error } = await supabase.from("students").update({
      pin_hash: pin_hash
    }).eq("id", studentId);

    if (error) {
      return { success: false, error: "Gagal mereset PIN: " + error.message };
    }

    revalidatePath("/super-admin/siswa");
    revalidatePath("/komunitas/siswa");
    return { success: true, message: `PIN berhasil di-reset menjadi ${pin}` };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + (err.message || String(err)) };
  }
}