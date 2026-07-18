"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Helper to get admin client since we need to verify JWT manually
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Mengambil notifikasi untuk pengguna yang sedang login
 */
export async function getUserNotifications(limit = 20): Promise<{ success: boolean; data?: Notification[]; error?: string }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;

    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const admin = getAdminClient();
    const { data: { user } } = await admin.auth.getUser(token);
    
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await (admin as any)
      .from("notifications")
      .select("id, title, message, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data as Notification[] };
  } catch (err: any) {
    console.error("Failed to fetch notifications:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Menandai notifikasi sebagai sudah dibaca
 */
export async function markNotificationAsRead(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;

    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const admin = getAdminClient();
    const { data: { user } } = await admin.auth.getUser(token);
    
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await (admin as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error("Failed to mark notification as read:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Helper: kirim notifikasi ke SEMUA user dengan role super_admin.
 * Dipakai oleh submitPhaseRequestAction dan requestCommunityEngagementAction.
 *
 * Menggunakan service role client (bukan session user) karena action ini
 * harus bisa menulis ke tabel notifications milik user lain (super_admin).
 */
export async function notifyAllSuperAdmins(
  title: string,
  message: string,
  metadata?: Record<string, any>,
): Promise<void> {
  try {
    const admin = getAdminClient();

    // Ambil semua user ID dengan role super_admin
    const { data: superAdmins, error: fetchErr } = await (admin as any)
      .from("users")
      .select("id")
      .eq("role", "super_admin")
      .eq("is_active", true);

    if (fetchErr || !superAdmins || superAdmins.length === 0) {
      console.warn("[notifyAllSuperAdmins] Tidak ada super_admin aktif ditemukan.");
      return;
    }

    // Buat satu baris notifikasi per super_admin
    const rows = superAdmins.map((sa: { id: string }) => ({
      user_id: sa.id,
      title,
      message,
      is_read: false,
      ...(metadata ? { metadata } : {}),
    }));

    const { error: insertErr } = await (admin as any)
      .from("notifications")
      .insert(rows);

    if (insertErr) {
      console.error("[notifyAllSuperAdmins] Gagal insert notifikasi:", insertErr);
    }
  } catch (err: any) {
    // Gagal silent - notifikasi tidak boleh gagalkan action utama
    console.error("[notifyAllSuperAdmins]", err);
  }
}
