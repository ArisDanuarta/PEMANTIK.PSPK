import React from 'react';
import StudentLayout from '../../../components/siswa/StudentLayout';
import { getStudentSession } from '../../actions/studentAuth';
import { redirect } from 'next/navigation';
import { getStudentHistoryData } from '../../actions/studentData';
import RiwayatClient from './RiwayatClient';

export const metadata = {
  title: 'Riwayat Asesmen - Pemantik',
  description: 'Lihat riwayat asesmen yang telah kamu kerjakan.',
};

export default async function RiwayatPage() {
  const userSession = await getStudentSession();
  if (!userSession) {
    redirect('/siswa/login');
  }

  const student = userSession.student;
  
  // Fetch history data using the new action
  const historyData = await getStudentHistoryData(student.id);

  return (
    <StudentLayout studentName={student.name || 'Siswa'} studentNisn={student.nisn || '-'}>
      <RiwayatClient history={historyData} />
    </StudentLayout>
  );
}
