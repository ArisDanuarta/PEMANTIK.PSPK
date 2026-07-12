"use server";

import { createServerClient } from "@pemantik/supabase";
import { getSystemSettings } from "./settings";
import { getAllInterventionsGlobal } from "./interventions";
import { GoogleGenAI, Type } from "@google/genai";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function checkAiKnowledgeGraphStatus() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("ai_analysis_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error && error.code !== 'PGRST116') {
      console.error("[checkAiKnowledgeGraphStatus]", error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateAiKnowledgeGraph() {
  let jobId: string | null = null;
  
  try {
    const supabase = await createServerClient();
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    
    // 1. Create Job record
    const { data: job, error: jobErr } = await (supabase as any)
      .from("ai_analysis_jobs")
      .insert({
        status: "processing",
        requested_by: userId,
      })
      .select("id")
      .single();
      
    if (jobErr) throw jobErr;
    jobId = job.id;
    
    // 2. Fetch Gemini API Key
    const settings = await getSystemSettings();
    if (!settings.success || !settings.data?.gemini_api_key) {
      throw new Error("Gemini API Key belum dikonfigurasi di Pengaturan.");
    }
    const apiKey = settings.data.gemini_api_key;
    
    // 3. Fetch Raw Data
    const rawRes = await getAllInterventionsGlobal();
    if (!rawRes.success) {
      throw new Error("Gagal mengambil data intervensi: " + rawRes.error);
    }
    const interventions = rawRes.data || [];
    if (interventions.length === 0) {
      throw new Error("Tidak ada data intervensi untuk dianalisis.");
    }
    
    // Format data for prompt
    const textData = interventions.map((item, index) => {
      const tags = (item.intervention_tag_links || []).map((t: any) => t.intervention_tags?.name).join(", ");
      return `
[Laporan ${index + 1}]
Kondisi Awal: ${item.kondisi_awal}
Upaya Dilakukan: ${item.upaya_dilakukan}
Perubahan Signifikan: ${item.perubahan_signifikan}
Alasan Bermakna: ${item.alasan_bermakna}
Tags: ${tags}
`;
    }).join("\n---\n");

    // 4. Call Gemini API
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Anda adalah ahli sistem pendidikan dan analis data kualitatif.
Diberikan narasi kualitatif intervensi sekolah (kondisi, upaya, hasil).
Tugas Anda adalah membuat Knowledge Graph tingkat makro. 
Kelompokkan/klasterisasi data tersebut ke dalam Node (masalah utama, solusi, hasil akhir) dan Edge (hubungan sebab-akibat antar Node).
Buatlah ringkas, simpulkan ke dalam maksimal 15 node makro.

DATA INTERVENSI:
${textData}`;

    const response = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["id", "label", "type", "description"]
              }
            },
            edges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source_node_id: { type: Type.STRING },
                  target_node_id: { type: Type.STRING },
                  label: { type: Type.STRING }
                },
                required: ["source_node_id", "target_node_id", "label"]
              }
            }
          },
          required: ["nodes", "edges"]
        }
      }
    });

    const responseText = response.output_text || "{}";
    
    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(responseText.trim());
    } catch (e) {
      // Fallback cleanup if model still returns markdown despite responseMimeType
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }
    
    if (!parsed.nodes || !parsed.edges) {
      throw new Error("Format JSON balasan AI tidak sesuai ekspektasi.");
    }
    
    // 5. Insert into DB
    const nodesToInsert = parsed.nodes.map((n: any) => ({
      id: n.id,
      job_id: jobId,
      type: n.type || "theme",
      label: n.label || "Tanpa Label",
      description: n.description || "",
    }));
    
    const edgesToInsert = parsed.edges.map((e: any) => ({
      job_id: jobId,
      source_node_id: e.source_node_id,
      target_node_id: e.target_node_id,
      label: e.label || "",
    }));
    
    if (nodesToInsert.length > 0) {
      const { error: nodeErr } = await (supabase as any).from("ai_knowledge_nodes").insert(nodesToInsert);
      if (nodeErr) throw nodeErr;
    }
    
    if (edgesToInsert.length > 0) {
      // Validate edges exist in nodes
      const validNodeIds = new Set(nodesToInsert.map((n: any) => n.id));
      const validEdges = edgesToInsert.filter((e: any) => validNodeIds.has(e.source_node_id) && validNodeIds.has(e.target_node_id));
      if (validEdges.length > 0) {
        const { error: edgeErr } = await (supabase as any).from("ai_knowledge_edges").insert(validEdges);
        if (edgeErr) throw edgeErr;
      }
    }
    
    // Update Job to completed
    await (supabase as any).from("ai_analysis_jobs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);
    
    revalidatePath("/super-admin/intervensi");
    return { success: true };
    
  } catch (err: any) {
    console.error("[generateAiKnowledgeGraph]", err);
    if (jobId) {
      const supabase = await createServerClient();
      await (supabase as any).from("ai_analysis_jobs").update({
        status: "failed",
        error_message: err.message || "Unknown error",
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    }
    return { success: false, error: err.message };
  }
}

export async function getLatestAiKnowledgeGraph() {
  try {
    const supabase = await createServerClient();
    
    const { data: job, error: jobErr } = await (supabase as any)
      .from("ai_analysis_jobs")
      .select("id, status, created_at, completed_at, error_message")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (jobErr) throw jobErr;
    if (!job) return { success: true, nodes: [], edges: [], job: null };
    
    const { data: nodes, error: nodesErr } = await (supabase as any)
      .from("ai_knowledge_nodes")
      .select("*")
      .eq("job_id", job.id);
      
    if (nodesErr) throw nodesErr;
    
    const { data: edges, error: edgesErr } = await (supabase as any)
      .from("ai_knowledge_edges")
      .select("*")
      .eq("job_id", job.id);
      
    if (edgesErr) throw edgesErr;
    
    return { success: true, nodes: nodes || [], edges: edges || [], job };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveGeminiApiKeyAction(apiKey: string) {
  try {
    const { updateSystemSettings } = await import("./settings");
    const settingsRes = await getSystemSettings();
    const current = settingsRes.data || {
      system_name: "Platform Asesmen Pemantik",
      session_timeout: 60,
      maintenance_mode: false,
      maintenance_message: "Sistem sedang dalam perbaikan rutin."
    };
    
    // We update settings.ts to accept gemini_api_key
    const supabase = await createServerClient();
    const { error } = await (supabase as any).from("system_settings").upsert({
      id: 1,
      ...current,
      gemini_api_key: apiKey,
      updated_at: new Date().toISOString(),
    });
    
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addManualKnowledgeNodeAction(jobId: string, label: string, type: string, description: string) {
  try {
    const supabase = await createServerClient();
    const id = "manual_node_" + Date.now();
    const { error } = await (supabase as any).from("ai_knowledge_nodes").insert({
      id,
      job_id: jobId,
      type,
      label,
      description
    });
    if (error) throw error;
    revalidatePath("/super-admin/intervensi");
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addManualKnowledgeEdgeAction(jobId: string, source_node_id: string, target_node_id: string, label: string) {
  try {
    const supabase = await createServerClient();
    const { error } = await (supabase as any).from("ai_knowledge_edges").insert({
      job_id: jobId,
      source_node_id,
      target_node_id,
      label
    });
    if (error) throw error;
    revalidatePath("/super-admin/intervensi");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createEmptyAiJobAction() {
  try {
    const supabase = await createServerClient();
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const { data: job, error } = await (supabase as any).from("ai_analysis_jobs").insert({
      status: "completed",
      requested_by: userId,
    }).select("id").single();
    if (error) throw error;
    revalidatePath("/super-admin/intervensi");
    return { success: true, id: job.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}



