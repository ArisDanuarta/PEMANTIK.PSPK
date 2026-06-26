"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// ─── Role → dashboard path ────────────────────────────────────────────────────
const ROLE_DASHBOARDS: Record<string, string> = {
  super_admin: "/super-admin/dashboard",
  question_admin: "/admin-soal/dashboard",
  community: "/komunitas/dashboard",
  school: "/sekolah/dashboard",
  teacher: "/guru/dashboard",
};

// ─── Supabase admin client (service role) ─────────────────────────────────────
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Supabase anon client (untuk signIn) ─────────────────────────────────────
function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Login Server Action ──────────────────────────────────────────────────────

export interface LoginResult {
  error?: string;
}

export async function loginAction(
  formData: FormData
): Promise<LoginResult> {
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username dan password wajib diisi." };
  }

  // 1. Cari user di tabel users berdasarkan username (pakai service role)
  const admin = getAdminClient();
  const { data: userRecord, error: lookupError } = await admin
    .from("users")
    .select("id, role, username, community_id, school_id")
    .eq("username", username)
    .eq("is_active", true)
    .single();

  if (lookupError || !userRecord) {
    return { error: "Username tidak ditemukan atau akun tidak aktif." };
  }

  // 1.5 Cek Maintenance Mode
  const { data: settings } = await admin
    .from("system_settings")
    .select("maintenance_mode, maintenance_message")
    .eq("id", 1)
    .single();

  if (settings?.maintenance_mode && userRecord.role !== "super_admin") {
    return { error: settings.maintenance_message || "Sistem sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi." };
  }

  // 2. Ambil email dari auth.users lewat admin API
  const { data: authUser, error: authLookupError } =
    await admin.auth.admin.getUserById(userRecord.id);

  if (authLookupError || !authUser.user?.email) {
    return { error: "Konfigurasi akun bermasalah. Hubungi administrator." };
  }

  // 3. Sign in dengan email + password
  const anonClient = getAnonClient();
  const { data: session, error: signInError } =
    await anonClient.auth.signInWithPassword({
      email: authUser.user.email,
      password,
    });

  if (signInError || !session.session) {
    if (signInError?.message?.includes("Invalid login credentials")) {
      return { error: "Password salah. Silakan coba lagi." };
    }
    return { error: "Login gagal. Silakan coba lagi." };
  }

  // 4. Set cookies agar middleware bisa baca token
  const cookieStore = await cookies();
  const accessToken = session.session.access_token;
  const refreshToken = session.session.refresh_token;

  // Cookie name convention Supabase: sb-<project-ref>-auth-token
  const projectRef = "bhrqorbjdmlewwmlajfg";
  const cookieName = `sb-${projectRef}-auth-token`;

  cookieStore.set(cookieName, JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: session.session.expires_at,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });

  // Cookie lama yang dibaca middleware saat ini (sb-access-token)
  cookieStore.set("sb-access-token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 jam
  });

  // Cookie fallback untuk role jika custom claim hook belum terdaftar di Supabase
  cookieStore.set("sb-user-role", userRecord.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });

  if (userRecord.community_id) {
    cookieStore.set("sb-community-id", userRecord.community_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  if (userRecord.school_id) {
    cookieStore.set("sb-school-id", userRecord.school_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  // 5. Update last_login_at
  await admin
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", userRecord.id);

  // 6. Redirect ke dashboard sesuai role
  const destination = ROLE_DASHBOARDS[userRecord.role] ?? "/login";
  redirect(destination);
}

// ─── Logout Server Action ─────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const projectRef = "bhrqorbjdmlewwmlajfg";

  cookieStore.delete(`sb-${projectRef}-auth-token`);
  cookieStore.delete("sb-access-token");
  cookieStore.delete("sb-user-role");
  cookieStore.delete("sb-community-id");
  cookieStore.delete("sb-school-id");

  redirect("/login");
}
