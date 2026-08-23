"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import { requireAuth } from "./auth";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  insertedIds?: string[];
}

export async function createCommunityAction(
  formData: FormData
): Promise<ActionResponse> {
  try {
  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toLowerCase();
  const status_kepemilikan = (formData.get("status_kepemilikan") as string)?.trim() || null;
  const village = (formData.get("village") as string)?.trim() || null;
  const district = (formData.get("district") as string)?.trim() || null;
  const regency = (formData.get("regency") as string)?.trim() || null;
  const province = (formData.get("province") as string)?.trim() || null;
  
  const contactName = (formData.get("contact_name") as string)?.trim() || null;
  const contactPhone = (formData.get("contact_phone") as string)?.trim() || null;
  const contactEmail = (formData.get("contact_email") as string)?.trim() || null;
  const isActive = formData.get("is_active") === "true";
  const isSandbox = formData.get("is_sandbox") === "true";

  if (!name || !code) {
    return { success: false, error: "Nama dan Kode Komunitas wajib diisi." };
  }

  // Verify code matches system guideline (alphanumeric, lowercase, underscores)
  if (!/^[a-z0-9_]+$/.test(code)) {
    return {
      success: false,
      error: "Kode Komunitas hanya boleh berupa huruf kecil, angka, dan underscore (_).",
    };
  }

  const supabase = createServerClient();

  // Check if code already exists
  const { data: existing } = await supabase
    .from("communities")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (existing) {
    return { success: false, error: `Kode komunitas '${code}' sudah digunakan.` };
  }
  
  const address = village && district && regency && province ? `${village}, ${district}, ${regency}, ${province}` : null;

  const { data: newComm, error } = await supabase.from("communities").insert({
    name,
    code,
    address,
    status_kepemilikan,
    village,
    district,
    city: regency,
    province,
    contact_name: contactName,
    contact_phone: contactPhone,
    contact_email: contactEmail,
    is_active: isActive,
    is_sandbox: isSandbox,
    allowed_categories: null,
  } as any).select().single();

  if (error || !newComm) {
    console.error("Failed to create community:", error);
    return { success: false, error: "Gagal membuat komunitas: " + error?.message };
  }

  // BUAT AKUN ADMIN KOMUNITAS SECARA OTOMATIS
  const defaultPassword = "Password123!";
  const namePart = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10);
  const randomDigits = Math.floor(100 + Math.random() * 900).toString();
  const username = `${namePart}${randomDigits}`;
  const adminEmail = contactEmail || `${username}@pemantik.local`;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: {
      full_name: `Admin ${name}`,
      role: 'community',
    }
  });

  if (authError || !authData.user) {
    console.error("Failed to create community admin auth user:", authError);
    // Rollback komunitas jika pembuatan user gagal
    await supabase.from("communities").delete().eq("id", newComm.id);
    return { success: false, error: "Gagal membuat akun login komunitas: " + (authError?.message || "Unknown error") };
  }

  const { error: userError } = await supabase.from("users").insert({
    id: authData.user.id,
    username: username,
    full_name: `Admin ${name}`,
    role: "community",
    community_id: newComm.id,
    is_active: true,
  });

  if (userError) {
    console.error("Failed to insert into public.users:", userError);
    await supabase.auth.admin.deleteUser(authData.user.id);
    await supabase.from("communities").delete().eq("id", newComm.id);
    return { success: false, error: "Gagal menyimpan data pengguna komunitas: " + userError.message };
  }

    revalidatePath("/super-admin/komunitas");
    revalidatePath("/super-admin/dashboard");
    return { 
      success: true, 
      message: `Komunitas berhasil dibuat. Akun Admin: ${adminEmail} | Pass: ${defaultPassword}` 
    };
  } catch (err: any) {
    console.error("Exception in createCommunityAction:", err);
    return { success: false, error: "Terjadi kesalahan sistem: " + (err.message || String(err)) };
  }
}

