"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function createCommunityAction(
  formData: FormData
): Promise<ActionResponse> {
  try {
    const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toLowerCase();
  const address = (formData.get("address") as string)?.trim() || null;
  const contactName = (formData.get("contact_name") as string)?.trim() || null;
  const contactPhone = (formData.get("contact_phone") as string)?.trim() || null;
  const contactEmail = (formData.get("contact_email") as string)?.trim() || null;
  const isActive = formData.get("is_active") === "true";

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

  const { data: newComm, error } = await supabase.from("communities").insert({
    name,
    code,
    address,
    contact_name: contactName,
    contact_phone: contactPhone,
    contact_email: contactEmail,
    is_active: isActive,
  }).select().single();

  if (error || !newComm) {
    console.error("Failed to create community:", error);
    return { success: false, error: "Gagal membuat komunitas: " + error?.message };
  }

  // BUAT AKUN ADMIN KOMUNITAS SECARA OTOMATIS
  const defaultPassword = "Password123!";
  const username = `admin_${code}`;
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
  const address = (formData.get("address") as string)?.trim() || null;
  const contactName = (formData.get("contact_name") as string)?.trim() || null;
  const contactPhone = (formData.get("contact_phone") as string)?.trim() || null;
  const contactEmail = (formData.get("contact_email") as string)?.trim() || null;
  const isActive = formData.get("is_active") === "true";

  if (!name) {
    return { success: false, error: "Nama Komunitas wajib diisi." };
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("communities")
    .update({
      name,
      address,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      is_active: isActive,
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
