import React from 'react';
import Link from 'next/link';
import StudentLayout from '../../../../../components/siswa/StudentLayout';
import { getStudentSession } from '../../../../actions/studentAuth';
import { redirect } from 'next/navigation';
import { createServerClient } from '@pemantik/supabase';
import { startAssessmentSession } from '../../../../actions/assessmentActions';

export const metadata = {
  title: 'Persiapan Asesmen - Pemantik',
  description: 'Halaman instruksi dan persiapan sebelum memulai asesmen.',
};

export default async function AssessmentLobbyPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ level?: string }>;
}) {
  const { sessionId } = await params;
  const { level: levelId } = await searchParams;
  const userSession = await getStudentSession();

  if (!userSession) redirect('/siswa/login');

  const student = userSession.student;
  const supabase = createServerClient();

  let levelData: any = null;
  let categoryData: any = null;
  let existingSession: any = null;

  if (sessionId !== 'new') {
    // Resume / lanjutkan session yang sudah ada
    const { data: s } = await supabase
      .from('assessment_sessions')
      .select('*, question_levels!assessment_sessions_level_id_fkey(*, question_categories(*))')
      .eq('id', sessionId)
      .single();

    if (s) {
      existingSession = s;
      levelData = s.question_levels as any;
      categoryData = (s.question_levels as any)?.question_categories;

      // Jika session sudah selesai, redirect ke hasil
      if (s.status === 'completed') {
        redirect(`/siswa/asesmen/${sessionId}/hasil`);
      }
    }
  } else if (levelId) {
    // Sesi baru — ambil data level
    const { data: l } = await supabase
      .from('question_levels')
      .select('*, question_categories(*)')
      .eq('id', levelId)
      .single();

    if (l) {
      levelData = l as any;
      categoryData = (l as any).question_categories;
    }
  }

  if (!levelData || !categoryData) {
    return (
      <StudentLayout studentName={student.name || 'Siswa'} studentNisn={student.nisn || '-'}>
        <div style={{ padding: '80px 40px', textAlign: 'center', fontFamily: 'var(--font-rubik)' }}>
          <p style={{ fontSize: '18px', color: '#74777f' }}>Data level tidak ditemukan.</p>
          <Link href="/siswa/dashboard" style={{ color: '#001934', fontWeight: 700, display: 'inline-block', marginTop: '16px' }}>
            Kembali ke Dashboard
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const isLiteracy = categoryData.subject_area === 'literasi';
  const accentColor = isLiteracy ? '#0874AA' : '#DF632F';
  const subjectIcon = isLiteracy ? 'menu_book' : 'calculate';

  // Hitung jumlah soal
  const { count: questionsCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('level_id', levelData.id);

  const durationMin = Math.round((levelData.time_limit_sec || 0) / 60);

  return (
    <StudentLayout studentName={student.name || 'Siswa'} studentNisn={student.nisn || '-'}>
      <style>{`
        .lobby-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 40px 80px;
          font-family: var(--font-rubik), system-ui, sans-serif;
        }
        .lobby-crumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: #74777f; margin-bottom: 24px;
        }
        .lobby-crumb a { color: #74777f; text-decoration: none; }
        .lobby-crumb a:hover { color: #001934; }
        .lobby-crumb-sep { font-size: 16px; color: #c4c6cf; }
        .lobby-crumb-cur { font-weight: 600; color: #001934; }

        /* ── Hero ── */
        .lobby-hero {
          background: linear-gradient(135deg, #001934 0%, #0e3b5e 100%);
          border-radius: 24px 24px 0 0;
          padding: 40px 48px;
          position: relative;
          overflow: hidden;
        }
        .lobby-hero-deco {
          position: absolute;
          right: -20px; top: 0; bottom: 0;
          opacity: 0.1;
          display: flex; align-items: center;
          pointer-events: none;
        }
        .lobby-level-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 50px;
          padding: 5px 14px;
          font-size: 13px; font-weight: 700; color: #ffffff;
          margin-bottom: 14px;
        }
        .lobby-hero-title {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 36px; font-weight: 700; color: #ffffff;
          line-height: 1.2; margin-bottom: 10px;
        }
        .lobby-hero-sub { font-size: 15px; color: rgba(255,255,255,0.65); max-width: 480px; line-height: 1.6; }

        /* ── Body ── */
        .lobby-body {
          background: #ffffff;
          border: 1px solid #e5eeff;
          border-top: none;
          border-radius: 0 0 24px 24px;
          padding: 40px 48px;
          display: flex;
          gap: 48px;
        }

        /* metrics */
        .lobby-metrics { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .lobby-metric {
          background: #f8f9ff;
          border: 1px solid #e5eeff;
          border-radius: 14px;
          padding: 18px 16px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .lobby-metric-icon {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .lobby-metric-label { font-size: 12px; color: #43474e; }
        .lobby-metric-val { font-size: 20px; font-weight: 700; color: #001934; }

        /* instructions */
        .lobby-instructions { flex: 1; }
        .lobby-instructions h2 {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 22px; font-weight: 700; color: #001934; margin-bottom: 18px;
        }
        .lobby-instr-list { display: flex; flex-direction: column; gap: 14px; }
        .lobby-instr-item { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #43474e; line-height: 1.5; }

        /* footer */
        .lobby-footer {
          background: #f8f9ff;
          border: 1px solid #e5eeff;
          border-radius: 16px;
          margin-top: 20px;
          padding: 24px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .lobby-footer-text { }
        .lobby-footer-label { font-size: 14px; font-weight: 700; color: #001934; margin-bottom: 3px; }
        .lobby-footer-sub { font-size: 12px; color: #74777f; }

        .lobby-start-btn {
          background: #feba48; color: #714b00;
          border: none; border-radius: 50px;
          padding: 14px 32px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 14px; font-weight: 700;
          cursor: pointer; text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
          transition: background 0.15s, transform 0.1s;
          box-shadow: 0 4px 14px rgba(254,186,72,0.3);
          white-space: nowrap;
        }
        .lobby-start-btn:hover { background: #f5ac30; }
        .lobby-start-btn:active { transform: scale(0.97); }

        @media (max-width: 767px) {
          .lobby-page { padding: 20px 16px 60px; }
          .lobby-hero { padding: 28px 24px; }
          .lobby-body { flex-direction: column; padding: 24px; gap: 28px; }
          .lobby-metrics { grid-template-columns: 1fr 1fr; }
          .lobby-footer { flex-direction: column; text-align: center; }
          .lobby-hero-title { font-size: 26px; }
        }
      `}</style>

      <div className="lobby-page">
        {/* Breadcrumb */}
        <div className="lobby-crumb">
          <Link href="/siswa/dashboard">Beranda</Link>
          <span className="material-symbols-outlined lobby-crumb-sep" style={{ fontSize: '16px' }}>chevron_right</span>
          <Link href={`/siswa/paket/${categoryData.id}`}>{categoryData.name}</Link>
          <span className="material-symbols-outlined lobby-crumb-sep" style={{ fontSize: '16px' }}>chevron_right</span>
          <span className="lobby-crumb-cur">Persiapan Level {levelData.level_number}</span>
        </div>

        {/* Hero */}
        <div className="lobby-hero">
          <div className="lobby-hero-deco">
            <span className="material-symbols-outlined" style={{ fontSize: '200px', color: '#ffffff', fontVariationSettings: "'FILL' 1" }}>
              {subjectIcon}
            </span>
          </div>
          <div className="lobby-level-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>stars</span>
            Level {levelData.level_number}
          </div>
          <h1 className="lobby-hero-title">{categoryData.name}</h1>
          <p className="lobby-hero-sub">
            Sesi pengerjaan soal untuk mengukur kemampuan {isLiteracy ? 'literasi' : 'numerasi'} kamu.
          </p>
        </div>

        {/* Body */}
        <div className="lobby-body">
          {/* Metrics */}
          <div className="lobby-metrics">
            <div className="lobby-metric">
              <div className="lobby-metric-icon" style={{ background: '#e5eeff' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#001934' }}>assignment</span>
              </div>
              <div className="lobby-metric-label">Jumlah Soal</div>
              <div className="lobby-metric-val">{questionsCount || 0}</div>
            </div>
            <div className="lobby-metric">
              <div className="lobby-metric-icon" style={{ background: 'rgba(254,186,72,0.15)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#805600' }}>timer</span>
              </div>
              <div className="lobby-metric-label">Durasi</div>
              <div className="lobby-metric-val">{durationMin || '–'} mnt</div>
            </div>
            <div className="lobby-metric">
              <div className="lobby-metric-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#10B981' }}>verified</span>
              </div>
              <div className="lobby-metric-label">Nilai Kelulusan</div>
              <div className="lobby-metric-val">Min. {levelData.passing_threshold ?? 70}%</div>
            </div>
            <div className="lobby-metric">
              <div className="lobby-metric-icon" style={{ background: `rgba(8,116,170,0.12)` }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: accentColor }}>{subjectIcon}</span>
              </div>
              <div className="lobby-metric-label">Mata Uji</div>
              <div className="lobby-metric-val" style={{ fontSize: '15px' }}>{isLiteracy ? 'Literasi' : 'Numerasi'}</div>
            </div>
          </div>

          {/* Instructions */}
          <div className="lobby-instructions">
            <h2>Instruksi Pengerjaan</h2>
            <div className="lobby-instr-list">
              {[
                'Kerjakan soal secara berurutan. Kamu bisa melewati soal dan kembali nanti.',
                'Waktu terus berjalan setelah tombol "Mulai" ditekan dan tidak bisa dijeda.',
                'Pastikan jawab semua soal sebelum menekan tombol "Selesai & Kumpulkan".',
                'Jawaban tersimpan otomatis, bahkan saat koneksi terputus (mode offline).',
              ].map((text, i) => (
                <div key={i} className="lobby-instr-item">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#feba48', flexShrink: 0, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="lobby-footer">
          <div className="lobby-footer-text">
            <div className="lobby-footer-label">Sudah siap?</div>
            <div className="lobby-footer-sub">Fokus, tenang, dan kerjakan dengan teliti.</div>
          </div>

          {existingSession ? (
            /* Lanjutkan session yang sedang berjalan */
            <Link href={`/siswa/asesmen/${existingSession.id}`} className="lobby-start-btn">
              Lanjutkan Ujian
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </Link>
          ) : (
            /* Mulai session baru */
            <form action={async () => {
              'use server';
              const s = await getStudentSession();
              if (!s || !levelId) return;
              await startAssessmentSession(levelData.id, categoryData.id, s.student);
            }}>
              <button type="submit" className="lobby-start-btn">
                Mulai Ujian Sekarang
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