export async function updateCommunityAction(
  id: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const name = (formData.get("name") as string)?.trim();
    const status_kepemilikan = (formData.get("status_kepemilikan") as string)?.trim() || null;
    const village = (formData.get("village") as string)?.trim() || null;
    const district = (formData.get("district") as string)?.trim() || null;
    const regency = (formData.get("regency") as string)?.trim() || null;
    const province = (formData.get("province") as string)?.trim() || null;
    
    const contactName = (formData.get("contact_name") as string)?.trim() || null;
    const contactPhone = (formData.get("contact_phone") as string)?.trim() || null;
    const contactEmail = (formData.get("contact_email") as string)?.trim() || null;
    const isActive = formData.get("is_active") === "true";
    const isSandbox = formData.get("is_sandbox") === "true";

    if (!name) {
      return { success: false, error: "Nama Komunitas wajib diisi." };
    }
    
    const address = village && district && regency && province ? `${village}, ${district}, ${regency}, ${province}` : null;

    const supabase = createServerClient();

    const { error } = await (supabase as any)
      .from("communities")
      .update({
        name,
        address,
        status_kepemilikan,
        village,
        district,
        city: regency,
        province,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        is_active: isActive,
        is_sandbox: isSandbox,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Failed to update community:", error);
      return { success: false, error: "Gagal memperbarui komunitas: " + error.message };
    }

    revalidatePath("/super-admin/komunitas");
    revalidatePath("/super-admin/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Exception in updateCommunityAction:", err);
    return { success: false, error: "Terjadi kesalahan sistem: " + (err.message || String(err)) };
  }
}

export async function toggleCommunityActiveAction(
  id: string,
  currentStatus: boolean
): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();

  const { error } = await supabase
    .from("communities")
    .update({
      is_active: !currentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to toggle community status:", error);
    return { success: false, error: "Gagal mengubah status: " + error.message };
  }

    revalidatePath("/super-admin/komunitas");
    revalidatePath("/super-admin/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Exception in toggleCommunityActiveAction:", err);
    return { success: false, error: "Terjadi kesalahan sistem: " + (err.message || String(err)) };
  }
}

export async function resetCommunityPasswordAction(communityId: string): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();
    
    // Find the admin user for this community
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("community_id", communityId)
      .eq("role", "community")
      .maybeSingle();

    if (userError || !user) {
      return { success: false, error: "Akun admin komunitas tidak ditemukan." };
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
      password: "Password123!"
    });
    
    if (authError) {
      return { success: false, error: "Gagal mereset password: " + authError.message };
    }

    revalidatePath("/super-admin/komunitas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "Terjadi kesalahan sistem: " + (err.message || String(err)) };
  }
}

