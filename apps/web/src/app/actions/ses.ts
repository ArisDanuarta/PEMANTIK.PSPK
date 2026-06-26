"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";

export async function updateSesThreshold(id: string, minScore: number, maxScore: number) {
  const supabase = createServerClient();
  const { error } = await (supabase as any)
    .from("ses_thresholds")
    .update({ min_score: minScore, max_score: maxScore })
    .eq("id", id);
    
  if (error) return { success: false, error: error.message };
  revalidatePath("/super-admin/pengaturan-ses");
  return { success: true };
}

export async function updateSesVariable(id: string, type: 'education' | 'occupation', name: string, score: number) {
  const supabase = createServerClient();
  const { error } = await (supabase as any)
    .from("ses_variables")
    .update({ type, name, score })
    .eq("id", id);
    
  if (error) return { success: false, error: error.message };
  revalidatePath("/super-admin/pengaturan-ses");
  return { success: true };
}

export async function createSesVariable(type: 'education' | 'occupation', name: string, score: number) {
  const supabase = createServerClient();
  const { error } = await (supabase as any)
    .from("ses_variables")
    .insert({ type, name, score });
    
  if (error) return { success: false, error: error.message };
  revalidatePath("/super-admin/pengaturan-ses");
  return { success: true };
}

export async function deleteSesVariable(id: string) {
  const supabase = createServerClient();
  const { error } = await (supabase as any)
    .from("ses_variables")
    .delete()
    .eq("id", id);
    
  if (error) return { success: false, error: error.message };
  revalidatePath("/super-admin/pengaturan-ses");
  return { success: true };
}
