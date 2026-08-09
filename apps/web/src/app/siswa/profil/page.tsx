import React from 'react';
import Link from 'next/link';
import StudentLayout from '../../../components/siswa/StudentLayout';
import { getStudentSession } from '../../actions/studentAuth';
import { redirect } from 'next/navigation';
import { createServerClient } from '@pemantik/supabase';

export const metadata = {
  title: 'Profil Siswa - Pemantik',
  description: 'Halaman profil dan data diri siswa.',
};

export default async function StudentProfilePage() {
  const userSession = await getStudentSession();
  if (!userSession) redirect('/siswa/login');

  const supabase = createServerClient();
  const { data: student, error } = await supabase
    .from('students')
    .select(`
      *,
      schools ( name, npsn ),
      classes ( name, grade ),
      father_edu:ses_variables!students_father_education_id_fkey(name),
      mother_edu:ses_variables!students_mother_education_id_fkey(name),
      father_occ:ses_variables!students_father_occupation_id_fkey(name),
      mother_occ:ses_variables!students_mother_occupation_id_fkey(name)
    `)
    .eq('id', userSession.student.id)
    .single();

  if (error || !student) redirect('/siswa/dashboard');

  const s = student as any;
  const genderLabel = s.gender === 'L' ? 'Laki-laki' : s.gender === 'P' ? 'Perempuan' : 'Belum diatur';

  return (
    <StudentLayout studentName={s.full_name} studentNisn={s.nisn || '-'}>
      <style>{`
        .pf-page {
          max-width: 900px; margin: 0 auto;
          padding: 36px 40px 80px;
          font-family: var(--font-rubik), system-ui, sans-serif;
        }
        .pf-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 32px;
        }
        .pf-title-area h1 {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 32px; font-weight: 700; color: #001934; margin-bottom: 6px;
        }
        .pf-title-area p { font-size: 15px; color: #43474e; }
        
        .pf-btn-edit {
          display: inline-flex; align-items: center; gap: 8px;
          background: #feba48; color: #714b00;
          border-radius: 50px; padding: 12px 24px;
          font-size: 14px; font-weight: 700; text-decoration: none;
          box-shadow: 0 4px 14px rgba(254,186,72,0.3);
          transition: transform 0.15s, background 0.15s;
        }
        .pf-btn-edit:hover { background: #f5ac30; transform: translateY(-2px); }
        .pf-btn-edit:active { transform: translateY(0); }

        /* Cover & Avatar */
        .pf-hero {
          background: linear-gradient(135deg, #001934 0%, #0e3b5e 100%);
          border-radius: 24px;
          padding: 32px 40px;
          position: relative;
          display: flex; align-items: center; gap: 32px;
          margin-bottom: 40px;
          box-shadow: 0 8px 24px rgba(0,25,52,0.15);
          overflow: hidden;
        }
        .pf-hero-deco {
          position: absolute; right: -20px; top: -20px; opacity: 0.05; pointer-events: none;
        }
        .pf-avatar {
          width: 120px; height: 120px; border-radius: 50%;
          background: #e5eeff; border: 4px solid #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 48px; font-weight: 700; color: #001934;
          flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .pf-hero-info h2 {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 8px;
        }
        .pf-hero-badges { display: flex; flex-wrap: wrap; gap: 10px; }
        .pf-hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
          border-radius: 50px; padding: 6px 14px;
          font-size: 13px; font-weight: 600; color: #ffffff;
        }

        /* Sections */
        .pf-section {
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(16,46,80,0.06);
          margin-bottom: 24px;
          border: 1px solid #e5eeff;
          overflow: hidden;
        }
        .pf-section-header {
          padding: 24px 32px; border-bottom: 1px solid #e5eeff;
          display: flex; align-items: center; gap: 12px;
          background: #f8f9ff;
        }
        .pf-section-icon {
          width: 40px; height: 40px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .pf-section-title {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 20px; font-weight: 700; color: #001934;
        }
        .pf-section-body { padding: 24px 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        
        /* Data Item */
        .pf-item { display: flex; flex-direction: column; gap: 6px; }
        .pf-item-label { font-size: 13px; font-weight: 600; color: #74777f; letter-spacing: 0.02em; text-transform: uppercase; }
        .pf-item-val {
          font-size: 15px; color: #0b1c30; font-weight: 500;
          background: #f8f9ff; border: 1px solid #e5eeff; border-radius: 12px; padding: 14px 16px;
          display: flex; align-items: center; gap: 10px;
        }
        .pf-item-val-icon { color: #001934; opacity: 0.7; font-size: 18px; }

        @media (max-width: 767px) {
          .pf-page { padding: 24px 16px 80px; }
          .pf-header { flex-direction: column; align-items: flex-start; gap: 20px; margin-bottom: 24px; }
          .pf-btn-edit { width: 100%; justify-content: center; }
          .pf-hero { flex-direction: column; align-items: center; text-align: center; padding: 32px 20px; }
          .pf-hero-badges { justify-content: center; }
          .pf-section-header { padding: 20px 24px; }
          .pf-section-body { grid-template-columns: 1fr; padding: 20px 24px; gap: 16px; }
        }
      `}</style>

      <div className="pf-page">
        <div className="pf-header">
          <div className="pf-title-area">
            <h1>Profil Siswa</h1>
            <p>Informasi detail mengenai data diri dan akademik kamu.</p>
          </div>
          <Link href="/siswa/profil/edit" className="pf-btn-edit">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>edit_square</span>
            Edit Profil
          </Link>
        </div>

        {/* Hero Card */}
        <div className="pf-hero">
          <div className="pf-hero-deco">
            <span className="material-symbols-outlined" style={{ fontSize: '240px' }}>face</span>
          </div>
          <div className="pf-avatar">
            {s.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="pf-hero-info">
            <h2>{s.full_name}</h2>
            <div className="pf-hero-badges">
              <div className="pf-hero-badge">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>badge</span>
                NISN: {s.nisn || '-'}
              </div>
              <div className="pf-hero-badge">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>school</span>
                {s.schools?.name || 'Sekolah Belum Diatur'}
              </div>
            </div>
          </div>
        </div>

        {/* 1. Data Pribadi */}
        <section className="pf-section">
          <div className="pf-section-header">
            <div className="pf-section-icon" style={{ background: '#e5eeff', color: '#001934' }}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>
            <h3 className="pf-section-title">Data Pribadi</h3>
          </div>
          <div className="pf-section-body">
            <div className="pf-item">
              <span className="pf-item-label">Nama Lengkap</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">badge</span> {s.full_name}</div>
            </div>
            <div className="pf-item">
              <span className="pf-item-label">Jenis Kelamin</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">wc</span> {genderLabel}</div>
            </div>
            <div className="pf-item">
              <span className="pf-item-label">Tanggal Lahir</span>
              <div className="pf-item-val">
                <span className="material-symbols-outlined pf-item-val-icon">cake</span>
                {s.birth_date ? new Date(s.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum diatur'}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Data Akademik */}
        <section className="pf-section">
          <div className="pf-section-header">
            <div className="pf-section-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <h3 className="pf-section-title">Data Akademik</h3>
          </div>
          <div className="pf-section-body">
            <div className="pf-item">
              <span className="pf-item-label">NISN</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">pin</span> {s.nisn || '-'}</div>
            </div>
            <div className="pf-item" style={{ gridColumn: '1 / -1' }}>
              <span className="pf-item-label">Asal Sekolah</span>
              <div className="pf-item-val">
                <span className="material-symbols-outlined pf-item-val-icon">account_balance</span>
                {s.schools?.name ? `${s.schools.name} (NPSN: ${s.schools.npsn || '-'})` : 'Belum diatur'}
              </div>
            </div>
            <div className="pf-item">
              <span className="pf-item-label">Rombel / Kelas</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">class</span> {s.classes?.name || 'Belum diatur'}</div>
            </div>
            <div className="pf-item">
              <span className="pf-item-label">Tingkat / Grade</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">stairs</span> Kelas {s.classes?.grade || '-'}</div>
            </div>
          </div>
        </section>

        {/* 3. Data Orang Tua / Wali */}
        <section className="pf-section">
          <div className="pf-section-header">
            <div className="pf-section-icon" style={{ background: '#d1fae5', color: '#065f46' }}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>family_restroom</span>
            </div>
            <h3 className="pf-section-title">Data Orang Tua / Wali</h3>
          </div>
          <div className="pf-section-body">
            <div className="pf-item">
              <span className="pf-item-label">Pekerjaan Ayah</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">work</span> {s.father_occ?.name || 'Belum diatur'}</div>
            </div>
            <div className="pf-item">
              <span className="pf-item-label">Pendidikan Ayah</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">school</span> {s.father_edu?.name || 'Belum diatur'}</div>
            </div>
            <div className="pf-item">
              <span className="pf-item-label">Pekerjaan Ibu</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">work</span> {s.mother_occ?.name || 'Belum diatur'}</div>
            </div>
            <div className="pf-item">
              <span className="pf-item-label">Pendidikan Ibu</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">school</span> {s.mother_edu?.name || 'Belum diatur'}</div>
            </div>
          </div>
        </section>

        {/* 4. Data Wilayah */}
        <section className="pf-section">
          <div className="pf-section-header">
            <div className="pf-section-icon" style={{ background: '#ffe4e6', color: '#9f1239' }}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            </div>
            <h3 className="pf-section-title">Data Wilayah</h3>
          </div>
          <div className="pf-section-body">
            <div className="pf-item">
              <span className="pf-item-label">Provinsi</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">map</span> {s.province || 'Belum diatur'}</div>
            </div>
            <div className="pf-item">
              <span className="pf-item-label">Kabupaten / Kota</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">location_city</span> {s.city || 'Belum diatur'}</div>
            </div>
            <div className="pf-item">
              <span className="pf-item-label">Kecamatan</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">holiday_village</span> {s.district || 'Belum diatur'}</div>
            </div>
            <div className="pf-item">
              <span className="pf-item-label">Desa / Kelurahan</span>
              <div className="pf-item-val"><span className="material-symbols-outlined pf-item-val-icon">home_pin</span> {s.village || 'Belum diatur'}</div>
            </div>
          </div>
        </section>

      </div>
    </StudentLayout>
  );
}
