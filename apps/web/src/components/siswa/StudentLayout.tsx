'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutStudent } from '@/app/actions/studentAuth';

export default function StudentLayout({
  children,
  studentName = 'Siswa',
  studentNisn = '-',
}: {
  children: React.ReactNode;
  studentName?: string;
  studentNisn?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initial = studentName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logoutStudent();
    router.push('/siswa/login');
  };

  return (
    <>
      {/* Material Symbols */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      <style>{`
        /* ── Siswa Layout ── */
        .sl-root {
          min-height: 100vh;
          background: #f8f9ff;
          color: #0b1c30;
          font-family: var(--font-rubik), system-ui, sans-serif;
          overflow-x: hidden;
        }
        /* ── Mobile TopBar ── */
        .sl-topbar {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 64px;
          background: #001934;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          z-index: 50;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }
        .sl-topbar-brand {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
        }
        .sl-topbar-actions { display: flex; align-items: center; gap: 14px; }
        .sl-icon-btn {
          background: none; border: none; cursor: pointer;
          color: #ffffff; display: flex; align-items: center;
          transition: color 0.15s;
        }
        .sl-icon-btn:hover { color: #feba48; }
        .sl-avatar-sm {
          width: 32px; height: 32px; border-radius: 50%;
          background: #102e50; border: 2px solid #feba48;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 13px; color: #ffffff;
        }

        /* ── Sidebar ── */
        .sl-sidebar {
          display: none;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0;
          width: 240px; height: 100vh;
          background: #001934;
          z-index: 40;
          box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          overflow-y: auto;
        }
        .sl-sidebar-top {
          padding: 28px 24px 20px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
        }
        .sl-sidebar-logo {
          width: 64px; height: 64px; border-radius: 50%;
          background: #e5eeff; overflow: hidden;
          border: 2px solid #feba48;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .sl-sidebar-logo img { width: 100%; height: 100%; object-fit: cover; }
        .sl-sidebar-name {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 22px; color: #feba48; font-weight: 700;
          margin-bottom: 2px;
        }
        .sl-sidebar-sub { font-size: 13px; color: rgba(255,255,255,0.65); margin-bottom: 16px; }
        .sl-start-btn {
          width: 100%;
          background: #feba48; color: #714b00;
          border: none; border-radius: 50px;
          padding: 9px 16px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 13px; font-weight: 700;
          cursor: pointer; transition: background 0.15s;
          box-shadow: 0 3px 10px rgba(254,186,72,0.3);
        }
        .sl-start-btn:hover { background: #f5ac30; }

        .sl-nav { flex: 1; padding: 8px 8px; }
        .sl-nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 16px; border-radius: 10px;
          text-decoration: none;
          font-size: 14px; font-weight: 500;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 2px;
        }
        .sl-nav-item.active { background: #feba48; color: #001934; }
        .sl-nav-item:not(.active) { color: rgba(255,255,255,0.75); }
        .sl-nav-item:not(.active):hover { background: #102e50; color: #ffffff; }

        .sl-sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .sl-sync-pill {
          display: flex; align-items: center; gap: 10px;
          background: #eff4ff; border-radius: 10px;
          padding: 8px 12px; margin-bottom: 14px;
        }
        .sl-sync-icon {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(16,46,80,0.15);
          display: flex; align-items: center; justify-content: center;
        }
        .sl-sync-label { font-size: 13px; font-weight: 600; color: #001934; line-height: 1; }
        .sl-sync-time { font-size: 11px; color: #43474e; margin-top: 2px; }
        .sl-profile-row { display: flex; align-items: center; gap: 12px; }
        .sl-avatar-md {
          width: 40px; height: 40px; border-radius: 50%;
          background: #e5eeff; border: 1px solid #c4c6cf;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 16px; color: #102e50;
          flex-shrink: 0;
        }
        .sl-profile-name { font-size: 13px; font-weight: 700; color: #ffffff; line-height: 1; }
        .sl-profile-nisn { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 3px; }

        /* ── Main ── */
        .sl-body { display: flex; min-height: 100vh; }
        .sl-main { flex: 1; min-width: 0; }

        @media (min-width: 768px) {
          .sl-topbar { display: none !important; }
          .sl-sidebar { display: flex; }
          .sl-body { padding-top: 0; }
          .sl-main { margin-left: 240px; }
          .sl-root .sl-body { padding-top: 0; }
        }
        @media (max-width: 767px) {
          .sl-topbar { display: flex; }
          .sl-body { padding-top: 64px; }
        }
      `}</style>

      <div className="sl-root">
        {/* TopBar mobile */}
        <header className="sl-topbar">
          <span className="sl-topbar-brand">Pemantik</span>
          <div className="sl-topbar-actions">
            <button className="sl-icon-btn" aria-label="Sync">
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>sync</span>
            </button>
            <button className="sl-icon-btn" aria-label="Notifikasi">
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>notifications</span>
            </button>
            <div className="sl-avatar-sm">{initial}</div>
          </div>
        </header>

        <div className="sl-body">
          {/* Sidebar */}
          <nav className="sl-sidebar">
            <div className="sl-sidebar-top">
              <div className="sl-sidebar-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/placeholder.jpg"
                  alt="Student Avatar Placeholder"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="sl-sidebar-name">Pemantik</div>
              <div className="sl-sidebar-sub">Student Assessment</div>
            </div>

            <div className="sl-nav">
              <Link
                href="/siswa/dashboard"
                className={`sl-nav-item${pathname === '/siswa/dashboard' ? ' active' : ''}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>home</span>
                Beranda
              </Link>
              <Link
                href="/siswa/riwayat"
                className={`sl-nav-item${pathname === '/siswa/riwayat' ? ' active' : ''}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
                Riwayat
              </Link>
              <Link
                href="/siswa/profil"
                className={`sl-nav-item${pathname === '/siswa/profil' ? ' active' : ''}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
                Profil
              </Link>
              
              <button
                onClick={handleLogout}
                className="sl-nav-item"
                style={{ 
                  width: '100%', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  textAlign: 'left', 
                  color: '#ffb4a8', // Softer red for dark bg
                  marginTop: '1rem'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
                Logout
              </button>
            </div>

            <div className="sl-sidebar-footer">
              <div className="sl-sync-pill">
                <div className="sl-sync-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#102e50' }}>cloud_done</span>
                </div>
                <div>
                  <div className="sl-sync-label">Tersinkronisasi</div>
                  <div className="sl-sync-time">Baru saja</div>
                </div>
              </div>
              <div className="sl-profile-row">
                <div className="sl-avatar-md">{initial}</div>
                <div>
                  <div className="sl-profile-name">{studentName}</div>
                  <div className="sl-profile-nisn">NISN: {studentNisn}</div>
                </div>
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="sl-main">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
