"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import { writeSystemLog } from "./logs";
import { generateAdminCredentials } from "@/lib/credentialGenerator";

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

export async function getQuestionAdmins() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "question_admin")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createQuestionAdminAction(formData: FormData): Promise<ActionResponse> {
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
    const creds = generateAdminCredentials(fullName);
    const generatedPassword = creds.password;

    // 3. Buat akun di Auth Supabase
    const email = `${username}@pemantik.local`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "question_admin",
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
      role: "question_admin",
      is_active: isActive,
      plain_password: generatedPassword
    });

    if (insertError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: "Gagal menyimpan data pengguna: " + insertError.message };
    }

    revalidatePath("/super-admin/admin-soal");
    return { 
      success: true,
      credentials: { username, password: generatedPassword },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateQuestionAdminAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const fullName = (formData.get("full_name") as string)?.trim();
    const password = (formData.get("password") as string);
    const isActive = formData.get("is_active") === "true";

    if (!fullName) {
      return { success: false, error: "Nama wajib diisi." };
    }

    const admin = getAdminClient();

    // 1. Update public.users
    const { error: updateError } = await admin.from("users").update({
      full_name: fullName,
      is_active: isActive
    }).eq("id", id);

    if (updateError) {
      return { success: false, error: "Gagal memperbarui pengguna: " + updateError.message };
    }

    // 2. Jika password diisi, update di Auth Supabase
    if (password && password.length >= 6) {
      const { error: authError } = await admin.auth.admin.updateUserById(id, {
        password: password
      });
      if (authError) {
        return { success: false, error: "Gagal memperbarui password: " + authError.message };
      }
    }

    revalidatePath("/super-admin/admin-soal");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteQuestionAdminAction(id: string) {
  try {
    const admin = getAdminClient();
    
    // Auth hapus juga akan memicu hapus dari public.users cascade (atau sebaliknya)
    const { error } = await admin.auth.admin.deleteUser(id);
    
    if (error) {
      // Jika cascade di auth tidak aktif, kita hapus manual
      await admin.from("users").delete().eq("id", id);
    }

    revalidatePath("/super-admin/admin-soal");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetQuestionAdminPasswordAction(id: string): Promise<ActionResponse> {
  try {
    const admin = getAdminClient();

    // Ambil data user untuk generate password kontekstual
    const { data: userData } = await admin
      .from("users")
      .select("username, full_name")
      .eq("id", id)
      .maybeSingle();

    const creds = generateAdminCredentials(userData?.full_name || "admin");
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      password: creds.password
    });
    
    const { error: updateError } = await admin.from("users").update({
      plain_password: creds.password
    }).eq("id", id);

    if (updateError) {
      return { success: false, error: "Berhasil mereset password di Auth, tetapi gagal mengupdate plain_password di tabel users." };
    }
    
    if (authError) {
      return { success: false, error: "Gagal mereset password: " + authError.message };
    }

    revalidatePath("/super-admin/admin-soal");
    return { 
      success: true,
      credentials: { username: userData?.username, password: creds.password },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
