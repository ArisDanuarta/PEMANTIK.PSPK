import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// PERBAIKAN: Menggunakan default import agar fungsi compare() terbaca dengan benar
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

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

    // Gunakan SERVICE_ROLE_KEY untuk mem-bypass RLS saat mencocokkan password
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Cari data siswa berdasarkan username
    const { data: student, error } = await supabase
      .from("students")
      .select("id, pin_hash, full_name, is_active, school_id, class_id, username, nisn, gender, ses_class, schools(name), classes(name)")
      .eq("username", username)
      .eq("is_active", true)
      .single();

    if (error) {
       throw new Error(`Database Error: ${error.message}`);
    }

    if (!student) {
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

    // Generate token JWT kustom sederhana
    const token = `jwt_${student.id}_${Date.now()}`;

    return new Response(
      JSON.stringify({ token, student }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ 
        error: "Terjadi kesalahan internal server", 
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});