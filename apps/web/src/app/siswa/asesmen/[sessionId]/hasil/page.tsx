import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@pemantik/supabase';
import { getStudentSession } from '../../../../actions/studentAuth';

export const metadata = {
  title: 'Hasil Asesmen - Pemantik',
  description: 'Hasil pengerjaan asesmen siswa.',
};

export default async function HasilPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { sessionId } = await params;
  const { from } = await searchParams;
  const sessionUser = await getStudentSession();

  if (!sessionUser) redirect('/siswa/login');

  const supabase = createServerClient();

  const { data: session, error: sessionError } = await supabase
    .from('assessment_sessions')
    .select(`
      *,
      question_levels!assessment_sessions_level_id_fkey(
        level_number, passing_threshold, success_message, failure_message,
        question_categories(id, name)
      )
    `)
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    return <div style={{ padding: 40, color: 'red' }}>Error fetching session: {sessionError.message}</div>;
  }

  if (!session) {
    return <div style={{ padding: 40, color: 'red' }}>Session not found.</div>;
  }

  // Jika session masih pending (belum mulai sama sekali) → kembali ke asesmen
  // Untuk status 'in_progress' atau 'completed' → tampilkan hasil
  // (kasus offline: status bisa masih 'in_progress' meski sudah dikerjakan)
  if (session.status === 'pending') {
    return <div style={{ padding: 40, color: 'red' }}>Status masih pending.</div>;
  }

  const level = (session as any).question_levels;
  const category = level?.question_categories;
  const score = session.score ?? 0;
  const passingThreshold = level?.passing_threshold ?? 70;
  const isPass = (session as any).is_pass ?? score >= passingThreshold;
  const isCheatFailed = (session as any).cheat_failed ?? false;
  const levelNumber = level?.level_number ?? 1;
  const categoryName = category?.name ?? 'Asesmen';
  const categoryId = category?.id;
  const successMessage = level?.success_message;
  const failureMessage = level?.failure_message;

  // Cek apakah ada level berikutnya
  let nextLevelId = null;
  let nextLevelNumber = null;
  if (isPass && categoryId) {
    const { data: nextLvl } = await supabase
      .from('question_levels')
      .select('id, level_number')
      .eq('category_id', categoryId)
      .eq('level_number', levelNumber + 1)
      .single();
    if (nextLvl) {
      nextLevelId = nextLvl.id;
      nextLevelNumber = nextLvl.level_number;
    }
  }

  // Warna-warna UI persis seperti aplikasi mobile
  const bgGradient = isPass
    ? 'linear-gradient(180deg, rgba(251,191,36,0.15) 0%, rgba(255,255,255,1) 100%)' // Kuning Emas -> Putih
    : 'linear-gradient(180deg, #E0E6ED 0%, #FFFFFF 100%)'; // Abu-abu -> Putih

  const titleColor = isPass ? '#001934' : '#001934'; // Sesuai AppColors.primary
  const accentColor = isPass ? '#f59e0b' : '#f97316'; // kuningEmas atau jingga
  
  return (
    <>
      <style>{`
        .hr-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: ${bgGradient};
          font-family: var(--font-rubik, sans-serif);
        }
        .hr-container {
          max-width: 480px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .hr-illustration {
          width: 180px;
          height: 180px;
          margin-bottom: 24px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 80px;
          background: #fff;
          box-shadow: 0 10px 40px rgba(0,0,0,0.05);
        }
        .hr-title {
          font-family: var(--font-noto-serif, Georgia, serif);
          font-size: 32px;
          font-weight: 700;
          color: ${titleColor};
          margin-bottom: 24px;
        }
        .hr-card {
          width: 100%;
          background: #fff;
          border-radius: 24px;
          padding: 28px 24px;
          box-shadow: 0 8px 30px rgba(0,25,52,0.08);
          border: ${isPass ? 'none' : '1px solid rgba(196, 198, 207, 0.3)'};
          position: relative;
          overflow: hidden;
          margin-bottom: 40px;
        }
        .hr-card-bg-icon {
          position: absolute;
          top: -30px;
          right: -30px;
          font-size: 100px;
          opacity: 0.08;
          transform: rotate(15deg);
        }
        .hr-card-label {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 2px;
          color: #43474e;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .hr-message-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .hr-message-title {
          font-family: var(--font-noto-serif, Georgia, serif);
          font-size: 20px;
          font-weight: 700;
          color: ${isPass ? '#001934' : '#f97316'};
        }
        .hr-message-body {
          font-size: 15px;
          color: #43474e;
          line-height: 1.6;
        }
        .hr-score-badge {
          display: inline-block;
          background: #f1f3f5;
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          color: #001934;
          margin-top: 16px;
        }
        
        .hr-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 16px;
          background: ${isPass ? '#f59e0b' : '#001934'};
          color: #fff;
          border-radius: 100px;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          margin-bottom: 12px;
          box-shadow: 0 4px 12px ${isPass ? 'rgba(245,158,11,0.3)' : 'rgba(0,25,52,0.2)'};
          transition: transform 0.2s;
        }
        .hr-btn-primary:active { transform: scale(0.98); }
        
        .hr-btn-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 16px;
          background: ${isPass ? '#fff' : '#001934'};
          color: ${isPass ? '#001934' : '#fff'};
          border-radius: 100px;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          border: ${isPass ? '1px solid rgba(0,25,52,0.2)' : 'none'};
          box-shadow: ${isPass ? 'none' : '0 4px 12px rgba(0,25,52,0.2)'};
        }
      `}</style>

      <div className="hr-wrap">
        <div className="hr-container">
          {/* Animasi / Ilustrasi pengganti Lottie */}
          <div className="hr-illustration">
            {isCheatFailed ? '🚫' : isPass ? '🎉' : '💡'}
          </div>

          <div className="hr-title">
            {isCheatFailed ? 'Dibatalkan' : isPass ? 'Bagus Sekali!' : 'Belum Tepat'}
          </div>

          <div className="hr-card">
            <span className="material-symbols-outlined hr-card-bg-icon">
              {isPass ? 'local_fire_department' : 'lightbulb'}
            </span>
            
            <div className="hr-card-label">
              {isPass ? 'CAPAIAN LEVEL' : 'CATATAN BELAJAR'}
            </div>
            
            <div className="hr-message-row">
              {isPass && <span className="material-symbols-outlined" style={{color: '#f59e0b'}}>star</span>}
              {!isPass && !isCheatFailed && <span className="material-symbols-outlined" style={{color: '#f97316'}}>lightbulb</span>}
              <span className="hr-message-title">
                {isCheatFailed 
                  ? 'Aktivitas Mencurigakan' 
                  : (isPass ? (successMessage || 'Kerja Bagus!') : (failureMessage || 'Tetap Semangat!'))}
              </span>
              {isPass && <span className="material-symbols-outlined" style={{color: '#f59e0b'}}>star</span>}
            </div>

            <div className="hr-message-body">
              {isCheatFailed
                ? 'Asesmen ini dibatalkan karena sistem mendeteksi kamu terlalu sering keluar dari layar ujian.'
                : isPass
                ? 'Luar biasa! Kamu telah menyelesaikan penilaian ini dengan sangat baik. Terus pertahankan semangat belajarmu!'
                : 'Tidak apa-apa, setiap kesalahan adalah proses belajar. Jangan menyerah, ayo coba pelajari materinya lagi!'}
            </div>

            <div className="hr-score-badge">
              Skor Kamu: {Math.round(score)}
            </div>
          </div>

          {/* Tombol Aksi */}
          
          {/* Skenario LULUS dan ADA LEVEL BERIKUTNYA */}
          {isPass && nextLevelId && from !== 'list' && (
            <>
              <Link href={`/siswa/asesmen/new/lobby?level=${nextLevelId}`} className="hr-btn-primary">
                Lanjut ke Level {nextLevelNumber}
                <span className="material-symbols-outlined" style={{fontSize: 20}}>arrow_forward</span>
              </Link>
              <Link href={`/siswa/paket/${categoryId}`} className="hr-btn-secondary">
                <span className="material-symbols-outlined" style={{fontSize: 20}}>home</span>
                Kembali ke Beranda
              </Link>
            </>
          )}

          {/* Skenario GAGAL atau LULUS TAPI MENTOK (Level Terakhir) ATAU Lihat dari List */}
          {(!isPass || !nextLevelId || (isPass && from === 'list')) && (
            <>
              <Link href={categoryId ? `/siswa/paket/${categoryId}` : '/siswa/dashboard'} className="hr-btn-primary" style={{ background: '#001934', color: '#fff' }}>
                <span className="material-symbols-outlined" style={{fontSize: 20}}>home</span>
                Kembali ke Beranda
              </Link>
              <Link href="/siswa/riwayat" className="hr-btn-secondary" style={{ background: '#fff', color: '#001934', border: '1px solid rgba(0,25,52,0.2)' }}>
                <span className="material-symbols-outlined" style={{fontSize: 20}}>history</span>
                Lihat Riwayat Asesmen
              </Link>
            </>
          )}
          
        </div>
      </div>
    </>
  );
}
