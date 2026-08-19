import React from 'react';
import Link from 'next/link';
import StudentLayout from '../../../components/siswa/StudentLayout';
import { getStudentSession } from '../../actions/studentAuth';
import { getStudentDashboardData } from '../../actions/studentData';
import { redirect } from 'next/navigation';
import SyncButton from './SyncButton';

export const metadata = {
  title: 'Dashboard Siswa - Pemantik',
  description: 'Dashboard asesmen literasi dan numerasi siswa.',
};

const BALINESE_TITLES = new Set([
  'i', 'ni', 'ida', 'anak', 'agung', 'gusti', 'dewa', 'sang', 'cokorda', 'tjokorda', 'desak', 'ngakan', 'bagus', 'ayu',
  'wayan', 'made', 'nyoman', 'ketut', 'putu', 'gede', 'kadek', 'komang', 'luh', 'iluh', 'nengah', 'mase'
]);

function getFirstName(fullName: string): string {
  if (!fullName || fullName === 'Siswa') return 'Siswa';
  
  const words = fullName.trim().split(/\s+/);
  
  for (const word of words) {
    if (!BALINESE_TITLES.has(word.toLowerCase())) {
      return word;
    }
  }

  if (words.length > 1) {
    if (words[0].toLowerCase() === 'i' || words[0].toLowerCase() === 'ni') {
        return words[words.length > 2 ? 2 : 1];
    }
    return words[words.length - 1]; 
  }
  
  return words[0];
}

