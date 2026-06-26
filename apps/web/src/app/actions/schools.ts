"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";

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

    let finalCommunityId = community_id as string;
    if (!finalCommunityId) {
      let { data: indepComm } = await supabase.from("communities").select("id").eq("name", "SEKOLAH INDEPENDEN").maybeSingle();
      if (!indepComm) {
        const { data: newComm, error: commErr } = await supabase.from("communities").insert({
          name: "SEKOLAH INDEPENDEN",
          code: "IND",
          is_active: true
        }).select("id").single();
        if (commErr) return { success: false, error: "Gagal membuat komunitas independen otomatis: " + commErr.message };
        indepComm = newComm;
      }
      finalCommunityId = indepComm.id;
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

    const { data: newSchool, error } = await supabase.from("schools").insert({
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
      is_active
    }).select().single();

    if (error || !newSchool) {
      return { success: false, error: "Gagal membuat sekolah: " + error?.message };
    }

    // Process classes if provided
    if (classesStr) {
      const classesToInsert = processClassesString(classesStr, newSchool.id);
      if (classesToInsert.length > 0) {
        const { error: classesErr } = await supabase.from("classes").insert(classesToInsert);
        if (classesErr) console.error("Failed to insert classes:", classesErr);
      }
    }

    // CREATE SCHOOL ADMIN ACCOUNT
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

    let finalCommunityId = community_id as string;
    if (!finalCommunityId) {
      let { data: indepComm } = await supabase.from("communities").select("id").eq("name", "SEKOLAH INDEPENDEN").maybeSingle();
      if (!indepComm) {
        const { data: newComm, error: commErr } = await supabase.from("communities").insert({
          name: "SEKOLAH INDEPENDEN",
          code: "IND",
          is_active: true
        }).select("id").single();
        if (commErr) return { success: false, error: "Gagal membuat komunitas independen otomatis: " + commErr.message };
        indepComm = newComm;
      }
      finalCommunityId = indepComm.id;
    }

    // Check NPSN uniqueness if changed
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

    const { error } = await supabase
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
    const supabase = createServerClient();
    
    // Auth user will be deleted by ON DELETE CASCADE from public.users
    // Wait, users reference schools, so deleting school sets school_id = null.
    // Wait! In users table: `school_id UUID REFERENCES schools(id) ON DELETE SET NULL`.
    // So we should delete the user from auth.users first if we want to delete their account.
    
    const { data: usersData } = await supabase
      .from("users")
      .select("id")
      .eq("school_id", id);

    // Delete users from auth.admin
    if (usersData && usersData.length > 0) {
      for (const u of usersData) {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }

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
    if (!dataArray || dataArray.length === 0) {
      return { success: false, error: "Data kosong." };
    }

    const supabase = createServerClient();

    // Fetch all communities for case-insensitive matching
    const { data: commsData } = await supabase.from("communities").select("id, name");
    const commsMap = new Map((commsData || []).map((c: any) => [c.name.toLowerCase().trim(), c.id]));

    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const row = dataArray[i];
      const commName = row.nama_komunitas || row.Nama_Komunitas || row.Community_ID || row.community_id;
      const name = row.Nama_Sekolah || row.name || row.nama_sekolah;
      const province = row.Provinsi || row.province;
      const city = row.Kota || row.city;
      const district = row.Kecamatan || row.district;
      const village = row.Desa || row.Kelurahan || row.village;
      const classesStr = row.Daftar_Kelas || row.daftar_kelas || row.classes;

      if (!commName || !name || !province || !city || !district || !village || !classesStr) {
        errors.push(`Baris ${i + 2} gagal: Kolom 'Nama_Komunitas', 'Nama_Sekolah', 'Provinsi', 'Kota', 'Kecamatan', 'Desa', dan 'Daftar_Kelas' wajib diisi.`);
        continue;
      }

      // Resolve community_id — prioritize direct UUID if already provided
      let community_id: string | undefined;
      const directCommunityId = row.community_id;
      const isUUID = directCommunityId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(directCommunityId));

      if (isUUID) {
        // Already have the UUID (e.g., pre-filled by Komunitas import context)
        community_id = directCommunityId;
      } else {
        // Fallback: match by community name (e.g., Super Admin bulk import)
        const commName = row.nama_komunitas || row.Nama_Komunitas || row.Community_ID || row.community_id;
        if (commName) {
          community_id = commsMap.get(String(commName).toLowerCase().trim());
          // Also try raw UUID matching as last resort
          if (!community_id && String(commName).length === 36) {
            const exactMatch = (commsData || []).find((c: any) => c.id === commName);
            if (exactMatch) community_id = exactMatch.id;
          }
        }
      }

      if (!community_id) {
        const commName = row.nama_komunitas || row.Nama_Komunitas || directCommunityId || "(tidak ada)";
        errors.push(`Baris ${i + 2} gagal: Komunitas "${commName}" tidak ditemukan di database.`);
        continue;
      }

      const npsn = row.NPSN || row.npsn ? String(row.NPSN || row.npsn).trim() : null;

      // 1. Insert School
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
        is_active: true
      }).select().single();

      if (schoolErr || !newSchool) {
        errors.push(`Baris ${i + 2} gagal: ${schoolErr?.message || "Unknown error"}`);
        continue;
      }

      // 2. Create User Auth
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

      // 3. Create Public User
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

      // 4. Process classes if provided
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
    const supabase = createServerClient();
    
    // Find the admin user for this school
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
