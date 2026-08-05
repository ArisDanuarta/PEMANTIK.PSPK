import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Field yang diizinkan untuk di-update oleh siswa
const ALLOWED_UPDATE_FIELDS = [
  'full_name', 'nisn', 'gender', 'birth_date',
  'province', 'city', 'district', 'village',
  'father_occupation_id', 'mother_occupation_id',
  'father_education_id', 'mother_education_id',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ambil JWT dari Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Token tidak ditemukan" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verifikasi JWT dan ambil claims
    const jwtSecret = Deno.env.get("STUDENT_JWT_SECRET") ?? Deno.env.get("JWT_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET") ?? "";
    if (!jwtSecret) {
      throw new Error("JWT secret tidak terkonfigurasi");
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    let payload: Record<string, unknown>;
    try {
      payload = await verify(token, key) as Record<string, unknown>;
    } catch (_) {
      return new Response(
        JSON.stringify({ error: "Token tidak valid atau sudah kedaluwarsa" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentId = payload['student_id'] as string | undefined;
    if (!studentId) {
      return new Response(
        JSON.stringify({ error: "Token tidak memiliki student_id" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gunakan service_role untuk bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ─────────────────────────────────────────────────────────────
    // MODE UPDATE: jika request body ada, lakukan update dulu
    // ─────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      let body: Record<string, unknown> = {};
      try {
        body = await req.json();
      } catch (_) { /* body kosong = mode GET */ }

      if (body && Object.keys(body).length > 0) {
        // Filter hanya field yang diizinkan
        const safeUpdate: Record<string, unknown> = {};
        for (const field of ALLOWED_UPDATE_FIELDS) {
          if (field in body) {
            safeUpdate[field] = body[field];
          }
        }

        if (Object.keys(safeUpdate).length > 0) {
          const { error: updateError } = await supabase
            .from("students")
            .update(safeUpdate)
            .eq("id", studentId);

          if (updateError) {
            console.error("[refresh-student-profile] UPDATE error:", updateError.message);
            return new Response(
              JSON.stringify({ error: "Gagal menyimpan perubahan ke database", details: updateError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          console.log("[refresh-student-profile] UPDATE berhasil untuk student:", studentId);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Ambil data terbaru (GET atau setelah UPDATE)
    // ─────────────────────────────────────────────────────────────
    const { data: student, error } = await supabase
      .from("students")
      .select(`
        id, full_name, username, nisn, gender, ses_class, birth_date,
        school_id, class_id, is_active,
        province, city, district, village,
        father_occupation_id, mother_occupation_id,
        father_education_id, mother_education_id,
        father_occupation:father_occupation_id ( name ),
        mother_occupation:mother_occupation_id ( name ),
        father_education:father_education_id ( name ),
        mother_education:mother_education_id ( name ),
        schools ( name, community_id ),
        classes ( name )
      `)
      .eq("id", studentId)
      .eq("is_active", true)
      .single();

    if (error || !student) {
      return new Response(
        JSON.stringify({ error: "Data siswa tidak ditemukan" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ student }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[refresh-student-profile] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