export async function bulkCreateCommunitiesAction(
  dataArray: any[]
): Promise<ActionResponse> {
  try {
    const { role } = await requireAuth(["super_admin"]);
    if (!dataArray || dataArray.length === 0) {
      return { success: false, error: "Data kosong." };
    }

    const supabase = createServerClient();
    let failCount = 0;
    const errors: string[] = [];
    const insertedIds: string[] = [];
    let successCount = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const row = dataArray[i];
      // Key sudah lowercase setelah normalisasi BulkUploadModal
      const name = String(row.nama_komunitas || "").trim();
      const contactEmail = String(row.email_komunitas || "").trim() || null;
      const status_kepemilikan = String(row.status_kepemilikan || "").trim() || null;
      const contactName = String(row.nama_penanggung_jawab || "").trim() || null;
      const contactPhone = String(row.nomor_telepon || "").trim() || null;
      const village = String(row.kelurahan_desa || "").trim();
      const district = String(row.kecamatan || "").trim();
      const regency = String(row.kabupaten || "").trim();
      const province = String(row.provinsi || "").trim();

      const missingCols: string[] = [];
      if (!name) missingCols.push("nama_komunitas");
      if (!status_kepemilikan) missingCols.push("status_kepemilikan");
      if (!village) missingCols.push("kelurahan_desa");
      if (!district) missingCols.push("kecamatan");
      if (!regency) missingCols.push("kabupaten");
      if (!province) missingCols.push("provinsi");

      if (missingCols.length > 0) {
        failCount++;
        errors.push(`Baris ${i + 2} gagal: Kolom berikut kosong: ${missingCols.join(", ")}.`);
        continue;
      }

      const code = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 8) + Math.floor(100 + Math.random() * 900).toString();
      const address = `${village}, ${district}, ${regency}, ${province}`;

      const { data: newComm, error } = await supabase.from("communities").insert({
        name,
        code,
        address,
        status_kepemilikan,
        village,
        district,
        city: regency,
        province,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        is_active: true,
        allowed_categories: null,
      } as any).select().single();

      if (error || !newComm) {
        failCount++;
        errors.push(`Baris ${i + 2} gagal: ${error?.message}`);
        continue;
      }

      const defaultPassword = "Password123!";
      const namePart = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10);
      const randomDigits = Math.floor(100 + Math.random() * 900).toString();
      const username = `${namePart}${randomDigits}`;
      const adminEmail = contactEmail || `${username}@pemantik.local`;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          full_name: `Admin ${name}`,
          role: 'community',
        }
      });

      if (authError || !authData.user) {
        failCount++;
        errors.push(`Baris ${i + 2} gagal (Auth): ${authError?.message}`);
        continue;
      }

      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        username: username,
        full_name: `Admin ${name}`,
        role: "community",
        community_id: newComm.id,
        is_active: true,
      });

      if (userError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        failCount++;
        errors.push(`Baris ${i + 2} gagal (User DB): ${userError.message}`);
        continue;
      }

      insertedIds.push(newComm.id);
      successCount++;
    }

    revalidatePath("/super-admin/komunitas");
    revalidatePath("/super-admin/dashboard");
    const errText = errors.length > 0 ? " Detail: " + errors.slice(0, 3).join(" | ") + (errors.length > 3 ? "..." : "") : "";

    if (successCount === 0) {
      return { success: false, error: `Gagal mengimpor komunitas. Terdapat ${failCount} baris bermasalah.${errText}` };
    }

    return { success: true, message: `Berhasil mengimpor ${successCount} komunitas. Gagal: ${failCount} baris.${errText}`, insertedIds };
  } catch (err: any) {
    console.error("Exception in bulkCreateCommunitiesAction:", err);
    return { success: false, error: "Terjadi kesalahan sistem: " + (err.message || String(err)) };
  }
}

export async function getCommunityDeletionStatsAction(communityId: string): Promise<ActionResponse & { stats?: any }> {
  try {
    const { role } = await requireAuth(["super_admin"]);
    if (role !== "super_admin") return { success: false, error: "Unauthorized" };

    const supabase = createServerClient();
    
    // 1. Get Schools
    const { data: schools } = await supabase.from("schools").select("id").eq("community_id", communityId);
    const schoolIds = schools?.map(s => s.id) || [];
    
    // 2. Get Users (Community Admin + School Admins + Teachers)
    let userCount = 0;
    const { count: commAdminCount } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("community_id", communityId);
    userCount += commAdminCount || 0;
    
    if (schoolIds.length > 0) {
      const { count: schoolUserCount } = await supabase.from("users").select("id", { count: "exact", head: true }).in("school_id", schoolIds);
      userCount += schoolUserCount || 0;
    }

    // 3. Get Students
    let studentCount = 0;
    let studentIds: string[] = [];
    if (schoolIds.length > 0) {
      const { data: students } = await supabase.from("students").select("id").in("school_id", schoolIds);
      studentIds = students?.map(s => s.id) || [];
      studentCount = studentIds.length;
    }

    // 4. Get Assessment Sessions
    let sessionCount = 0;
    if (studentIds.length > 0) {
      // Chunk the array if it's too large, but for stats we can do a simplified count using school_id if available on sessions
      const { count: sCount } = await supabase.from("assessment_sessions").select("id", { count: "exact", head: true }).in("school_id", schoolIds);
      sessionCount = sCount || 0;
    }

    return {
      success: true,
      stats: {
        schools: schoolIds.length,
        users: userCount,
        students: studentCount,
        sessions: sessionCount
      }
    };
  } catch (err: any) {
    console.error("Exception in getCommunityDeletionStatsAction:", err);
    return { success: false, error: err.message };
  }
}

