/**
 * Edge Function: cron-auto-transition
 *
 * Tujuan: Memindahkan stage asesmen sekolah secara otomatis dari 'proses_asesmen'
 *         menjadi 'intervensi' ketika waktu akses asesmen (`valid_until`) telah berakhir.
 *         Dijalankan secara periodik via pg_cron.
 *
 * Idempotency: Hanya memproses data dengan `current_stage = 'proses_asesmen'`.
 * Kegagalan: Jika function ini gagal (timeout/500), pg_cron akan diam-diam gagal.
 * Log tersimpan di tabel `cron.job_run_details` di database Supabase.
 *
 * Deploy:
 *   npx supabase functions deploy cron-auto-transition --no-verify-jwt
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verifikasi otorisasi (menggunakan service_role_key sebagai bearer token)
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const expectedBearer = `Bearer ${serviceRoleKey}`;

  if (!authHeader || authHeader !== expectedBearer) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    const now = new Date().toISOString();

    // Logika Auto-Transition:
    // Kita harus mencari school_assessment_stages yang masih 'proses_asesmen',
    // tetapi aksesnya (di assessment_access) sudah habis masa berlakunya (valid_until < now).
    // Karena Supabase JS client tidak mendukung UPDATE dengan JOIN secara langsung,
    // kita gunakan RPC atau query 2 tahap.
    // Query 2 tahap lebih aman dan bisa dilimit per batch untuk menghindari timeout.

    // Tahap 1: Ambil semua stage yang masih 'proses_asesmen' dan cocokkan dengan assessment_access
    const { data: stages, error: fetchErr } = await supabase
      .from("school_assessment_stages")
      .select(`
        id,
        school_id,
        community_id,
        phase
      `)
      .eq("current_stage", "proses_asesmen");

    if (fetchErr) throw fetchErr;

    if (!stages || stages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Tidak ada stage yang perlu di-transition.", updated_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ambil detail akses untuk mengetahui valid_until
    // Gunakan 'target_id' = school_id, atau community_id.
    const { data: accesses, error: accessErr } = await supabase
      .from("assessment_access")
      .select("target_id, phase, valid_until");

    if (accessErr) throw accessErr;

    // Filter stage yang kedaluwarsa
    const stageIdsToUpdate: string[] = [];

    for (const stage of stages) {
      // Cari akses yang berhubungan dengan stage ini (sekolah atau komunitasnya, dengan fase yang sama)
      const relatedAccess = accesses?.find(acc => 
        acc.phase === stage.phase && 
        (acc.target_id === stage.school_id || acc.target_id === stage.community_id)
      );

      // Jika akses ada dan waktu sekarang sudah melewati valid_until
      if (relatedAccess && now > relatedAccess.valid_until) {
        stageIdsToUpdate.push(stage.id);
      }
    }

    if (stageIdsToUpdate.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Tidak ada stage yang memenuhi syarat kedaluwarsa.", updated_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tahap 2: Update stage yang kedaluwarsa secara batch
    // Gunakan update dengan filter in()
    const { error: updateErr } = await supabase
      .from("school_assessment_stages")
      .update({
        current_stage: "intervensi",
        stage_updated_at: now
      })
      .in("id", stageIdsToUpdate);

    if (updateErr) throw updateErr;

    console.log(`[cron-auto-transition] Berhasil memindahkan ${stageIdsToUpdate.length} stage ke intervensi.`);

    return new Response(
      JSON.stringify({
        success: true,
        updated_count: stageIdsToUpdate.length,
        updated_ids: stageIdsToUpdate,
        timestamp: now
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[cron-auto-transition] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
