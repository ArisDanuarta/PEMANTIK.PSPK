"use server";

import { createServerClient } from "@pemantik/supabase";

export async function getQuestionStats() {
  try {
    const supabase = await createServerClient();
    
    const { count: literasi, error: err1 } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("subject_area", "literasi");
      
    const { count: numerasi, error: err2 } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("subject_area", "numerasi");
      
    const { count: published, error: err3 } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true);

    const { count: draft, error: err4 } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("is_published", false);

    if (err1 || err2 || err3 || err4) throw new Error("Gagal mengambil statistik");

    return {
      success: true,
      data: {
        totalLiterasi: literasi || 0,
        totalNumerasi: numerasi || 0,
        totalPublished: published || 0,
        totalDraft: draft || 0,
        total: (literasi || 0) + (numerasi || 0)
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getQuestions(page = 1, limit = 10, filters?: any) {
  try {
    const supabase = await createServerClient();
    
    let query = supabase
      .from("questions")
      .select("*, question_levels(*, question_categories(*))", { count: "exact" });

    if (filters?.levelId) {
      query = query.order("order_index", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    if (filters?.subject) query = query.eq("subject_area", filters.subject);
    if (filters?.type) query = query.eq("question_type", filters.type);
    if (filters?.levelId) query = (query as any).eq("level_id", filters.levelId);
    if (filters?.status === "published") query = query.eq("is_published", true);
    if (filters?.status === "draft") query = query.eq("is_published", false);
    if (filters?.search) query = query.ilike("question_text", `%${filters.search}%`);

    const { data, count, error } = await query;

    if (error) throw error;

    return { success: true, data: data as any, count };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function getQuestionById(id: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("questions")
      .select("*, question_levels(*, question_categories(*))")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { success: true, data: data as any };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createQuestion(questionData: any) {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    
    if (!token) throw new Error("Not authenticated");

    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const payload = {
      ...questionData,
      created_by: user.id
    };

    const { data, error } = await admin
      .from("questions")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateQuestion(id: string, questionData: any) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("questions")
      .update(questionData)
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteQuestion(id: string) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function bulkDeleteQuestions(ids: string[]) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("questions")
      .delete()
      .in("id", ids);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateQuestionOrders(updates: { id: string; order_index: number }[]) {
  try {
    const supabase = await createServerClient();
    // Using upsert or individual updates. Since Supabase client doesn't have a batch update 
    // other than upsert (which needs all columns or default handling), we'll do promise.all for now.
    const promises = updates.map(u => 
      supabase.from("questions").update({ order_index: u.order_index }).eq("id", u.id)
    );
    
    await Promise.all(promises);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function uploadQuestionMedia(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("File tidak ditemukan");

    // We must use the admin client to verify the user token if it's sent from a Server Action
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;

    if (!token) throw new Error("Not authenticated");

    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await admin.storage
      .from("question_media")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = admin.storage
      .from("question_media")
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
