import React from 'react';
import Link from 'next/link';
import StudentLayout from '../../../../components/siswa/StudentLayout';
import { getStudentSession } from '../../../actions/studentAuth';
import { getStudentLevelsData } from '../../../actions/studentData';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Peta Asesmen - Pemantik',
  description: 'Roadmap level pengerjaan asesmen siswa.',
};

export default async function AssessmentLevelsPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  const session = await getStudentSession();
  if (!session) redirect('/siswa/login');

  const student = session.student;
  const levelsData = await getStudentLevelsData(student.id, categoryId);

  if (!levelsData) {
    return (
      <StudentLayout studentName={student.full_name || student.name || 'Siswa'} studentNisn={student.nisn || '-'}>
        <div style={{ padding: '80px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#74777f', fontFamily: 'var(--font-rubik)' }}>Paket Asesmen tidak ditemukan.</p>
          <Link href="/siswa/dashboard" style={{ color: '#001934', fontWeight: 700, display: 'inline-block', marginTop: '16px', fontFamily: 'var(--font-rubik)' }}>
            Kembali ke Dashboard
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const { category, levels } = levelsData;
  const isLiteracy = category.subject_area === 'literasi';
  const accentColor = isLiteracy ? '#0874AA' : '#DF632F';
  const accentBg = isLiteracy ? 'rgba(8,116,170,0.12)' : 'rgba(223,99,47,0.12)';
  const icon = isLiteracy ? 'menu_book' : 'calculate';
  const subjectLabel = isLiteracy ? 'Literasi' : 'Numerasi';

  return (
    <StudentLayout studentName={student.full_name || student.name || 'Siswa'} studentNisn={student.nisn || '-'}>
      <style>{`
        /* ── Level page ── */
        .lv-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 36px 40px 80px;
          font-family: var(--font-rubik), system-ui, sans-serif;
        }

        /* breadcrumb */
        .lv-crumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: #74777f; margin-bottom: 20px;
        }
        .lv-crumb a { color: #74777f; text-decoration: none; transition: color 0.15s; }
        .lv-crumb a:hover { color: #001934; }
        .lv-crumb-sep { font-size: 16px; color: #c4c6cf; }
        .lv-crumb-current { font-weight: 600; color: #001934; }

        /* header */
        .lv-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 40px;
        }
        .lv-header-left { flex: 1; }
        .lv-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .lv-title-icon {
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .lv-title {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 34px; font-weight: 700; color: #001934;
          line-height: 1.2;
        }
        .lv-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 12px; border-radius: 50px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .lv-desc {
          font-size: 15px; color: #43474e; line-height: 1.6;
          max-width: 520px; margin-top: 6px;
        }
        .lv-count-box {
          background: #ffffff;
          border: 1px solid #e5eeff;
          border-radius: 16px;
          padding: 14px 22px;
          box-shadow: 0 2px 12px rgba(16,46,80,0.06);
          text-align: center;
          flex-shrink: 0;
        }
        .lv-count-label { font-size: 11px; color: #74777f; margin-bottom: 4px; }
        .lv-count-val {
          font-size: 24px; font-weight: 700; color: #001934;
          font-family: var(--font-noto-serif), Georgia, serif;
        }

        /* grid */
        .lv-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        /* ── Base card ── */
        .lv-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 20px 16px 16px;
          border: 1.5px solid #e5eeff;
          box-shadow: 0 2px 12px rgba(16,46,80,0.06);
          display: flex; flex-direction: column; align-items: center; text-align: center;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        /* badge top-right */
        .lv-card-badge {
          position: absolute;
          top: -10px; right: -10px;
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 2;
        }

        /* circle avatar */
        .lv-circle {
          width: 64px; height: 64px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 22px; font-weight: 700;
        }

        .lv-level-name {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 15px; font-weight: 700; color: #0b1c30;
          margin-bottom: 4px;
        }
        .lv-level-sub {
          font-size: 12px; color: #74777f;
          min-height: 32px; display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px; line-height: 1.4;
        }

        /* action button / label */
        .lv-action {
          width: 100%;
          padding: 9px 0;
          border-radius: 50px;
          font-size: 13px; font-weight: 700;
          text-align: center;
          display: block;
          text-decoration: none;
          border: none; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .lv-action:active { transform: scale(0.97); }

        /* ── SELESAI card ── */
        .lv-card-selesai { border-color: #d4e3ff; background: #f0f5ff; }
        .lv-card-selesai .lv-circle { background: rgba(45,158,95,0.15); color: #2d9e5f; }
        .lv-card-selesai .lv-level-sub { color: #2d9e5f; font-weight: 500; }
        .lv-action-selesai { background: #e5eeff; color: #001934; }
        .lv-action-selesai:hover { background: #dce9ff; }
        .lv-badge-selesai { background: #2d9e5f; }

        /* ── GAGAL card ── */
        .lv-card-gagal { border-color: #ffdad6; background: #fff5f4; }
        .lv-card-gagal .lv-circle { background: #ffdad6; color: #ba1a1a; }
        .lv-card-gagal .lv-level-sub { color: #ba1a1a; font-weight: 500; }
        .lv-action-gagal { background: #ffdad6; color: #93000a; }
        .lv-action-gagal:hover { background: #fcc9c5; }
        .lv-badge-gagal { background: #ba1a1a; }

        /* ── KEDALUWARSA card ── */
        .lv-card-kedaluwarsa { opacity: 0.8; border-color: #e3e3e3; background: #f8f9fa; }
        .lv-card-kedaluwarsa .lv-circle { background: #e9ecef; color: #6c757d; }
        .lv-card-kedaluwarsa .lv-level-name { color: #495057; }
        .lv-card-kedaluwarsa .lv-level-sub { color: #6c757d; font-weight: 500; }
        .lv-action-kedaluwarsa { background: #e9ecef; color: #6c757d; cursor: not-allowed; }
        .lv-badge-kedaluwarsa { background: #6c757d; }

        /* ── AKTIF card ── */
        .lv-card-aktif {
          border: 2px solid #feba48;
          box-shadow: 0 6px 24px rgba(254,186,72,0.22), 0 2px 8px rgba(16,46,80,0.06);
          transform: scale(1.04);
          z-index: 5;
        }
        .lv-card-aktif:hover { transform: scale(1.06); box-shadow: 0 10px 32px rgba(254,186,72,0.28); }
        .lv-card-aktif .lv-circle {
          width: 72px; height: 72px;
          background: linear-gradient(135deg, #feba48 0%, #f9a825 100%);
          color: #714b00;
          font-size: 26px;
          box-shadow: 0 4px 12px rgba(254,186,72,0.4);
        }
        .lv-card-aktif .lv-level-name { font-size: 17px; }
        .lv-card-aktif .lv-level-sub { color: #0874AA; font-weight: 600; }
        .lv-action-aktif { background: #001934; color: #ffffff; box-shadow: 0 4px 12px rgba(0,25,52,0.22); }
        .lv-action-aktif:hover { background: #102e50; }
        .lv-badge-aktif {
          background: #feba48; color: #714b00;
          top: -12px; right: -12px;
          width: 36px; height: 36px;
          font-size: 13px; font-weight: 800;
        }

        /* ── TERKUNCI card ── */
        .lv-card-terkunci { opacity: 0.6; }
        .lv-card-terkunci .lv-circle { background: #f1f3f5; color: #74777f; }
        .lv-card-terkunci .lv-level-name { color: #74777f; }
        .lv-card-terkunci .lv-level-sub { color: #adb5bd; }
        .lv-action-terkunci { background: #f1f3f5; color: #74777f; cursor: not-allowed; }
        .lv-badge-terkunci { background: #adb5bd; }

        @media (max-width: 1023px) {
          .lv-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 767px) {
          .lv-page { padding: 24px 16px 60px; }
          .lv-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .lv-header { flex-direction: column; }
          .lv-title { font-size: 26px; }
          .lv-card-aktif { transform: scale(1.02); }
        }
        @media (max-width: 480px) {
          .lv-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="lv-page">

        {/* Breadcrumb */}
        <div className="lv-crumb">
          <Link href="/siswa/dashboard">Beranda</Link>
          <span className="material-symbols-outlined lv-crumb-sep" style={{ fontSize: '16px' }}>chevron_right</span>
          <span className="lv-crumb-current">{category.name}</span>
        </div>

        {/* Header */}
        <div className="lv-header">
          <div className="lv-header-left">
            <div className="lv-title-row">
              <div className="lv-title-icon" style={{ background: accentBg, color: accentColor }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{icon}</span>
              </div>
              <h1 className="lv-title">{category.name}</h1>
              <span className="lv-badge" style={{ background: accentBg, color: accentColor }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{icon}</span>
                {subjectLabel}
              </span>
            </div>
            <p className="lv-desc">
              Selesaikan setiap level secara berurutan. Level berikutnya akan terbuka jika kamu berhasil memenuhi standar kelulusan.
            </p>
          </div>

          <div className="lv-count-box">
            <div className="lv-count-label">Total Level</div>
            <div className="lv-count-val">{levels.length}</div>
          </div>
        </div>

        {/* Level Grid */}
        <div className="lv-grid">
          {levels.map((level) => {
            const num = level.level_number;

            /* ── SELESAI ── */
            if (level.status === 'Selesai') return (
              <div key={level.id} className="lv-card lv-card-selesai">
                <div className="lv-card-badge lv-badge-selesai">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div className="lv-circle">{num}</div>
                <div className="lv-level-name">Level {num}</div>
                <div className="lv-level-sub">Lulus &amp; Selesai</div>
                <Link
                  href={`/siswa/asesmen/${level.session?.id}/hasil`}
                  className="lv-action lv-action-selesai"
                >
                  Lihat Hasil
                </Link>
              </div>
            );

            /* ── PERLU DIULANG ── */
            if (level.status === 'Perlu Diulang') return (
              <div key={level.id} className="lv-card lv-card-gagal">
                <div className="lv-card-badge lv-badge-gagal">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#fff' }}>close</span>
                </div>
                <div className="lv-circle">{num}</div>
                <div className="lv-level-name">Level {num}</div>
                <div className="lv-level-sub">Maaf Tidak Bisa Lanjut Level Berikutnya</div>
                {/* Lihat hasil ujian yang gagal */}
                <Link
                  href={level.session?.id ? `/siswa/asesmen/${level.session.id}/hasil` : '/siswa/dashboard'}
                  className="lv-action lv-action-gagal"
                >
                  Lihat Hasil
                </Link>
              </div>
            );

            /* ── AKTIF ── */
            if (level.status === 'Aktif') {
              // Kalau sudah ada session in_progress → lanjutkan via lobby
              // Kalau belum ada session → buat baru via lobby dengan level param
              const lobbyHref = level.session?.id
                ? `/siswa/asesmen/${level.session.id}/lobby`
                : `/siswa/asesmen/new/lobby?level=${level.id}`;
              return (
                <div key={level.id} className="lv-card lv-card-aktif">
                  <div className="lv-card-badge lv-badge-aktif">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>star</span>
                  </div>
                  <div className="lv-circle">{num}</div>
                  <div className="lv-level-name">Level {num}</div>
                  <div className="lv-level-sub">Buka Tantangan Ini!</div>
                  <Link
                    href={lobbyHref}
                    className="lv-action lv-action-aktif"
                  >
                    Mulai
                  </Link>
                </div>
              );
            }

            /* ── KEDALUWARSA ── */
            if (level.status === 'Kedaluwarsa') return (
              <div key={level.id} className="lv-card lv-card-kedaluwarsa">
                <div className="lv-card-badge lv-badge-kedaluwarsa">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#fff' }}>timer_off</span>
                </div>
                <div className="lv-circle">{num}</div>
                <div className="lv-level-name">Level {num}</div>
                <div className="lv-level-sub">Masa asesmen telah berakhir</div>
                <button disabled className="lv-action lv-action-kedaluwarsa">Kedaluwarsa</button>
              </div>
            );

            /* ── TERKUNCI ── */
            return (
              <div key={level.id} className="lv-card lv-card-terkunci">
                <div className="lv-card-badge lv-badge-terkunci">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#fff' }}>lock</span>
                </div>
                <div className="lv-circle">{num}</div>
                <div className="lv-level-name">Level {num}</div>
                <div className="lv-level-sub">Selesaikan level sebelumnya</div>
                <button disabled className="lv-action lv-action-terkunci">Terkunci</button>
              </div>
            );
          })}
        </div>

      </div>
    </StudentLayout>
  );
}
