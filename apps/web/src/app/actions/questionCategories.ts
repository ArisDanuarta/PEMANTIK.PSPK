"use server";

import { createServerClient } from "@pemantik/supabase";

export async function getQuestionCategories(subjectArea?: string) {
  try {
    const supabase = await createServerClient();
    let query = supabase.from("question_categories" as any).select("*").order("name");
    
    if (subjectArea) {
      query = query.eq("subject_area", subjectArea);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return { success: true, data: data as any };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getQuestionLevels(categoryId: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("question_levels" as any)
      .select("*")
      .eq("category_id", categoryId)
      .order("level_number");
      
    if (error) throw error;
    
    return { success: true, data: data as any };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createQuestionCategory(subjectArea: string, name: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("question_categories" as any)
      .insert({ subject_area: subjectArea, name })
      .select()
      .single();
      
    if (error) throw error;
    
    return { success: true, data: data as any };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateQuestionCategory(id: string, name: string) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("question_categories" as any)
      .update({ name })
      .eq("id", id);
      
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteQuestionCategory(id: string) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("question_categories" as any)
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createQuestionLevel(
  categoryId: string,
  levelNumber: number,
  timeLimitSec: number,
  passingThreshold: number,
  accessCode?: string,
  learningObjective?: string,
  successMessage?: string,
  failureMessage?: string
) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("question_levels" as any)
      .insert({
        category_id: categoryId,
        level_number: levelNumber,
        time_limit_sec: timeLimitSec,
        passing_threshold: passingThreshold,
        access_code: accessCode || null,
        learning_objective: learningObjective || null,
        success_message: successMessage || null,
        failure_message: failureMessage || null
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return { success: true, data: data as any };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateQuestionLevel(
  id: string,
  levelNumber: number,
  timeLimitSec: number,
  passingThreshold: number,
  accessCode?: string,
  learningObjective?: string,
  successMessage?: string,
  failureMessage?: string
) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("question_levels" as any)
      .update({
        level_number: levelNumber,
        time_limit_sec: timeLimitSec,
        passing_threshold: passingThreshold,
        access_code: accessCode || null,
        learning_objective: learningObjective || null,
        success_message: successMessage || null,
        failure_message: failureMessage || null
      })
      .eq("id", id);
      
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteQuestionLevel(id: string) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("question_levels" as any)
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
