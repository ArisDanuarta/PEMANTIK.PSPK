import React from 'react';
import StudentLayout from '../../../../components/siswa/StudentLayout';
import { getStudentSession } from '../../../actions/studentAuth';
import { redirect } from 'next/navigation';
import { createServerClient } from '@pemantik/supabase';
import EditProfileClient from './EditProfileClient';

export const metadata = {
  title: 'Edit Profil - Pemantik',
  description: 'Perbarui data diri dan profil siswa.',
};

export default async function EditStudentProfilePage() {
  const userSession = await getStudentSession();
  if (!userSession) redirect('/siswa/login');

  const supabase = createServerClient();
  const { data: student, error } = await supabase
    .from('students')
    .select(`
      *,
      schools ( name, npsn ),
      classes ( name, grade )
    `)
    .eq('id', userSession.student.id)
    .single();

  if (error || !student) redirect('/siswa/dashboard');

  const { data: sesVariables } = await supabase
    .from('ses_variables')
    .select('id, name, type')
    .order('score', { ascending: true }); // Usually ordered by score

  return (
    <StudentLayout studentName={student.full_name} studentNisn={student.nisn || '-'}>
      <EditProfileClient student={student} sesVariables={sesVariables || []} />
    </StudentLayout>
  );
}