export async function deepDeleteCommunityAction(communityId: string): Promise<ActionResponse> {
  try {
    const { role } = await requireAuth(["super_admin"]);
    if (role !== "super_admin") return { success: false, error: "Unauthorized" };
    
    const supabase = createServerClient();
    
    // Gather IDs for bottom-up deletion
    const { data: schools } = await supabase.from("schools").select("id").eq("community_id", communityId);
    const schoolIds = schools?.map(s => s.id) || [];
    
    // Users to delete (Auth + Public)
    const { data: users1 } = await supabase.from("users").select("id").eq("community_id", communityId);
    const { data: users2 } = schoolIds.length > 0 
      ? await supabase.from("users").select("id").in("school_id", schoolIds) 
      : { data: [] };
    const allUserIds = [...(users1?.map(u => u.id) || []), ...(users2?.map(u => u.id) || [])];
    // Remove duplicates
    const uniqueUserIds = Array.from(new Set(allUserIds));

    const { data: classes } = schoolIds.length > 0 
      ? await supabase.from("classes").select("id").in("school_id", schoolIds)
      : { data: [] };
    const classIds = classes?.map(c => c.id) || [];

    const { data: students } = schoolIds.length > 0
      ? await supabase.from("students").select("id").in("school_id", schoolIds)
      : { data: [] };
    const studentIds = students?.map(s => s.id) || [];
    
    const { data: sessions } = schoolIds.length > 0
      ? await supabase.from("assessment_sessions").select("id").in("school_id", schoolIds)
      : { data: [] };
    const sessionIds = sessions?.map(s => s.id) || [];

    // --- BOTTOM UP DELETION ---
    
    // 1. Delete Student Answers (Chunked by sessionIds)
    if (sessionIds.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < sessionIds.length; i += chunkSize) {
        const chunk = sessionIds.slice(i, i + chunkSize);
        await supabase.from("student_answers").delete().in("session_id", chunk);
      }
    }

    // 2. Delete Assessment Sessions
    if (schoolIds.length > 0) {
      await supabase.from("assessment_sessions").delete().in("school_id", schoolIds);
    }

    // 3. Delete Class Teachers
    if (classIds.length > 0) {
      await (supabase as any).from("class_teachers").delete().in("class_id", classIds);
    }
    
    // 4. Delete Classes
    if (schoolIds.length > 0) {
      await supabase.from("classes").delete().in("school_id", schoolIds);
    }

    // 5. Delete Students
    if (schoolIds.length > 0) {
      await supabase.from("students").delete().in("school_id", schoolIds);
    }

    // 6. Delete Users (Auth and Public)
    if (uniqueUserIds.length > 0) {
      for (const uid of uniqueUserIds) {
        await supabase.from("users").delete().eq("id", uid);
        await supabase.auth.admin.deleteUser(uid);
      }
    }

    // 7. Delete Schools
    if (schoolIds.length > 0) {
      await supabase.from("schools").delete().in("id", schoolIds);
    }

    // 8. Delete Community
    const { error: commError } = await supabase.from("communities").delete().eq("id", communityId);
    if (commError) throw commError;
    
    revalidatePath("/super-admin/komunitas");
    revalidatePath("/super-admin/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Exception in deepDeleteCommunityAction:", err);
    return { success: false, error: "Terjadi kesalahan saat menghapus: " + (err.message || String(err)) };
  }
}

export async function bulkDeleteCommunitiesAction(ids: string[]) {
  // Not supporting deep delete for bulk action to avoid timeout/rate limits
  return { success: false, error: "Bulk delete with deep cascading is disabled for safety. Please delete communities individually." };
}
