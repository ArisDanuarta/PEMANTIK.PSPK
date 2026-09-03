"use server";

import { createServerClient } from "@pemantik/supabase";

export async function fetchAnalisisKomparatifStats(
  communityId: string = 'all',
  province: string = 'all',
  gender: string = 'all'
) {
  try {
    const supabase = createServerClient();
    const { data, error } = await (supabase as any).rpc("get_peneliti_komparatif_stats", {
      p_community_id: communityId,
      p_province: province,
      p_gender: gender
    });

    if (error) {
      console.error("RPC Error (get_peneliti_komparatif_stats):", JSON.stringify(error, null, 2));
      return { success: false, error: "Gagal mengambil data agregasi analisis komparatif." };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("fetchAnalisisKomparatifStats error:", err);
    return { success: false, error: "Terjadi kesalahan server internal." };
  }
}
