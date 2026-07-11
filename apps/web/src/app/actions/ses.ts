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

export async function updateSesVariable(id: string, type: "education" | "occupation", name: string, score: number) {
  const supabase = createServerClient();

  // GAP 4: Set needs_review=false saat Super Admin mengisi skor
  const { error } = await (supabase as any)
    .from("ses_variables")
    .update({ type, name, score, needs_review: false })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  // Rekalkulasi ses_score untuk semua siswa yang pakai variabel ini
  await recalculateSesScoreForVariable(supabase, id);

  revalidatePath("/super-admin/pengaturan-ses");
  revalidatePath("/super-admin/siswa");
  return { success: true };
}

/**
 * Rekalkulasi ses_score untuk semua siswa yang punya relasi ke ses_variable tertentu.
 * Spec §4c.1:
 * - Jika ada komponen lain yang masih needs_review → ses_score = NULL, ses_class = NULL
 * - Jika semua komponen lengkap & tidak ada needs_review → ses_score = sum of 4 scores, ses_class dari thresholds
 */
async function recalculateSesScoreForVariable(supabase: any, variableId: string): Promise<void> {
  try {
    // Ambil semua siswa yang pakai variabel ini (salah satu dari 4 slot)
    const { data: affectedStudents } = await supabase
      .from("students")
      .select("id, father_education_id, mother_education_id, father_occupation_id, mother_occupation_id")
      .or([
        `father_education_id.eq.${variableId}`,
        `mother_education_id.eq.${variableId}`,
        `father_occupation_id.eq.${variableId}`,
        `mother_occupation_id.eq.${variableId}`,
      ].join(","));

    if (!affectedStudents || affectedStudents.length === 0) return;

    // Kumpulkan semua variable ID yang dipakai oleh siswa-siswa ini
    const allVarIds = new Set<string>();
    for (const s of affectedStudents) {
      if (s.father_education_id) allVarIds.add(s.father_education_id);
      if (s.mother_education_id) allVarIds.add(s.mother_education_id);
      if (s.father_occupation_id) allVarIds.add(s.father_occupation_id);
      if (s.mother_occupation_id) allVarIds.add(s.mother_occupation_id);
    }

    // Ambil info semua variabel dan thresholds
    const [{ data: vars }, { data: thresholds }] = await Promise.all([
      supabase.from("ses_variables").select("id, score, needs_review").in("id", Array.from(allVarIds)),
      supabase.from("ses_thresholds").select("*"),
    ]);

    const varMap = new Map<string, { score: number; needs_review: boolean }>(
      (vars || []).map((v: any) => [v.id, { score: v.score ?? 0, needs_review: Boolean(v.needs_review) }])
    );

    const sortedThresholds = [...(thresholds || [])].sort((a: any, b: any) => a.min_score - b.min_score);

    for (const student of affectedStudents) {
      const componentIds = [
        student.father_education_id,
        student.mother_education_id,
        student.father_occupation_id,
        student.mother_occupation_id,
      ].filter(Boolean) as string[];

      const hasUnreviewed = componentIds.some((cid) => varMap.get(cid)?.needs_review === true);

      let ses_score: number | null = null;
      let ses_class: string | null = null;

      if (!hasUnreviewed && componentIds.length > 0) {
        ses_score = componentIds.reduce((sum, cid) => sum + (varMap.get(cid)?.score ?? 0), 0);
        const matched = sortedThresholds.find(
          (t: any) => ses_score! >= t.min_score && ses_score! <= t.max_score
        );
        if (matched) ses_class = matched.name;
      }

      await supabase
        .from("students")
        .update({ ses_score, ses_class })
        .eq("id", student.id);
    }
  } catch (err) {
    // Non-critical: log but don't block the response
    console.error("[recalculateSesScoreForVariable] Error:", err);
  }
}

export async function createSesVariable(type: "education" | "occupation", name: string, score: number) {
  const supabase = createServerClient();
  // Manual creation by Super Admin: needs_review = false (not from dapodik auto-detect)
  const { error } = await (supabase as any)
    .from("ses_variables")
    .insert({ type, name, score, needs_review: false, source: "manual" });

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
