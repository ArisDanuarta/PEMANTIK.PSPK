'use server';

import { createServerClient } from "@pemantik/supabase";
import { getStudentSession } from "./studentAuth";
import { revalidatePath } from "next/cache";

export async function updateStudentProfile(formData: FormData) {
  const userSession = await getStudentSession();
  if (!userSession) throw new Error("Unauthorized");

  const studentId = userSession.student.id;
  const supabase = createServerClient();

  // Extract fields from formData
  const updates: Record<string, any> = {
    full_name: formData.get('full_name'),
    gender: formData.get('gender'),
    birth_date: formData.get('birth_date') || null,
    father_occupation_id: formData.get('father_occupation_id') || null,
    father_education_id: formData.get('father_education_id') || null,
    mother_occupation_id: formData.get('mother_occupation_id') || null,
    mother_education_id: formData.get('mother_education_id') || null,
    province: formData.get('province'),
    city: formData.get('city'),
    district: formData.get('district'),
    village: formData.get('village'),
  };

  // Remove undefined or null values if we don't want to overwrite them
  Object.keys(updates).forEach(key => {
    if (updates[key] === undefined) {
      delete updates[key];
    }
  });

  const { error } = await supabase
    .from('students')
    .update(updates as any)
    .eq('id', studentId);

  if (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/siswa/profil');
  return { success: true };
}
