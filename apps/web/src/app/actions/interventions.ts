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

    // Ambil semua guru aktif di sekolah ini
    const { data: activeTeachers } = await (supabase as any)
      .from("users")
      .select("id")
      .eq("school_id", payload.schoolId)
      .eq("role", "teacher")
      .eq("is_active", true);

    const requiredTeacherIds = (activeTeachers || []).map((t: any) => t.id);

    if (!allIntErr && allInterventions) {
      const isIndependentSchool = !stage.community_id;

      // Cek apakah ada perwakilan komunitas / super_admin yang submit (untuk sekolah binaan)
      const hasCommunitySubmission = allInterventions.some(
        (i: any) => i.users?.role === "community" || i.users?.role === "super_admin"
      );
      
      // Cek apakah ada perwakilan sekolah (admin sekolah) yang submit
      const hasSchoolSubmission = allInterventions.some(
        (i: any) => i.users?.role === "school" || i.users?.role === "super_admin"
      );

      // Cek apakah SEMUA guru aktif sudah submit
      const submittedTeacherIds = allInterventions
        .filter((i: any) => i.users?.role === "teacher")
        .map((i: any) => i.submitted_by);
      
      const allTeachersSubmitted = requiredTeacherIds.length === 0
        ? true
        : requiredTeacherIds.every((tid: string) => submittedTeacherIds.includes(tid));

      let shouldCompleteStage = false;

      if (isIndependentSchool) {
        // Sekolah Independen: Wajib isi form (Sekolah) + Semua Guru aktif wajib isi
        shouldCompleteStage = hasSchoolSubmission && allTeachersSubmitted;
      } else {
        // Sekolah Binaan: Wajib isi form (Komunitas) + Wajib isi form (Sekolah) + Semua Guru aktif wajib isi
        shouldCompleteStage = hasCommunitySubmission && hasSchoolSubmission && allTeachersSubmitted;
      }

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

/**
 * Cek progress pengisian intervensi (berapa yang sudah mengisi / berapa yang wajib).
 */
export async function getInterventionProgress(stageId: string, schoolId: string, isIndependentSchool: boolean): Promise<{
  success: boolean;
  submittedCount?: number;
  requiredCount?: number;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    // 1. Ambil semua intervensi untuk stage ini
    const { data: allInterventions, error: allIntErr } = await (supabase as any)
      .from("interventions")
      .select("id, submitted_by, users(id, role)")
      .eq("stage_id", stageId);

    if (allIntErr) throw allIntErr;

    // 2. Ambil semua guru aktif di sekolah ini
    const { data: activeTeachers } = await (supabase as any)
      .from("users")
      .select("id")
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .eq("is_active", true);

    const requiredTeacherIds = (activeTeachers || []).map((t: any) => t.id);
    
    let requiredCount = requiredTeacherIds.length;
    let submittedCount = 0;

    const hasCommunitySubmission = (allInterventions || []).some(
      (i: any) => i.users?.role === "community" || i.users?.role === "super_admin"
    );
    const hasSchoolSubmission = (allInterventions || []).some(
      (i: any) => i.users?.role === "school" || i.users?.role === "super_admin"
    );

    const submittedTeacherIds = (allInterventions || [])
      .filter((i: any) => i.users?.role === "teacher")
      .map((i: any) => i.submitted_by);
      
    // Hitung guru yang sudah submit (distinct)
    const uniqueSubmittedTeachers = new Set(submittedTeacherIds);
    submittedCount += uniqueSubmittedTeachers.size;

    // Tambahkan mandatory admin submissions ke required & submitted
    if (isIndependentSchool) {
      requiredCount += 1; // Admin sekolah
      if (hasSchoolSubmission) submittedCount += 1;
    } else {
      requiredCount += 2; // Admin sekolah + admin komunitas
      if (hasSchoolSubmission) submittedCount += 1;
      if (hasCommunitySubmission) submittedCount += 1;
    }

    return { success: true, submittedCount, requiredCount };
  } catch (err: any) {
    console.error("[getInterventionProgress]", err);
    return { success: false, error: err.message };
  }
}


// ─── Types untuk Cluster Overview (OECD-style) ─────────────────────────────

