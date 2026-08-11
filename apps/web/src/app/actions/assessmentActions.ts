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

// Fungsi pembantu untuk Voice Recording
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateSimilarity(actual: string, target: string): number {
  const a = actual.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (t.length === 0) return 0;
  const distance = levenshteinDistance(a, t);
  const maxLen = Math.max(a.length, t.length);
  if (maxLen === 0) return 100;
  return ((maxLen - distance) / maxLen) * 100;
}

export async function submitAssessmentSession(sessionId: string, currentLevelId: string, timeSpentSec?: number) {
  const supabase = createServerClient();
  
  if (timeSpentSec !== undefined) {
    await supabase.from('assessment_sessions').update({ time_spent_sec: timeSpentSec }).eq('id', sessionId);
  }
  
  // Panggil RPC advance_student_level untuk menilai ujian
  const { data, error } = await supabase.rpc('advance_student_level', {
    p_session_id: sessionId,
    p_current_level_id: currentLevelId,
  });

  if (error) {
    console.error("Gagal mengirim hasil asesmen:", error);
    return { success: false, error: "Gagal menyimpan hasil asesmen." };
  }

  return { success: true };
}

export async function saveStudentAnswer(sessionId: string, questionId: string, answerData: any) {
  const supabase = createServerClient();
  
  // 1. Fetch question info to evaluate correctness
  const { data: qData } = await supabase.from('questions').select('question_type, correct_answer').eq('id', questionId).single();
  
  let is_correct: boolean | null = null;
  if (qData && qData.correct_answer !== null && qData.correct_answer !== undefined) {
    const qt = qData.question_type;
    const ca = qData.correct_answer;
    
    if (qt === 'voice_recording') {
      // Evaluasi menggunakan Levenshtein distance (mencocokkan transkripsi dengan target_text)
      if (typeof answerData === 'string' && (ca as any).target_text) {
        const similarity = calculateSimilarity(answerData, (ca as any).target_text);
        const threshold = (ca as any).threshold_pct ?? 80;
        is_correct = similarity >= threshold;
      } else {
        is_correct = false;
      }
    } else if (qt === 'drag_drop') {
      const isMatching = Array.isArray((ca as any).pairs);
      const targetOrder = isMatching ? (ca as any).pairs.map((p: any) => p.id) : (ca as any).order;
      is_correct = JSON.stringify(answerData) === JSON.stringify(targetOrder);
    } else if (qt === 'image_choice') {
      is_correct = (answerData === (ca as any).url);
    } else {
      // multiple_choice, audio_question, video_question
      is_correct = (answerData === ca);
    }
  }

  // 2. Upsert jawaban
  const { error } = await supabase.from('student_answers').upsert({
    session_id: sessionId,
    question_id: questionId,
    answer_data: answerData,
    is_correct: is_correct,
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
