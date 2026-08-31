"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import { generateTeacherCredentials } from "@/lib/credentialGenerator";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  credentials?: {
    username?: string;
    password?: string;
  };
}

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

export async function createPenelitiAdminAction(formData: FormData): Promise<ActionResponse> {
  try {
    const fullName = (formData.get("full_name") as string)?.trim();
    const username = (formData.get("username") as string)?.trim().toLowerCase();
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

    // 2. Generate password menggunakan nama
    const creds = generateTeacherCredentials(fullName);
    const generatedPassword = creds.password;

    // 3. Buat akun di Auth Supabase
    const email = `${username}@pemantik.local`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "peneliti",
      }
    });

    if (authError || !authData.user) {
      return { success: false, error: "Gagal membuat akun login: " + authError?.message };
    }

    // 4. Insert ke tabel public.users
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
    return { 
      success: true,
      credentials: { username, password: generatedPassword },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updatePenelitiAdminAction(id: string, formData: FormData): Promise<ActionResponse> {
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

export async function resetPenelitiPasswordAction(id: string): Promise<ActionResponse> {
  try {
    const admin = getAdminClient();

    // Ambil data user untuk generate password kontekstual
    const { data: userData } = await admin
      .from("users")
      .select("username, full_name")
      .eq("id", id)
      .maybeSingle();

    const creds = generateTeacherCredentials(userData?.full_name || "peneliti");

    const { error } = await admin.auth.admin.updateUserById(id, {
      password: creds.password
    });

    if (error) throw error;
    return { 
      success: true, 
      message: "Password berhasil direset.",
      credentials: { username: userData?.username, password: creds.password },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