export interface TagCluster {
  tagId: string;
  tagName: string;
  count: number;
  /** Hanya sample untuk render dot di blob, bukan full payload narasi */
  sampleInterventionIds: string[];
}

export interface CrossTagLink {
  tagIdA: string;
  tagIdB: string;
  /** Berapa banyak intervensi yang share kedua tag ini (ketebalan garis dashed) */
  sharedCount: number;
}

// ─── getInterventionTagOverview ─────────────────────────────────────────────
/**
 * Ambil data AGREGAT saja (bukan payload penuh) untuk membangun Level-0
 * "blob overview" ala OECD Education GPS.
 *
 * Query ini HANYA menyentuh intervention_tag_links (tabel junction ringan),
 * tidak menarik kolom narasi (kondisi_awal, upaya_dilakukan, dst) yang berat.
 *
 * Scope mengikuti role pemanggil:
 * - super_admin -> semua data (global)
 * - community   -> hanya intervensi milik komunitas tsb
 * - school/teacher -> hanya intervensi milik sekolah tsb
 */
export async function getInterventionTagOverview(): Promise<{
  success: boolean;
  clusters?: TagCluster[];
  crossLinks?: CrossTagLink[];
  totalInterventions?: number;
  error?: string;
}> {
  try {
    const headersList = await headers();
    const userRole = headersList.get("x-user-role");
    const communityId = headersList.get("x-community-id");
    const schoolId = headersList.get("x-school-id");

    const supabase = await createServerClient();

    // Base query: tag_links join ke interventions (untuk filter scope)
    // dan join ke intervention_tags (untuk nama tag).
    let query = (supabase as any)
      .from("intervention_tag_links")
      .select(
        `
        intervention_id,
        intervention_tags(id, name),
        interventions!inner(id, school_id, community_id)
      `,
      );

    if (userRole === "community" && communityId) {
      query = query.eq("interventions.community_id", communityId);
    } else if ((userRole === "school" || userRole === "teacher") && schoolId) {
      query = query.eq("interventions.school_id", schoolId);
    }
    // super_admin: tanpa filter tambahan (global)

    const { data, error } = await query;
    if (error) throw error;

    const byTag = new Map<string, TagCluster>();
    const byIntervention = new Map<string, Set<string>>(); // interventionId -> Set<tagId>
    const allInterventionIds = new Set<string>();

    for (const row of data || []) {
      const tag = row.intervention_tags;
      const interventionId = row.intervention_id;
      if (!tag) continue;

      allInterventionIds.add(interventionId);

      if (!byTag.has(tag.id)) {
        byTag.set(tag.id, {
          tagId: tag.id,
          tagName: tag.name,
          count: 0,
          sampleInterventionIds: [],
        });
      }
      const cluster = byTag.get(tag.id)!;
      cluster.count++;
      if (cluster.sampleInterventionIds.length < 40) {
        cluster.sampleInterventionIds.push(interventionId);
      }

      if (!byIntervention.has(interventionId)) {
        byIntervention.set(interventionId, new Set());
      }
      byIntervention.get(interventionId)!.add(tag.id);
    }

    // Bangun cross-tag links: intervensi dengan 2+ tag menghasilkan garis
    // dashed antar hub tag (persis pola dashed line di OECD Education GPS).
    const crossLinkMap = new Map<string, CrossTagLink>();
    for (const tagIds of byIntervention.values()) {
      const arr = [...tagIds];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const [a, b] = [arr[i], arr[j]].sort();
          const key = `${a}__${b}`;
          if (!crossLinkMap.has(key)) {
            crossLinkMap.set(key, { tagIdA: a, tagIdB: b, sharedCount: 0 });
          }
          crossLinkMap.get(key)!.sharedCount++;
        }
      }
    }

    return {
      success: true,
      clusters: [...byTag.values()].sort((a, b) => b.count - a.count),
      crossLinks: [...crossLinkMap.values()],
      totalInterventions: allInterventionIds.size,
    };
  } catch (err: any) {
    console.error("[getInterventionTagOverview]", err);
    return { success: false, error: err.message };
  }
}

