"use server";

import { createServerClient } from "@pemantik/supabase";
import { cookies } from "next/headers";
import { requireAuth } from "./auth";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

interface GeneratedCredential {
  username: string;
  password?: string;
  pin?: string;
  className?: string;
  role: string;
}

/** Ambil user ID dari access token via Supabase admin API */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;
    if (!accessToken) return null;

    // Decode JWT payload (bagian tengah) untuk ambil sub (user id)
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return decoded?.sub || null;
  } catch {
    return null;
  }
}

export async function generateSandboxSchoolAction(formData: FormData) {
  const supabase = createServerClient(); // service role - bisa auth.admin.createUser

  try {
    const { role, communityId: communityIdFromAuth } = await requireAuth(["community", "super_admin"]);

    const targetCommunityId = (formData.get("community_id") as string) || communityIdFromAuth;
    if (!targetCommunityId) {
      return { success: false, error: "Community ID tidak ditemukan. Pastikan Anda login sebagai Admin Komunitas." };
    }

    const schoolName = (formData.get("school_name") as string)?.trim();
    const numTeachers = parseInt(formData.get("num_teachers") as string, 10);
    const numStudents = parseInt(formData.get("num_students") as string, 10);
    const categoryId = formData.get("category_id") as string;

    if (!schoolName) return { success: false, error: "Nama Sekolah wajib diisi." };
    if (isNaN(numTeachers) || numTeachers < 1 || numTeachers > 10) return { success: false, error: "Jumlah Guru harus antara 1 dan 10." };
    if (isNaN(numStudents) || numStudents < 1 || numStudents > 50) return { success: false, error: "Jumlah Siswa per Kelas harus antara 1 dan 50." };
    if (!categoryId) return { success: false, error: "Pilih Akses Ujian wajib dipilih." };

    // Ambil user ID dari JWT cookie (tidak perlu getUser() karena service role tidak punya session)
    const grantedBy = await getCurrentUserId();
    if (!grantedBy) {
      return { success: false, error: "Tidak dapat mengidentifikasi pengguna. Silakan login ulang." };
    }

    // ── Persiapan ──────────────────────────────────────────────────────────
    // Format singkat: 4 huruf pertama nama sekolah + 2 digit acak
    // Contoh: "SD Merdeka" → suffix "sdme42"
    const namePart = schoolName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 4);
    const suffix = namePart + Math.floor(10 + Math.random() * 90).toString(); // e.g. "sdme42"

    const DEFAULT_PASSWORD = "pspk123";
    const DEFAULT_PIN = "123456";

    const schoolId = crypto.randomUUID();
    const createdAuthIds: string[] = [];
    const usersPayload: object[] = [];
    const studentsPayload: object[] = [];
    const credentials: {
      admin?: GeneratedCredential;
      teachers: GeneratedCredential[];
      students: GeneratedCredential[];
    } = { teachers: [], students: [] };

    // ── 1. Buat Akun Admin Sekolah ─────────────────────────────────────────
    // Username admin: adm_{suffix} → contoh: adm_sdme42
    const adminUsername = `adm_${suffix}`;
    const adminEmail = `${adminUsername}@sandbox.local`;

    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: `Admin ${schoolName}`, role: "school" },
    });

    if (adminAuthError || !adminAuth.user) {
      return { success: false, error: "Gagal membuat akun Admin Sekolah: " + (adminAuthError?.message || "Unknown error") };
    }
    createdAuthIds.push(adminAuth.user.id);

    usersPayload.push({
      id: adminAuth.user.id,
      username: adminUsername,
      full_name: `Admin ${schoolName}`,
      role: "school",
      class_index: -1,
    });
    credentials.admin = { username: adminUsername, password: DEFAULT_PASSWORD, role: "school" };

    // Hash default PIN untuk siswa agar Edge Function mobile (bcrypt.compare) berhasil
    const hashedPin = bcrypt.hashSync(DEFAULT_PIN, 10);

    // ── 2. Buat Akun Guru + Kelas ──────────────────────────────────────────
    for (let i = 1; i <= numTeachers; i++) {
      // Username guru: g{i}_{suffix} → contoh: g1_sdme42
      const teacherUsername = `g${i}_${suffix}`;
      const teacherEmail = `${teacherUsername}@sandbox.local`;
      const className = `Kelas Gladi ${i}`;
      const grade = (i % 6) + 1;

      const { data: teacherAuth, error: teacherAuthError } = await supabase.auth.admin.createUser({
        email: teacherEmail,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: `Guru ${i} ${schoolName}`, role: "teacher" },
      });

      if (teacherAuthError || !teacherAuth.user) {
        await rollbackAuthUsers(supabase, createdAuthIds);
        return { success: false, error: `Gagal membuat akun Guru ${i}: ` + (teacherAuthError?.message || "Unknown error") };
      }
      createdAuthIds.push(teacherAuth.user.id);

      usersPayload.push({
        id: teacherAuth.user.id,
        username: teacherUsername,
        full_name: `Guru ${i} ${schoolName}`,
        role: "teacher",
        class_name: className,
        grade: grade,
        class_index: i,
      });

      credentials.teachers.push({ username: teacherUsername, password: DEFAULT_PASSWORD, className, role: "teacher" });

      // ── 3. Siapkan data Siswa per Kelas ──────────────────────────────────
      for (let j = 1; j <= numStudents; j++) {
        // Username siswa: s{j}k{i}_{suffix} → contoh: s1k1_sdme42
        const studentUsername = `s${j}k${i}_${suffix}`;
        studentsPayload.push({
          username: studentUsername,
          full_name: `Siswa ${j} Kelas ${i}`,
          gender: j % 2 === 0 ? "P" : "L",
          pin_hash: hashedPin, // Pakai hashedPin
          class_index: i,
        });
        credentials.students.push({ username: studentUsername, pin: DEFAULT_PIN, className, role: "student" });
      }
    }

    // ── 4. Panggil RPC untuk simpan semua entitas ke database ──────────────
    const { error: rpcError } = await supabase.rpc("insert_sandbox_school_data", {
      p_community_id: targetCommunityId,
      p_school_id: schoolId,
      p_school_name: schoolName,
      p_category_id: categoryId,
      p_granted_by: grantedBy,
      p_users: usersPayload as unknown as import("@pemantik/supabase").Json,
      p_students: studentsPayload as unknown as import("@pemantik/supabase").Json,
    });

    if (rpcError) {
      await rollbackAuthUsers(supabase, createdAuthIds);
      console.error("RPC insert_sandbox_school_data error:", rpcError);
      return { success: false, error: "Gagal menyimpan data ke database: " + rpcError.message };
    }

    return {
      success: true,
      data: {
        school: {
          name: schoolName,
          admin_username: credentials.admin?.username,
          admin_password: DEFAULT_PASSWORD,
        },
        teachers: credentials.teachers,
        students: credentials.students,
      },
    };
  } catch (err: any) {
    console.error("generateSandboxSchoolAction error:", err);
    return { success: false, error: err.message || "Terjadi kesalahan sistem." };
  }
}

async function rollbackAuthUsers(supabase: any, userIds: string[]) {
  for (const uid of userIds) {
    try { await supabase.auth.admin.deleteUser(uid); } catch {}
  }
}
