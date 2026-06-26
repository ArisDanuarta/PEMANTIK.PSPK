"use server";

import { createClient } from "@supabase/supabase-js";

/**
 * Mendapatkan admin client karena logs harus bisa ditulis tanpa batasan RLS
 */
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export type LogLevel = "info" | "warning" | "error" | "critical";
export type LogSource = "frontend" | "backend" | "database" | "system" | "feedback";

export interface LogEntry {
  level?: LogLevel;
  source?: LogSource;
  role_context?: string;
  user_id?: string | null;
  message: string;
  details?: any;
}

/**
 * Merekam log ke tabel system_logs.
 * Dirancang agar tidak pernah me-throw error (fail gracefully),
 * karena pencatatan log tidak boleh menggagalkan proses utama.
 */
export async function writeSystemLog(entry: LogEntry): Promise<void> {
  try {
    const admin = getAdminClient();
    
    // Normalisasi details menjadi json aman
    let safeDetails = null;
    if (entry.details) {
      try {
        safeDetails = JSON.parse(JSON.stringify(entry.details));
      } catch (e) {
        safeDetails = { error: "Unserializable details", raw: String(entry.details) };
      }
    }

    const { error } = await (admin as any).from("system_logs").insert({
      level: entry.level || "info",
      source: entry.source || "backend",
      role_context: entry.role_context || null,
      user_id: entry.user_id || null,
      message: entry.message,
      details: safeDetails,
    });

    if (error) {
      console.error("[Logger Error] Failed to write system log:", error);
    }
  } catch (err) {
    console.error("[Logger Exception] Failed to write system log:", err);
  }
}

/**
 * Menyelesaikan (resolve) sebuah log
 */
export async function resolveSystemLog(logId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = getAdminClient();
    
    // Get log details first
    const { data: log } = await (admin as any)
      .from("system_logs")
      .select("source, user_id, message")
      .eq("id", logId)
      .single();

    const { error } = await (admin as any)
      .from("system_logs")
      .update({ resolved: true })
      .eq("id", logId);

    if (error) throw error;

    // Send notification if it's user feedback
    if (log && log.source === "feedback" && log.user_id) {
      await (admin as any).from("notifications").insert({
        user_id: log.user_id,
        title: "Laporan Masukan Selesai",
        message: `Laporan Anda ("${log.message.substring(0, 30)}${log.message.length > 30 ? '...' : ''}") telah diselesaikan oleh Super Admin. Terima kasih atas kontribusi Anda!`,
        is_read: false
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Mengambil rekap status error untuk Dashboard
 */
export async function getSystemLogStats() {
  try {
    const admin = getAdminClient();
    
    // Total error hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: errorsToday } = await (admin as any)
      .from("system_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString())
      .in("level", ["error", "critical"]);
      
    // Critical unresolved
    const { count: criticalUnresolved } = await (admin as any)
      .from("system_logs")
      .select("*", { count: "exact", head: true })
      .eq("level", "critical")
      .eq("resolved", false);

    return {
      success: true,
      errorsToday: errorsToday || 0,
      criticalUnresolved: criticalUnresolved || 0,
    };
  } catch (err) {
    return { success: false, errorsToday: 0, criticalUnresolved: 0 };
  }
}

/**
 * Menerima masukan/laporan bug dari pengguna (komunitas, sekolah, guru)
 */
export async function submitFeedbackAction(message: string, currentPath: string) {
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    // Headers can be a fallback, but we should primarily use Supabase Auth
    let userRole = headersList.get("x-user-role") || "unknown";
    let userId = headersList.get("x-user-id") || null;
    let schoolId = headersList.get("x-school-id") || null;
    let communityId = headersList.get("x-community-id") || null;

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;

    const admin = getAdminClient();
    let user = null;

    if (token) {
      const { data: authUser } = await admin.auth.getUser(token);
      user = authUser?.user || null;
    }

    if (user) {
      userId = user.id;
      // Get role and entity info from user metadata or users table if needed
      const { data: userData } = await (admin as any).from("users").select("role, school_id, community_id").eq("id", user.id).single();
      if (userData) {
        if (userRole === "unknown") userRole = userData.role;
        if (!schoolId) schoolId = userData.school_id;
        if (!communityId) communityId = userData.community_id;
      }
    }

    let entityName = "—";
    let senderName = "—";

    if (userId) {
      const { data: user } = await (admin as any).from("users").select("full_name").eq("id", userId).single();
      if (user) senderName = user.full_name;
    }

    if (userRole === "community" && communityId) {
      const { data: comm } = await (admin as any).from("communities").select("name").eq("id", communityId).single();
      if (comm) entityName = comm.name;
    } else if (["school", "teacher"].includes(userRole) && schoolId) {
      const { data: sch } = await (admin as any).from("schools").select("name").eq("id", schoolId).single();
      if (sch) entityName = sch.name;
    }

    await writeSystemLog({
      level: "info",
      source: "feedback",
      role_context: userRole,
      user_id: userId,
      message: message,
      details: {
        path: currentPath,
        school_id: schoolId,
        community_id: communityId,
        sender_name: senderName,
        entity_name: entityName
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to submit feedback", err);
    return { success: false, error: err.message || "Terjadi kesalahan" };
  }
}
