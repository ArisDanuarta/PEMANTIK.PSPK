import React from 'react';
import AssessmentForm from './AssessmentForm';
import { getStudentSession } from '../../../actions/studentAuth';
import { redirect } from 'next/navigation';
import { createServerClient } from '@pemantik/supabase';

export const metadata = {
  title: 'Pengerjaan Asesmen - Pemantik',
  description: 'Halaman pengerjaan soal asesmen siswa.',
};

export default async function AssessmentExecutionPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ sessionId: string }>,
  searchParams: Promise<{ level?: string }>
}) {
  const { sessionId } = await params;
  const sessionUser = await getStudentSession();
  
  if (!sessionUser) {
    redirect('/siswa/login');
  }

  const supabase = createServerClient();

  // 1. Fetch Session
  const { data: session } = await supabase
    .from('assessment_sessions')
    .select('*, question_levels!assessment_sessions_level_id_fkey(*, question_categories(*))')
    .eq('id', sessionId)
    .single();

  if (!session) {
    redirect('/siswa/dashboard');
  }

  // Jika sudah selesai, arahkan ke hasil
  if (session.status === 'completed') {
    redirect(`/siswa/asesmen/${sessionId}/hasil`);
  }

  // 2. Fetch Questions
  // NOTE: `options` is a JSONB column on the `questions` table itself - there is NO separate question_options table.
  // Both `level_id` fields are checked since the session schema has both current_level_id and level_id.
  const levelId = (session as any).level_id || (session as any).current_level_id;
  
  console.log('[Assessment] sessionId:', sessionId);
  console.log('[Assessment] session.level_id:', (session as any).level_id);
  console.log('[Assessment] session.current_level_id:', (session as any).current_level_id);
  console.log('[Assessment] resolved levelId:', levelId);

  let questions: any[] = [];
  if (levelId) {
    const { data: qs, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_type, question_text, question_audio_url, question_video_url, question_image_url, question_instruction, options, level_id, correct_answer')
      .eq('level_id', levelId)
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('[Assessment] Failed to fetch questions:', questionsError.message);
    } else {
      questions = (qs || []).map((q: any) => {
        const sanitized = { ...(q as Record<string, any>) };
        if (sanitized.question_type === 'voice_recording' && sanitized.correct_answer) {
          sanitized.target_text = sanitized.correct_answer.target_text;
        }
        delete sanitized.correct_answer;
        return sanitized;
      });
    }
  } else {
    console.error('[Assessment] level_id is null/undefined - cannot fetch questions!');
  }

  // 3. Fetch Existing Answers
  const { data: answers } = await supabase
    .from('student_answers')
    .select('*')
    .eq('session_id', sessionId);

  return (
    <AssessmentForm 
      sessionId={sessionId} 
      levelData={session.question_levels}
      categoryData={(session.question_levels as any)?.question_categories}
      questions={questions}
      initialAnswers={answers || []}
      session={session}
    />
  );
}
