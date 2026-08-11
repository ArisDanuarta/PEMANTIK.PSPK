'use server';

import { createServerClient } from "@pemantik/supabase";
import { redirect } from "next/navigation";

export async function startAssessmentSession(levelId: string, categoryId: string, student: any, password?: string) {
  const supabase = createServerClient();
  const sessionId = crypto.randomUUID();

  // Validasi password jika level memiliki access_code
  const { data: level } = await supabase.from('question_levels').select('access_code').eq('id', levelId).single();
  
  if (level?.access_code) {
    if (password !== level.access_code) {
      return { success: false, error: 'Password yang Anda masukkan salah.' };
    }
  }

  // 1. Get access phase and id
  const targetIds = [student.id];
  if (student.class_id) targetIds.push(student.class_id);
  if (student.school_id) targetIds.push(student.school_id);
  if (student.schools?.community_id) targetIds.push(student.schools.community_id);

  const { data: accessData } = await supabase
    .from('assessment_access')
    .select('id, phase')
    .eq('category_id', categoryId)
    .in('target_id', targetIds)
    .eq('is_active', true)
    .limit(1)
    .single();

  const phase = accessData?.phase || 'Tahap 1';
  const accessId = accessData?.id || null;

  // 2. Hitung attempt number berdasarkan session sebelumnya
  const { count: previousAttempts } = await supabase
    .from('assessment_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', student.id)
    .eq('level_id', levelId)
    .eq('phase', phase);
  
  const attemptNumber = (previousAttempts || 0) + 1;

  // 3. Buat sesi di Supabase
  const { error } = await supabase.from('assessment_sessions').insert({
    id: sessionId,
    student_id: student.id,
    school_id: student.school_id,
    category_id: categoryId,
    level_id: levelId,
    status: 'pending',
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    access_id: accessId,
    current_level_id: levelId,
    phase: phase,
    attempt_number: attemptNumber,
  });

  if (error) {
    console.error("Gagal membuat sesi asesmen:", error);
    return { success: false, error: "Gagal membuat sesi asesmen." };
  }

  redirect(`/siswa/asesmen/${sessionId}`);
}

export async function submitAssessmentSession(sessionId: string, currentLevelId: string) {
  const supabase = createServerClient();
  
  // Panggil RPC advance_student_level untuk menilai ujian
  const { data, error } = await supabase.rpc('advance_student_level', {
    p_session_id: sessionId,
    p_current_level_id: currentLevelId,
  });

  if (error) {
    console.error("Gagal mengirim hasil asesmen:", error);
    throw new Error("Gagal menyimpan hasil asesmen.");
  }

  // Redirect ke halaman hasil
  redirect(`/siswa/asesmen/${sessionId}/hasil`);
}

export async function saveStudentAnswer(sessionId: string, questionId: string, answerData: any) {
  const supabase = createServerClient();
  
  // Upsert jawaban
  const { error } = await supabase.from('student_answers').upsert({
    session_id: sessionId,
    question_id: questionId,
    answer_data: answerData,
    status: 'answered',
    sync_status: 'synced',
    answered_at: new Date().toISOString(),
  }, {
    onConflict: 'session_id,question_id'
  });

  if (error) {
    console.error("Gagal menyimpan jawaban:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
