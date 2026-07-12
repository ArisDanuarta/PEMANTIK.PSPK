import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
// PERBAIKAN KRITIS: Gunakan djwt untuk generate JWT valid yang bisa dibaca RLS Supabase
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Wajib: Tangani request preflight CORS dari Flutter
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, pin } = await req.json();

    if (!username || !pin) {
      return new Response(
        JSON.stringify({ error: "Username dan PIN wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gunakan SERVICE_ROLE_KEY untuk mem-bypass RLS saat mencocokkan password
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Cari data anak beserta community_id dari sekolah (diperlukan untuk JWT claims & RLS)
    const { data: student, error } = await supabase
      .from("students")
      .select(`
        id, pin_hash, full_name, is_active, school_id, class_id,
        username, nisn, gender, ses_class,
        schools ( name, community_id ),
        classes ( name )
      `)
      .eq("username", username)
      .eq("is_active", true)
      .single();

    if (error || !student) {
      return new Response(
        JSON.stringify({ error: "Nama pengguna tidak ditemukan atau tidak aktif" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifikasi hash PIN
    const isValid = await bcrypt.compare(pin, student.pin_hash);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "PIN yang dimasukkan salah" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ambil community_id dari relasi sekolah
    const schoolData = student.schools as { name: string; community_id: string | null } | null;
    const communityId = schoolData?.community_id ?? null;

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE JWT VALID — ditandatangani dengan SUPABASE_JWT_SECRET
    // Token ini bisa dibaca oleh RLS via current_setting('request.jwt.claims')
    // ─────────────────────────────────────────────────────────────────────────
    const jwtSecret = Deno.env.get("STUDENT_JWT_SECRET") ?? Deno.env.get("JWT_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET") ?? "";

    if (!jwtSecret) {
      throw new Error("STUDENT_JWT_SECRET atau JWT_SECRET tidak terkonfigurasi di environment");
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const now = getNumericDate(0);
    const payload = {
      // ── Claims standar JWT (RFC 7519) ──────────────────────────────
      iss: "supabase",
      sub: student.id,                    // subject = UUID siswa
      iat: now,                           // issued at (sekarang)
      exp: getNumericDate(60 * 60 * 24 * 30), // expired 30 hari (persistent session)

      // ── Claims Supabase wajib ──────────────────────────────────────
      // role 'anon' agar Supabase tidak reject token ini sebagai invalid role
      // (Supabase hanya mengenal: anon, authenticated, service_role)
      role: "anon",

      // ── Custom claims untuk RLS isolasi siswa ─────────────────────
      user_role: "student",             // dibaca oleh jwt_user_role_extended()
      student_id: student.id,           // dibaca oleh jwt_student_id()
      school_id: student.school_id,     // dibaca oleh jwt_school_id()
      class_id: student.class_id,       // untuk keperluan laporan
      community_id: communityId,        // untuk RLS akses ke assessment_access
    };

    const token = await create({ alg: "HS256", typ: "JWT" }, payload, key);

    // Hapus pin_hash dari response — JANGAN pernah kirim ke client
    const { pin_hash: _removed, ...studentData } = student as any;

    return new Response(
      JSON.stringify({ token, student: studentData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[authenticate-student] Error:", errorMessage);
    return new Response(
      JSON.stringify({
        error: "Terjadi kesalahan internal server",
        details: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});