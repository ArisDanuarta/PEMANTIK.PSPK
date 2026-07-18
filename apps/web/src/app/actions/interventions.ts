"use server";

import { createServerClient } from "@pemantik/supabase";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface InterventionPayload {
  schoolId: string;
  phase: string;
  stageId: string;
  kondisiAwal: string;
  upayaDilakukan: string;
  perubahanSignifikan: string;
  alasanBermakna: string;
  tagNames: string[];  // Nama-nama tag (bukan ID) - akan di create-or-get
}

export interface InterventionRow {
  id: string;
  school_id: string;
  community_id: string;
  phase: string;
  stage_id: string | null;
  kondisi_awal: string;
  upaya_dilakukan: string;
  perubahan_signifikan: string;
  alasan_bermakna: string;
  submitted_by: string;
  created_at: string;
  schools?: { name: string; npsn: string | null };
  intervention_tag_links?: { intervention_tags: { id: string; name: string } }[];
}

export interface GraphNode {
  id: string;
  type: "school" | "community" | "intervention" | "tag";
  label: string;
  data: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getCommunityIdFromHeader(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-community-id");
}

/**
 * Create-or-Get tag berdasarkan nama.
 * Jika tag sudah ada (nama sama) → return ID yang existing.
 * Jika belum → insert baru.
 * Case-sensitive (sesuai constraint UNIQUE pada tabel).
 */
export async function createOrGetTagAction(
  name: string,
): Promise<{ success: boolean; tagId?: string; error?: string }> {
  try {
    if (!name || name.trim().length === 0) {
      return { success: false, error: "Nama tag tidak boleh kosong." };
    }
    const trimmed = name.trim();

    const supabase = await createServerClient();

    // Coba insert dulu (optimistic)
    const headersList = await headers();
    const userId = headersList.get("x-user-id");

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from("intervention_tags")
      .insert({ name: trimmed, created_by: userId ?? null })
      .select("id")
      .single();

    if (!insertErr && inserted) {
      return { success: true, tagId: inserted.id };
    }

    // Unique violation → tag sudah ada, ambil yang existing
    if (insertErr?.code === "23505") {
      const { data: existing, error: fetchErr } = await (supabase as any)
        .from("intervention_tags")
        .select("id")
        .eq("name", trimmed)
        .single();

      if (fetchErr || !existing) throw fetchErr || new Error("Tag tidak ditemukan.");
      return { success: true, tagId: existing.id };
    }

    throw insertErr;
  } catch (err: any) {
    console.error("[createOrGetTagAction]", err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit laporan intervensi.
 *
 * Flow:
 * 1. Validasi field wajib
 * 2. Validasi stage milik komunitas dan sedang di 'intervensi'
 * 3. Insert baris interventions
 * 4. Batch insert tag_links (create-or-get tiap tag)
 * 5. Update school_assessment_stages → current_stage = 'selesai'
 *
 * Semua dalam 1 "transaksi" - jika step 5 gagal, intervensi tetap tersimpan
 * tapi stage tidak berubah → komunitas bisa submit ulang tanpa kehilangan data.
 */
export async function submitInterventionAction(
  payload: InterventionPayload,
): Promise<{ success: boolean; error?: string; interventionId?: string }> {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const userRole = headersList.get("x-user-role");

    if (!userId) {
      return { success: false, error: "Sesi tidak valid." };
    }

    // Validasi field narasi
    const { kondisiAwal, upayaDilakukan, perubahanSignifikan, alasanBermakna } = payload;
    if (!kondisiAwal.trim() || !upayaDilakukan.trim() || !perubahanSignifikan.trim() || !alasanBermakna.trim()) {
      return { success: false, error: "Semua 4 field narasi wajib diisi." };
    }

    const supabase = await createServerClient();

    // Validasi stage: pastikan stage ada dan di tahap 'intervensi'
    const { data: stage, error: stageErr } = await (supabase as any)
      .from("school_assessment_stages")
      .select("id, current_stage, school_id, community_id, phase")
      .eq("id", payload.stageId)
      .eq("school_id", payload.schoolId)
      .maybeSingle();

    if (stageErr || !stage) {
      return { success: false, error: "Tahap tidak ditemukan." };
    }
    if (stage.current_stage !== "intervensi") {
      return {
        success: false,
        error: `Sekolah ini tidak sedang di tahap Intervensi (tahap saat ini: '${stage.current_stage}').`,
      };
    }

    // Authorization checks
    if (userRole === "community") {
      const headerCommunityId = headersList.get("x-community-id");
      if (!headerCommunityId || headerCommunityId !== stage.community_id) {
        return { success: false, error: "Anda tidak memiliki akses ke sekolah binaan ini." };
      }
    } else if (userRole === "school" || userRole === "teacher") {
      const headerSchoolId = headersList.get("x-school-id");
      if (!headerSchoolId || headerSchoolId !== payload.schoolId) {
        return { success: false, error: "Anda tidak memiliki akses ke data sekolah ini." };
      }
    } else if (userRole !== "super_admin") {
      return { success: false, error: "Peran Anda tidak diizinkan menyimpan intervensi." };
    }

    // Insert intervensi
    const { data: newIntervention, error: insertErr } = await (supabase as any)
      .from("interventions")
      .insert({
        school_id: payload.schoolId,
        community_id: stage.community_id, // Gunakan community_id dari stage agar mendukung sekolah independen (null)
        phase: payload.phase,
        stage_id: payload.stageId,
        kondisi_awal: kondisiAwal.trim(),
        upaya_dilakukan: upayaDilakukan.trim(),
        perubahan_signifikan: perubahanSignifikan.trim(),
        alasan_bermakna: alasanBermakna.trim(),
        submitted_by: userId,
      })
      .select("id")
      .single();

    if (insertErr || !newIntervention) throw insertErr || new Error("Gagal menyimpan intervensi.");

    // Batch insert tag_links
    if (payload.tagNames.length > 0) {
      // Resolve semua tag name → ID
      const tagIdResults = await Promise.all(
        payload.tagNames.map((name) => createOrGetTagAction(name)),
      );

      const tagLinks = tagIdResults
        .filter((r) => r.success && r.tagId)
        .map((r) => ({
          intervention_id: newIntervention.id,
          tag_id: r.tagId!,
        }));

      if (tagLinks.length > 0) {
        const { error: linkErr } = await (supabase as any)
          .from("intervention_tag_links")
          .insert(tagLinks);

        if (linkErr) {
          console.error("[submitInterventionAction] Gagal insert tag_links:", linkErr);
          // Tidak gagalkan submit - intervensi sudah tersimpan
        }
      }
    }

    // Cek apakah stage ini sudah bisa dipindah ke 'selesai'
    // Ambil semua intervensi untuk stage ini
    const { data: allInterventions, error: allIntErr } = await (supabase as any)
      .from("interventions")
      .select("id, submitted_by, users(id, role)")
      .eq("stage_id", payload.stageId);

    if (!allIntErr && allInterventions) {
      const hasCommunitySubmission = allInterventions.some((i: any) => i.users?.role === 'community' || i.users?.role === 'super_admin');
      const hasSchoolSubmission = allInterventions.some((i: any) => i.users?.role === 'school' || i.users?.role === 'teacher');

      const isIndependentSchool = !stage.community_id;
      const shouldCompleteStage = isIndependentSchool ? hasSchoolSubmission : (hasCommunitySubmission && hasSchoolSubmission);

      if (shouldCompleteStage) {
        const { error: stageUpdateErr } = await (supabase as any)
          .from("school_assessment_stages")
          .update({
            current_stage: "selesai",
            stage_updated_at: new Date().toISOString(),
          })
          .eq("id", payload.stageId);

        if (stageUpdateErr) {
          console.error("[submitInterventionAction] Gagal update stage ke selesai:", stageUpdateErr);
        }
      }
    }

    revalidatePath("/komunitas/intervensi");
    revalidatePath("/komunitas/dashboard");
    revalidatePath("/sekolah/intervensi");
    revalidatePath("/sekolah/dashboard");
    revalidatePath("/guru/intervensi");
    revalidatePath("/guru/dashboard");
    revalidatePath("/super-admin/intervensi");
    return { success: true, interventionId: newIntervention.id };
  } catch (err: any) {
    console.error("[submitInterventionAction]", err);
    return { success: false, error: err.message || "Terjadi kesalahan sistem." };
  }
}

/**
 * Ambil semua intervensi milik komunitas, join dengan data sekolah dan tag.
 * Digunakan oleh halaman daftar intervensi dan knowledge graph.
 */
export async function getInterventionsForCommunity(): Promise<{
  success: boolean;
  data?: InterventionRow[];
  error?: string;
}> {
  try {
    const communityId = await getCommunityIdFromHeader();
    if (!communityId) return { success: false, error: "Komunitas tidak teridentifikasi." };

    const supabase = await createServerClient();

    const { data, error } = await (supabase as any)
      .from("interventions")
      .select(`
        id, school_id, community_id, phase, stage_id,
        kondisi_awal, upaya_dilakukan, perubahan_signifikan, alasan_bermakna,
        submitted_by, created_at,
        schools(name, npsn),
        users!interventions_submitted_by_fkey(id, role),
        intervention_tag_links(
          intervention_tags(id, name)
        )
      `)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: (data || []) as InterventionRow[] };
  } catch (err: any) {
    console.error("[getInterventionsForCommunity]", err);
    return { success: false, error: err.message };
  }
}

/**
 * Bangun data graph untuk React Flow.
 * Node types: 'school', 'intervention', 'tag'
 * Edges: school→intervention, intervention→tag
 *
 * Filter: hanya intervensi milik komunitas yang login.
 */
export async function getInterventionGraph(): Promise<{
  success: boolean;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  error?: string;
}> {
  try {
    const result = await getInterventionsForCommunity();
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seenSchools = new Set<string>();
    const seenTags = new Set<string>();

    for (const intervention of result.data) {
      // Node sekolah (deduplicate)
      if (!seenSchools.has(intervention.school_id)) {
        nodes.push({
          id: `school_${intervention.school_id}`,
          type: "school",
          label: intervention.schools?.name ?? intervention.school_id,
          data: { school_id: intervention.school_id, npsn: intervention.schools?.npsn },
        });
        seenSchools.add(intervention.school_id);
      }

      // Node intervensi
      nodes.push({
        id: `intervention_${intervention.id}`,
        type: "intervention",
        label: `${intervention.phase} - ${intervention.schools?.name ?? ""}`,
        data: {
          phase: intervention.phase,
          created_at: intervention.created_at,
          kondisi_awal: intervention.kondisi_awal,
        },
      });

      // Edge: sekolah → intervensi
      edges.push({
        id: `e_school_intervention_${intervention.id}`,
        source: `school_${intervention.school_id}`,
        target: `intervention_${intervention.id}`,
      });

      // Node tag + edge intervensi → tag
      for (const link of intervention.intervention_tag_links ?? []) {
        const tag = link.intervention_tags;
        if (!seenTags.has(tag.id)) {
          nodes.push({
            id: `tag_${tag.id}`,
            type: "tag",
            label: tag.name,
            data: { tag_id: tag.id },
          });
          seenTags.add(tag.id);
        }
        edges.push({
          id: `e_intervention_tag_${intervention.id}_${tag.id}`,
          source: `intervention_${intervention.id}`,
          target: `tag_${tag.id}`,
          label: "tag",
        });
      }
    }

    return { success: true, nodes, edges };
  } catch (err: any) {
    console.error("[getInterventionGraph]", err);
    return { success: false, error: err.message };
  }
}

/**
 * Ambil semua tag yang tersedia (untuk combobox selector di form intervensi).
 */
export async function getAllInterventionTags(): Promise<{
  success: boolean;
  data?: { id: string; name: string }[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await (supabase as any)
      .from("intervention_tags")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) throw error;
    return { success: true, data: (data || []) as { id: string; name: string }[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * SUPER ADMIN: Ambil SEMUA data intervensi global tanpa filter komunitas.
 */
export async function getAllInterventionsGlobal(): Promise<{
  success: boolean;
  data?: InterventionRow[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await (supabase as any)
      .from("interventions")
      .select(`
        id, school_id, community_id, phase, stage_id,
        kondisi_awal, upaya_dilakukan, perubahan_signifikan, alasan_bermakna,
        submitted_by, created_at,
        schools(name, npsn),
        communities(name),
        users!interventions_submitted_by_fkey(id, role),
        intervention_tag_links(
          intervention_tags(id, name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: (data || []) as InterventionRow[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * SUPER ADMIN: Bangun data graph global untuk semua komunitas dan sekolah.
 */
export async function getGlobalInterventionGraph(): Promise<{
  success: boolean;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  error?: string;
}> {
  try {
    const result = await getAllInterventionsGlobal();
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seenCommunities = new Set<string>();
    const seenSchools = new Set<string>();
    const seenTags = new Set<string>();

    for (const intervention of result.data) {
      // Node Komunitas - type: 'community'
      if (intervention.community_id && !seenCommunities.has(intervention.community_id)) {
        nodes.push({
          id: `comm_${intervention.community_id}`,
          type: "community",  // Distinct type for proper graph styling
          label: (intervention as any).communities?.name || "Komunitas",
          data: { type: "community", community_id: intervention.community_id },
        });
        seenCommunities.add(intervention.community_id);
      }

      // Node Sekolah
      if (!seenSchools.has(intervention.school_id)) {
        nodes.push({
          id: `school_${intervention.school_id}`,
          type: "school",
          label: intervention.schools?.name ?? intervention.school_id,
          data: {
            school_id: intervention.school_id,
            npsn: intervention.schools?.npsn,
            is_independent: !intervention.community_id,
          },
        });
        seenSchools.add(intervention.school_id);

        // Edge: Komunitas → Sekolah (hanya jika punya komunitas)
        if (intervention.community_id) {
          edges.push({
            id: `e_comm_school_${intervention.community_id}_${intervention.school_id}`,
            source: `comm_${intervention.community_id}`,
            target: `school_${intervention.school_id}`,
          });
        }
      }

      // Node Intervensi - include all 4 narrative fields
      const submitterRole = (intervention as any).users?.role ?? "unknown";
      const isCommunitySubmitter = ["community", "super_admin"].includes(submitterRole);

      nodes.push({
        id: `intervention_${intervention.id}`,
        type: "intervention",
        label: `${intervention.phase} - ${intervention.schools?.name ?? ""}`,
        data: {
          phase: intervention.phase,
          created_at: intervention.created_at,
          kondisi_awal: intervention.kondisi_awal,
          upaya_dilakukan: intervention.upaya_dilakukan,
          perubahan_signifikan: intervention.perubahan_signifikan,
          alasan_bermakna: intervention.alasan_bermakna,
          submitter_role: submitterRole,
        },
      });

      // Edge asal intervensi:
      // - Jika komunitas yang submit dan ada community_id → dari komunitas
      // - Selainnya → dari sekolah
      if (isCommunitySubmitter && intervention.community_id) {
        edges.push({
          id: `e_comm_intervention_${intervention.id}`,
          source: `comm_${intervention.community_id}`,
          target: `intervention_${intervention.id}`,
        });
      } else {
        edges.push({
          id: `e_school_intervention_${intervention.id}`,
          source: `school_${intervention.school_id}`,
          target: `intervention_${intervention.id}`,
        });
      }

      // Node Tag + edge
      for (const link of intervention.intervention_tag_links ?? []) {
        const tag = link.intervention_tags;
        if (!seenTags.has(tag.id)) {
          nodes.push({
            id: `tag_${tag.id}`,
            type: "tag",
            label: tag.name,
            data: { tag_id: tag.id },
          });
          seenTags.add(tag.id);
        }
        edges.push({
          id: `e_intervention_tag_${intervention.id}_${tag.id}`,
          source: `intervention_${intervention.id}`,
          target: `tag_${tag.id}`,
        });
      }
    }

    return { success: true, nodes, edges };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * SEKOLAH: Ambil intervensi khusus untuk 1 sekolah tertentu.
 */
export async function getInterventionsForSchool(schoolId: string): Promise<{
  success: boolean;
  data?: InterventionRow[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await (supabase as any)
      .from("interventions")
      .select(`
        id, school_id, community_id, phase, stage_id,
        kondisi_awal, upaya_dilakukan, perubahan_signifikan, alasan_bermakna,
        submitted_by, created_at,
        schools(name, npsn),
        communities(name),
        users!interventions_submitted_by_fkey(id, role),
        intervention_tag_links(
          intervention_tags(id, name)
        )
      `)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: (data || []) as InterventionRow[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * SEKOLAH: Graph intervensi untuk 1 sekolah.
 */
export async function getSchoolInterventionGraph(schoolId: string): Promise<{
  success: boolean;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  error?: string;
}> {
  try {
    const res = await getInterventionsForSchool(schoolId);
    if (!res.success || !res.data) return { success: false, error: res.error };

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seenTags = new Set<string>();

    if (res.data.length > 0) {
      const sch = res.data[0].schools;
      nodes.push({
        id: `school_${schoolId}`,
        type: "school",
        label: sch?.name || "Sekolah Saya",
        data: { school_id: schoolId, npsn: sch?.npsn },
      });
    }

    for (const intervention of res.data) {
      nodes.push({
        id: `intervention_${intervention.id}`,
        type: "intervention",
        label: `${intervention.phase} (${new Date(intervention.created_at).toLocaleDateString("id-ID")})`,
        data: {
          phase: intervention.phase,
          created_at: intervention.created_at,
          kondisi_awal: intervention.kondisi_awal,
          upaya_dilakukan: intervention.upaya_dilakukan,
          perubahan_signifikan: intervention.perubahan_signifikan,
          alasan_bermakna: intervention.alasan_bermakna,
        },
      });

      edges.push({
        id: `e_school_intervention_${intervention.id}`,
        source: `school_${schoolId}`,
        target: `intervention_${intervention.id}`,
      });

      for (const link of intervention.intervention_tag_links ?? []) {
        const tag = link.intervention_tags;
        if (!seenTags.has(tag.id)) {
          nodes.push({
            id: `tag_${tag.id}`,
            type: "tag",
            label: tag.name,
            data: { tag_id: tag.id },
          });
          seenTags.add(tag.id);
        }
        edges.push({
          id: `e_intervention_tag_${intervention.id}_${tag.id}`,
          source: `intervention_${intervention.id}`,
          target: `tag_${tag.id}`,
          label: "tag",
        });
      }
    }

    return { success: true, nodes, edges };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