export default async function StudentDashboardPage() {
  const session = await getStudentSession();
  if (!session) redirect('/siswa/login');

  const student = session.student;
  const { activePackages, historyPackages, updatedStudentName } = await getStudentDashboardData(student);
  const studentNameStr = updatedStudentName || student.full_name || student.name || 'Siswa';
  const firstName = getFirstName(studentNameStr);

  return (
    <StudentLayout studentName={studentNameStr} studentNisn={student.nisn || '-'}>
      <style>{`
        /* ── Dashboard styles ── */
        .db-hero {
          background: linear-gradient(135deg, #001934 0%, #0e3b5e 100%);
          padding: 36px 40px 72px;
          position: relative;
          overflow: hidden;
        }
        .db-hero-deco {
          position: absolute;
          right: -20px; top: 0; bottom: 0;
          width: 45%;
          opacity: 0.18;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: -16px;
        }
        .db-hero-title {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 42px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.15;
          letter-spacing: -0.01em;
          margin-bottom: 10px;
          position: relative; z-index: 1;
        }
        .db-hero-sub {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 16px;
          color: rgba(255,255,255,0.7);
          max-width: 480px;
          line-height: 1.6;
          position: relative; z-index: 1;
        }
        .db-hero-actions {
          position: absolute;
          top: 50%; right: 40px;
          transform: translateY(-50%);
          display: flex;
          gap: 10px;
          z-index: 2;
        }
        .db-hero-btn {
          height: 44px; border-radius: 22px; padding: 0 20px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          cursor: pointer; color: #ffffff;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s ease;
          position: relative;
          font-weight: 500;
          font-size: 14px;
        }
        .db-hero-btn:hover { 
          background: rgba(255,255,255,0.25); 
          transform: translateY(-2px);
        }

        /* ── Content area ── */
        .db-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 40px 80px;
          margin-top: -36px;
          position: relative;
          z-index: 10;
        }

        /* ── Section headers ── */
        .db-section { margin-bottom: 40px; }
        .db-section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 20px;
        }
        .db-section-title {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 26px;
          font-weight: 700;
          color: #0b1c30;
        }
        .db-see-all {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #001934;
          text-decoration: none;
        }
        .db-see-all:hover { text-decoration: underline; }

        /* ── Cards grid ── */
        .db-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        /* ── Package card (active) ── */
        .pkg-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 4px 20px rgba(16,46,80,0.08);
          border: 1px solid #e5eeff;
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.2s;
        }
        .pkg-card:hover { box-shadow: 0 8px 30px rgba(16,46,80,0.13); }

        .pkg-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 18px;
        }
        .pkg-card-left { display: flex; align-items: center; gap: 12px; }
        .pkg-icon {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .pkg-icon.lit { background: rgba(8,116,170,0.12); color: #0874AA; }
        .pkg-icon.num { background: rgba(223,99,47,0.12); color: #DF632F; }
        .pkg-title {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #0b1c30;
          line-height: 1.3;
        }
        .pkg-badge {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 10px;
          border-radius: 50px;
          flex-shrink: 0;
        }
        .pkg-badge.lit { background: rgba(8,116,170,0.12); color: #0874AA; }
        .pkg-badge.num { background: rgba(223,99,47,0.12); color: #DF632F; }

        /* Progress */
        .pkg-progress { flex: 1; margin-bottom: 18px; }
        .pkg-progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 13px;
        }
        .pkg-progress-label { color: #43474e; }
        .pkg-progress-count { font-weight: 700; color: #001934; }
        .pkg-bars { display: flex; gap: 5px; }
        .pkg-bar {
          flex: 1;
          height: 6px;
          border-radius: 50px;
        }
        .pkg-bar.filled { background: #001934; }
        .pkg-bar.empty { background: #dce9ff; border: 1px solid rgba(0,25,52,0.2); }

        /* Footer */
        .pkg-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 16px;
          border-top: 1px solid #e5eeff;
          margin-top: auto;
        }
        .pkg-status-label {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 11px;
          color: #43474e;
          margin-bottom: 5px;
        }
        .pkg-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 6px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
        }
        .pkg-status-pill.active { background: rgba(242,175,62,0.15); color: #805600; border: 1px solid rgba(242,175,62,0.3); }
        .pkg-status-pill.inactive { background: #f1f3f5; color: #43474e; border: 1px solid #dee2e6; }
        .pkg-status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .pkg-status-dot.active { background: #F2AF3E; }
        .pkg-status-dot.inactive { background: #43474e; }
        .pkg-valid {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 11px;
          color: #74777f;
          margin-top: 5px;
        }
        .pkg-cta {
          background: #001934;
          color: #ffffff;
          border: none;
          border-radius: 50px;
          padding: 8px 18px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: background 0.15s;
        }
        .pkg-cta:hover { background: #102e50; }

        /* ── History card ── */
        .hist-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(16,46,80,0.06);
          border: 1px solid #e5eeff;
          display: flex;
          flex-direction: column;
          opacity: 0.8;
          transition: opacity 0.2s, box-shadow 0.2s;
        }
        .hist-card:hover { opacity: 1; box-shadow: 0 4px 20px rgba(16,46,80,0.10); }
        .hist-icon {
          width: 38px; height: 38px; border-radius: 50%;
          background: #f1f3f5;
          display: flex; align-items: center; justify-content: center;
          color: #74777f; flex-shrink: 0;
        }
        .hist-title {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 15px; font-weight: 700; color: #0b1c30;
          line-height: 1.3;
        }
        .hist-bar { height: 5px; flex: 1; border-radius: 50px; background: #c4c6cf; }
        .hist-status {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 12px; font-weight: 600; color: #74777f;
        }
        .hist-review {
          border: 1px solid #c4c6cf;
          color: #43474e; background: none;
          border-radius: 50px;
          padding: 5px 14px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 12px; font-weight: 500;
          cursor: pointer; text-decoration: none;
          transition: background 0.15s;
          display: inline-block;
        }
        .hist-review:hover { background: #eff4ff; }

        /* ── Empty state ── */
        .db-empty {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e5eeff;
          padding: 32px;
          text-align: center;
          color: #74777f;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 14px;
        }

        @media (max-width: 767px) {
          .db-hero { padding: 28px 20px 60px; }
          .db-hero-title { font-size: 30px; }
          .db-hero-actions { display: none; }
          .db-content { padding: 0 16px 60px; margin-top: -28px; }
          .db-grid { grid-template-columns: 1fr; }
          .db-section-title { font-size: 22px; }
        }
      `}</style>

      {/* Hero */}
      <div className="db-hero">
        <div className="db-hero-deco">
          <span className="material-symbols-outlined" style={{ fontSize: '180px', color: '#feba48', fontVariationSettings: "'FILL' 1" }}>
            local_fire_department
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: '110px', color: '#ffffff', marginLeft: '-30px', marginTop: '60px', fontVariationSettings: "'FILL' 1" }}>
            chat_bubble
          </span>
        </div>

        <h2 className="db-hero-title">Halo, {firstName}!</h2>
        <p className="db-hero-sub">
          Siap untuk memetik potensimu hari ini? Pilih paket di bawah ini untuk memulai.
        </p>

        <div className="db-hero-actions">
          <SyncButton />
        </div>
      </div>

      {/* Content */}
      <div className="db-content">

        {/* Paket Aktif */}
        <section className="db-section">
          <div className="db-section-header">
            <h3 className="db-section-title">Paket Aktif</h3>
          </div>

          {activePackages.length === 0 ? (
            <div className="db-empty">
              Belum ada paket asesmen aktif yang ditugaskan untuk Anda.
            </div>
          ) : (
            <div className="db-grid">
              {activePackages.map((pkg) => {
                const isLit = pkg.subject === 'literasi';
                const cls = isLit ? 'lit' : 'num';
                const icon = isLit ? 'menu_book' : 'calculate';
                const total = pkg.levelsTotal || 5;
                const done = pkg.levelsCompleted || 0;
                const isActive = pkg.status === 'Aktif';

                return (
                  <div key={pkg.id} className="pkg-card">
                    <div className="pkg-card-top">
                      <div className="pkg-card-left">
                        <div className={`pkg-icon ${cls}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{icon}</span>
                        </div>
                        <div className="pkg-title">{pkg.title}</div>
                      </div>
                      <span className={`pkg-badge ${cls}`}>{isLit ? 'Literasi' : 'Numerasi'}</span>
                    </div>

                    <div className="pkg-progress">
                      <div className="pkg-progress-header">
                        <span className="pkg-progress-label">Progress Level</span>
                        <span className="pkg-progress-count">{done}/{total} Selesai</span>
                      </div>
                      <div className="pkg-bars">
                        {Array.from({ length: total }).map((_, i) => (
                          <div key={i} className={`pkg-bar ${i < done ? 'filled' : 'empty'}`} />
                        ))}
                      </div>
                    </div>

                    <div className="pkg-footer">
                      <div>
                        <div className="pkg-status-label">Status</div>
                        <span className={`pkg-status-pill ${isActive ? 'active' : 'inactive'}`}>
                          <span className={`pkg-status-dot ${isActive ? 'active' : 'inactive'}`} />
                          {isActive ? 'Aktif' : 'Belum Mulai'}
                        </span>
                        <div className="pkg-valid">
                          {pkg.validUntil
                            ? `Valid s/d ${new Date(pkg.validUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                            : 'Berlaku Selamanya'}
                        </div>
                      </div>
                      <Link href={`/siswa/paket/${pkg.id}`} className="pkg-cta">
                        Lihat Level
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Riwayat Paket */}
        <section className="db-section">
          <div className="db-section-header">
            <h3 className="db-section-title">Riwayat Paket</h3>
            {historyPackages.length > 3 && (
              <Link href="/siswa/riwayat" className="db-see-all">Lihat Semua</Link>
            )}
          </div>

          {historyPackages.length === 0 ? (
            <div className="db-empty">Belum ada riwayat asesmen yang diselesaikan.</div>
          ) : (
            <div className="db-grid">
              {historyPackages.slice(0, 3).map((pkg) => {
                const icon = pkg.subject === 'literacy' ? 'menu_book' : 'calculate';
                const total = pkg.levelsTotal || 5;
                const done = pkg.levelsCompleted || total;
                const isTuntas = pkg.status === 'Selesai';

                return (
                  <div key={pkg.id} className="hist-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div className="hist-icon">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
                      </div>
                      <div className="hist-title">{pkg.title}</div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div className="pkg-progress-header" style={{ marginBottom: '6px' }}>
                        <span className="pkg-progress-label">Selesai</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#74777f', fontFamily: 'var(--font-rubik)' }}>{done}/{total} Selesai</span>
                      </div>
                      <div className="pkg-bars">
                        {Array.from({ length: total }).map((_, i) => (
                          <div key={i} className="hist-bar" />
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #e5eeff', marginTop: 'auto' }}>
                      <span className="hist-status">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          {isTuntas ? 'check_circle' : 'timer_off'}
                        </span>
                        {isTuntas ? 'Tuntas' : 'Kedaluwarsa'}
                      </span>
                      <Link href={`/siswa/paket/${pkg.id}`} className="hist-review">Review</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </StudentLayout>
  );
}