// ─── getInterventionGraphByTag ──────────────────────────────────────────────
/**
 * Level-1 drilldown: subgraph LENGKAP (dengan narasi) tapi HANYA untuk
 * intervensi yang membawa 1 tag tertentu. Ini yang dipanggil saat user
 * klik satu blob di overview - bukan saat page pertama load.
 *
 * Reuse struktur GraphNode/GraphEdge yang sama dengan getGlobalInterventionGraph
 * supaya bisa langsung dirender lewat komponen InterventionGraph.tsx yang
 * sudah ada (React Flow + d3-force), tanpa perlu komponen render baru.
 */
export async function getInterventionGraphByTag(tagId: string): Promise<{
  success: boolean;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  error?: string;
}> {
  try {
    if (!tagId) return { success: false, error: "tagId wajib diisi." };

    const headersList = await headers();
    const userRole = headersList.get("x-user-role");
    const communityId = headersList.get("x-community-id");
    const schoolId = headersList.get("x-school-id");

    const supabase = await createServerClient();

    let query = (supabase as any)
      .from("interventions")
      .select(
        `
        id, school_id, community_id, phase, stage_id,
        kondisi_awal, upaya_dilakukan, perubahan_signifikan, alasan_bermakna,
        submitted_by, created_at,
        schools(name, npsn),
        communities(name),
        users!interventions_submitted_by_fkey(id, role),
        intervention_tag_links!inner(tag_id, intervention_tags(id, name))
      `,
      )
      .eq("intervention_tag_links.tag_id", tagId)
      .order("created_at", { ascending: false });

    if (userRole === "community" && communityId) {
      query = query.eq("community_id", communityId);
    } else if ((userRole === "school" || userRole === "teacher") && schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // NOTE: karena filter di atas hanya menjamin tag_id = tagId untuk baris
    // intervention_tag_links yang dipakai join, kita perlu ambil SEMUA tag
    // milik tiap intervensi (bukan cuma tagId) supaya node tag lain yang
    // relevan tetap muncul di subgraph. Query kedua yang ringan:
    const interventionIds = (data || []).map((iv: any) => iv.id);
    let allTagLinksByIntervention = new Map<string, { id: string; name: string }[]>();

    if (interventionIds.length > 0) {
      const { data: allLinks } = await (supabase as any)
        .from("intervention_tag_links")
        .select("intervention_id, intervention_tags(id, name)")
        .in("intervention_id", interventionIds);

      for (const link of allLinks || []) {
        const arr = allTagLinksByIntervention.get(link.intervention_id) || [];
        arr.push(link.intervention_tags);
        allTagLinksByIntervention.set(link.intervention_id, arr);
      }
    }

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seenSchools = new Set<string>();
    const seenCommunities = new Set<string>();
    const seenTags = new Set<string>();

    for (const intervention of data || []) {
      if (intervention.community_id && !seenCommunities.has(intervention.community_id)) {
        nodes.push({
          id: `comm_${intervention.community_id}`,
          type: "community",
          label: intervention.communities?.name || "Komunitas",
          data: { community_id: intervention.community_id },
        });
        seenCommunities.add(intervention.community_id);
      }

      if (!seenSchools.has(intervention.school_id)) {
        nodes.push({
          id: `school_${intervention.school_id}`,
          type: "school",
          label: intervention.schools?.name ?? intervention.school_id,
          data: { school_id: intervention.school_id, npsn: intervention.schools?.npsn },
        });
        seenSchools.add(intervention.school_id);

        if (intervention.community_id) {
          edges.push({
            id: `e_comm_school_${intervention.community_id}_${intervention.school_id}`,
            source: `comm_${intervention.community_id}`,
            target: `school_${intervention.school_id}`,
          });
        }
      }

      const submitterRole = intervention.users?.role ?? "unknown";
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

      // Semua tag milik intervensi ini (bukan cuma tagId yang di-drilldown)
      const tagsForThisIntervention = allTagLinksByIntervention.get(intervention.id) || [];
      for (const tag of tagsForThisIntervention) {
        if (!tag) continue;
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
    console.error("[getInterventionGraphByTag]", err);
    return { success: false, error: err.message };
  }
}
