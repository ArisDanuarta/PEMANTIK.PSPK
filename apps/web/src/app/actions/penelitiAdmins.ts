"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";

// Helper to get admin client
function getAdminClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function getPenelitiAdmins() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await (supabase as any)
      .from("users")
      .select("*")
      .eq("role", "peneliti")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createPenelitiAdminAction(formData: FormData) {
  try {
    const fullName = (formData.get("full_name") as string)?.trim();
    const username = (formData.get("username") as string)?.trim().toLowerCase();
    const password = "Password123!";
    const isActive = formData.get("is_active") === "true";

    if (!fullName || !username) {
      return { success: false, error: "Nama dan Username wajib diisi." };
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return { success: false, error: "Username hanya boleh huruf kecil, angka, dan underscore (_)." };
    }

    const admin = getAdminClient();

    // 1. Cek apakah username sudah ada
    const { data: existingUser } = await admin
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      return { success: false, error: "Username sudah digunakan." };
    }

    // 2. Buat akun di Auth Supabase
    const email = `${username}@pemantik.local`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "peneliti",
      }
    });

    if (authError || !authData.user) {
      return { success: false, error: "Gagal membuat akun login: " + authError?.message };
    }

    // 3. Insert ke tabel public.users
    const { error: insertError } = await admin.from("users").insert({
      id: authData.user.id,
      username,
      full_name: fullName,
      role: "peneliti",
      is_active: isActive
    });

    if (insertError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: "Gagal menyimpan data pengguna: " + insertError.message };
    }

    revalidatePath("/super-admin/peneliti");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updatePenelitiAdminAction(id: string, formData: FormData) {
  try {
    const fullName = (formData.get("full_name") as string)?.trim();
    const isActive = formData.get("is_active") === "true";

    if (!fullName) {
      return { success: false, error: "Nama wajib diisi." };
    }

    const admin = getAdminClient();

    // Update public.users
    const { error: updateError } = await admin
      .from("users")
      .update({
        full_name: fullName,
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // Update user_metadata in auth
    await admin.auth.admin.updateUserById(id, {
      user_metadata: { full_name: fullName }
    });

    revalidatePath("/super-admin/peneliti");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePenelitiAdminAction(id: string) {
  try {
    const admin = getAdminClient();

    // Delete auth user (will cascade to public.users via trigger/FK if set up, or just delete both)
    const { error: authError } = await admin.auth.admin.deleteUser(id);
    if (authError) throw authError;

    // Optional safety deletion in public.users
    await admin.from("users").delete().eq("id", id);

    revalidatePath("/super-admin/peneliti");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetPenelitiPasswordAction(id: string) {
  try {
    const admin = getAdminClient();
    const newPassword = "Password123!";

    const { error } = await admin.auth.admin.updateUserById(id, {
      password: newPassword
    });

    if (error) throw error;
    return { success: true, message: "Password berhasil direset menjadi: " + newPassword };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
