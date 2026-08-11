import React from 'react';
import Link from 'next/link';
import { getStudentSession } from '../../../../actions/studentAuth';
import { redirect } from 'next/navigation';
import { createServerClient } from '@pemantik/supabase';
import PemantikLogoProgress from '@/components/shared/Unitprogressbar';

export const metadata = {
  title: 'Hasil Asesmen - Pemantik',
  description: 'Halaman hasil pengerjaan soal asesmen siswa.',
};

export default async function AssessmentResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const userSession = await getStudentSession();
  if (!userSession) redirect('/siswa/login');

  const supabase = createServerClient();
  const { data: session } = await supabase
    .from('assessment_sessions')
    .select('*, question_levels!assessment_sessions_level_id_fkey(*, question_categories(*))')
    .eq('id', sessionId)
    .single();

  if (!session) redirect('/siswa/dashboard');

  const levelData = session.question_levels as any;
  const categoryData = (levelData as any)?.question_categories;
  const score = session.score ?? 0;
  const passingThreshold = levelData?.passing_threshold ?? 70;
  
  // Anti-cheat flag
  const isCheatFailed = ((session as any).cheat_strikes ?? 0) >= 3;
  const isPass = !isCheatFailed && (score >= passingThreshold);
  
  // URL untuk tombol kembali ke paket list
  const paketHref = categoryData?.id
    ? `/siswa/paket/${categoryData.id}`
    : '/siswa/dashboard';

  // URL untuk retry (kalau gagal)
  const retryHref = `/siswa/asesmen/new/lobby?level=${session.level_id}`;

  const scoreColor = isPass ? '#10B981' : '#ba1a1a';
  const borderColor = isPass ? '#feba48' : '#ba1a1a';

  const hasNextLevel = isPass && session.current_level_id !== session.level_id;
  const nextLevelHref = `/siswa/asesmen/new/lobby?level=${session.current_level_id}`;

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      <style>{`
        /* ── Hasil page ── */
        @keyframes confetti-float {
          0% { transform: translateY(0px) rotate(0deg) scale(1); opacity: 0.7; }
          100% { transform: translateY(-40px) rotate(360deg) scale(0.8); opacity: 0.3; }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes score-pop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .hl-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 24px 16px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          background: linear-gradient(135deg, rgba(16,46,80,0.06) 0%, rgba(8,116,170,0.08) 100%);
          background-color: #f8f9ff;
        }
        .hl-confetti {
          position: absolute;
          border-radius: 50%;
          animation: confetti-float 5s ease-in-out infinite alternate;
        }
        .hl-card {
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(16,46,80,0.12);
          padding: 48px 40px;
          max-width: 560px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          z-index: 10;
          animation: card-in 0.5s ease-out both;
          border-top: 4px solid ${borderColor};
        }
        .hl-illustration {
          width: 140px;
          height: 140px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hl-title {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 34px;
          font-weight: 700;
          color: #001934;
          margin-bottom: 10px;
          line-height: 1.2;
        }
        .hl-desc {
          font-size: 15px;
          color: #43474e;
          max-width: 380px;
          line-height: 1.6;
          margin-bottom: 28px;
        }
        .hl-score {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 52px;
          font-weight: 700;
          color: ${scoreColor};
          line-height: 1;
          animation: score-pop 0.6s 0.3s ease-out both;
          margin-bottom: 4px;
        }
        .hl-score-label {
          font-size: 13px;
          color: #74777f;
          margin-bottom: 28px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .hl-info-box {
          background: #eff4ff;
          border: 1px solid #d4e3ff;
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          text-align: left;
          width: 100%;
          margin-bottom: 32px;
        }
        .hl-info-icon {
          background: #e5eeff;
          border-radius: 10px;
          padding: 8px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hl-info-heading {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 16px;
          font-weight: 700;
          color: #001934;
          margin-bottom: 4px;
        }
        .hl-info-text {
          font-size: 13px;
          color: #43474e;
          line-height: 1.5;
        }
        .hl-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }
        .hl-btn-primary {
          background: #001934;
          color: #ffffff;
          border: none;
          border-radius: 50px;
          padding: 14px 32px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, transform 0.1s;
          box-shadow: 0 4px 14px rgba(0,25,52,0.2);
        }
        .hl-btn-primary:hover { background: #102e50; }
        .hl-btn-primary:active { transform: scale(0.97); }
        .hl-btn-secondary {
          background: #feba48;
          color: #714b00;
          border: none;
          border-radius: 50px;
          padding: 14px 32px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, transform 0.1s;
        }
        .hl-btn-secondary:hover { background: #f5ac30; }
        .hl-btn-secondary:active { transform: scale(0.97); }
        .hl-btn-ghost {
          background: none;
          color: #001934;
          border: 1.5px solid #c4c6cf;
          border-radius: 50px;
          padding: 13px 32px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s;
        }
        .hl-btn-ghost:hover { background: #eff4ff; }

        @media (max-width: 480px) {
          .hl-card { padding: 32px 20px; }
          .hl-title { font-size: 28px; }
          .hl-score { font-size: 44px; }
        }
      `}</style>

      <div className="hl-page">
        {/* Confetti dots for pass */}
        {isPass && (<>
          <div className="hl-confetti" style={{ top:'8%', left:'12%', width:'16px', height:'16px', background:'#feba48', animationDelay:'0s' }} />
          <div className="hl-confetti" style={{ top:'18%', right:'18%', width:'12px', height:'12px', background:'#ffdad6', animationDelay:'0.8s' }} />
          <div className="hl-confetti" style={{ bottom:'28%', left:'8%', width:'10px', height:'10px', background:'#adc8f2', animationDelay:'1.6s' }} />
          <div className="hl-confetti" style={{ bottom:'12%', right:'12%', width:'18px', height:'18px', background:'#feba48', animationDelay:'0.4s', borderRadius:'3px' }} />
          <div className="hl-confetti" style={{ top:'38%', left:'4%', width:'9px', height:'9px', background:'#ffdad5', animationDelay:'1.2s' }} />
          <div className="hl-confetti" style={{ top:'55%', right:'6%', width:'13px', height:'13px', background:'#dce9ff', animationDelay:'2s' }} />
          <div className="hl-confetti" style={{ top:'30%', left:'30%', width:'7px', height:'7px', background:'#10B981', animationDelay:'0.6s' }} />
          <div className="hl-confetti" style={{ bottom:'40%', right:'28%', width:'11px', height:'11px', background:'#feba48', animationDelay:'1.8s', borderRadius:'3px' }} />
        </>)}

        <main className="hl-card">
          {/* Illustration */}
          <div className="hl-illustration">
            <PemantikLogoProgress 
              value={isPass ? 100 : 0} 
              max={100} 
              size={120} 
              showLabel={false}
              startFull={!isPass}
              delayMs={800}
              durationMs={2000}
            />
          </div>

          {/* Heading */}
          <h1 className="hl-title">
            {isPass ? 'Luar Biasa!' : (isCheatFailed ? 'Asesmen Dibatalkan' : 'Tetap Semangat!')}
          </h1>
          <p className="hl-desc">
            {isPass
              ? `Kamu telah menyelesaikan Level ${levelData?.level_number} dengan hasil yang sangat baik!`
              : (isCheatFailed
                ? 'Sesi digagalkan secara otomatis karena kamu terdeteksi keluar dari aplikasi/layar saat asesmen berlangsung.'
                : `Nilaimu belum mencapai batas kelulusan Level ${levelData?.level_number}. Pelajari kembali materinya dan coba lagi!`)
            }
          </p>

          {/* Info box */}
          <div className="hl-info-box" style={isCheatFailed ? { backgroundColor: '#FCE8E8', border: '1px solid #BA1A1A' } : {}}>
            <div className="hl-info-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: isCheatFailed ? '#BA1A1A' : '#001934', fontVariationSettings: "'FILL' 1" }}>
                {isPass ? 'insights' : (isCheatFailed ? 'warning' : 'auto_stories')}
              </span>
            </div>
            <div>
              <div className="hl-info-heading" style={isCheatFailed ? { color: '#BA1A1A' } : {}}>
                {isPass ? 'Status: Lulus ✓' : (isCheatFailed ? 'Status: Pelanggaran Anti-Cheat' : 'Status: Belum Lulus')}
              </div>
              <p className="hl-info-text" style={isCheatFailed ? { color: '#BA1A1A' } : {}}>
                {isPass
                  ? (levelData?.success_message || 'Selamat! Level berikutnya kini terbuka. Terus tingkatkan kemampuanmu.')
                  : (isCheatFailed
                    ? 'Kamu telah melakukan pelanggaran batas toleransi (3 kali) dengan meminimalkan aplikasi atau berpindah tab.'
                    : (levelData?.failure_message || 'Kamu perlu mengulang level ini. Pelajari kembali materi dan tingkatkan fokusmu sebelum mencoba lagi.'))
                }
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="hl-actions">
            {isPass ? (
              hasNextLevel ? (
                /* Lulus dan ada level berikutnya: langsung ke lobby persiapan level selanjutnya */
                <Link href={nextLevelHref} className="hl-btn-secondary">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                  Lanjut ke Level Berikutnya
                </Link>
              ) : (
                /* Lulus tapi ini level terakhir */
                <Link href={paketHref} className="hl-btn-secondary">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  Selesaikan Topik
                </Link>
              )
            ) : (
              /* Gagal: tombol diubah menjadi lihat riwayat */
              <Link href="/siswa/riwayat" className="hl-btn-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span>
                Lihat Riwayat
              </Link>
            )}
            {/* Selalu ada tombol kembali ke paket */}
            <Link href={paketHref} className="hl-btn-ghost">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list</span>
              Lihat Semua Level
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
