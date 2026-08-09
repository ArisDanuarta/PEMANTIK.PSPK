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
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('level_id', session.level_id!)
    .order('order_index', { ascending: true });

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
      questions={questions || []}
      initialAnswers={answers || []}
      session={session}
    />
  );
}
