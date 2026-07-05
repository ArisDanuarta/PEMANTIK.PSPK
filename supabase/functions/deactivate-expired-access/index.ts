/**
 * Edge Function: deactivate-expired-access
 *
 * Tujuan: Menonaktifkan baris assessment_access yang valid_until-nya sudah lewat
 *         tetapi is_active masih true. Dijalankan via cron job Supabase (setiap jam).
 *
 * Gap 7.2 Decision: Implementasi penuh auto-deactivate via Edge Function terjadwal.
 * Konsisten dengan RLS student_view_own_access yang sudah memakai valid_until check.
 *
 * Deploy:
 *   npx supabase functions deploy deactivate-expired-access --no-verify-jwt
 *
 * Daftarkan cron (Supabase Dashboard → Database → Cron Jobs):
 *   SELECT cron.schedule(
 *     'deactivate-expired-access',
 *     '0 * * * *',  -- setiap jam
 *     $$
 *     SELECT net.http_post(
 *       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/deactivate-expired-access',
 *       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
 *     );
 *     $$
 *   );
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

  // Verifikasi bahwa request berasal dari cron (service role) atau authorized caller
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
    // Gunakan service role untuk UPDATE tanpa dibatasi RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    const now = new Date().toISOString();

    // Update semua baris yang valid_until sudah lewat tapi is_active masih true
    const { data, error, count } = await supabase
      .from("assessment_access")
      .update({
        is_active: false,
        // Catat waktu dinonaktifkan via updated_at (menggunakan DEFAULT updated_at trigger)
      })
      .eq("is_active", true)
      .lt("valid_until", now)
      .select("id, target_type, target_id, category_id, phase, valid_until");

    if (error) {
      console.error("[deactivate-expired-access] Error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deactivatedCount = (data ?? []).length;
    console.log(`[deactivate-expired-access] Deactivated ${deactivatedCount} expired access grants.`);

    return new Response(
      JSON.stringify({
        success: true,
        deactivated_count: deactivatedCount,
        deactivated_at: now,
        items: (data ?? []).map((d) => ({
          id: d.id,
          target_type: d.target_type,
          target_id: d.target_id,
          category_id: d.category_id,
          phase: d.phase,
          valid_until: d.valid_until,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[deactivate-expired-access] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
