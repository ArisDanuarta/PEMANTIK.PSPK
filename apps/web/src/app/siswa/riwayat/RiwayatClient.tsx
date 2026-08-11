'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type HistoryItem = {
  id: string; score: number; passingThreshold: number; isPass: boolean;
  isCheatFailed: boolean; cheatStrikes: number;
  phase: string; attemptNumber: number; startedAt: string | null;
  syncStatus: string; levelNumber: number; levelId: string;
  categoryId: string; categoryName: string; subjectArea: string;
  successMessage: string | null; failureMessage: string | null;
};

const PHASE_ACCENT_COLORS = ['#60a5fa','#818cf8','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6'];

function formatDate(iso: string | null) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDateTime(iso: string | null) {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function SyncBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string; icon: string; label: string }> = {
    synced:  { bg: '#d1fae5', color: '#065f46', icon: 'cloud_done',  label: 'Tersinkron'     },
    pending: { bg: '#fef3c7', color: '#92400e', icon: 'schedule',    label: 'Tersimpan Lokal'},
    error:   { bg: '#ffe4e6', color: '#9f1239', icon: 'error',       label: 'Gagal Unggah'  },
  };
  const c = configs[status] || configs.error;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', borderRadius:'50px', padding:'4px 10px', background:c.bg, color:c.color, fontSize:'12px', fontWeight:600 }}>
      <span className="material-symbols-outlined" style={{ fontSize:'14px', fontVariationSettings:"'FILL' 1" }}>{c.icon}</span>
      {c.label}
    </span>
  );
}

export default function RiwayatClient({ history }: { history: HistoryItem[] }) {
  const [selected, setSelected] = useState<HistoryItem | null>(history[0] ?? null);
  const [open, setOpen] = useState(history.length > 0);

  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});

  const groupedPhases = new Map<string, Map<string, HistoryItem[]>>();
  for (const item of history) {
    if (!groupedPhases.has(item.phase)) groupedPhases.set(item.phase, new Map());
    const phaseMap = groupedPhases.get(item.phase)!;
    if (!phaseMap.has(item.categoryName)) phaseMap.set(item.categoryName, []);
    phaseMap.get(item.categoryName)!.push(item);
  }

  const phases = Array.from(groupedPhases.entries()).map(([phase, catMap]) => {
    let count = 0;
    const categories = Array.from(catMap.entries()).map(([categoryName, items]) => {
      count += items.length;
      return { categoryName, items };
    });
    return { phase, count, categories };
  });

  function togglePhase(phase: string) {
    setCollapsedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
  }

  function handleCard(item: HistoryItem) {
    if (selected?.id === item.id && open) { setOpen(false); }
    else { setSelected(item); setOpen(true); }
  }

  return (
    <>
      <style>{`
        .rw-layout { display:flex; min-height:100%; font-family:var(--font-rubik),system-ui,sans-serif; position:relative; }
        .rw-main { flex:1; padding:36px 40px 80px; transition:padding-right .3s ease; min-width:0; }
        .rw-main.rw-open { padding-right:380px; }
        .rw-h1 { font-family:var(--font-noto-serif),Georgia,serif; font-size:32px; font-weight:700; color:#001934; margin-bottom:6px; }
        .rw-sub { font-size:15px; color:#43474e; margin-bottom:36px; }
        .rw-phase-hdr { position:sticky; top:0; z-index:10; background:rgba(248,249,255,.92); backdrop-filter:blur(8px); padding:14px 10px; border-bottom:2px solid #dce9ff; display:flex; align-items:center; gap:10px; margin-bottom:16px; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
        .rw-phase-hdr:hover { background: rgba(229, 238, 255, 0.9); }
        .rw-phase-dot { width:8px; height:24px; border-radius:4px; flex-shrink:0; }
        .rw-phase-title { font-family:var(--font-noto-serif),Georgia,serif; font-size:22px; font-weight:700; color:#001934; }
        .rw-category-title { font-family:var(--font-noto-serif),Georgia,serif; font-size:18px; font-weight:600; color:#001934; margin-bottom:12px; padding-left:14px; border-left:4px solid; display: flex; align-items: center; }
        .rw-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:32px; }
        .rw-card { background:#fff; border-radius:20px; padding:22px 20px 18px; border-top:4px solid #e5eeff; box-shadow:0 4px 20px rgba(16,46,80,.07); cursor:pointer; transition:transform .2s,box-shadow .2s; display:flex; flex-direction:column; }
        .rw-card:hover { transform:translateY(-3px); box-shadow:0 8px 28px rgba(16,46,80,.12); }
        .rw-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px; }
        .rw-card-title { font-family:var(--font-noto-serif),Georgia,serif; font-size:17px; font-weight:700; color:#001934; line-height:1.3; }
        .rw-card-level { background:#f1f3f5; color:#001934; border-radius:50px; padding:3px 10px; font-size:12px; font-weight:700; white-space:nowrap; flex-shrink:0; }
        .rw-card-date { display:flex; align-items:center; gap:6px; font-size:13px; color:#74777f; margin-bottom:14px; }
        .rw-card-footer { display:flex; justify-content:space-between; align-items:center; margin-top:auto; }
        .rw-chevron { width:36px; height:36px; border-radius:50%; border:1.5px solid #c4c6cf; display:flex; align-items:center; justify-content:center; color:#001934; transition:background .15s; }
        .rw-card:hover .rw-chevron { background:#e5eeff; }
        /* panel */
        .rw-panel { position:fixed; right:0; top:0; width:340px; height:100vh; background:#fff; box-shadow:-8px 0 32px rgba(16,46,80,.12); border-left:1px solid #e5eeff; display:flex; flex-direction:column; z-index:40; transform:translateX(100%); transition:transform .3s cubic-bezier(.4,0,.2,1); }
        .rw-panel.rw-open { transform:translateX(0); }
        .rw-panel-hdr { padding:20px 20px 16px; border-bottom:1px solid #e5eeff; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; background:#f8f9ff; }
        .rw-panel-htitle { font-family:var(--font-noto-serif),Georgia,serif; font-size:20px; font-weight:700; color:#001934; }
        .rw-close { width:36px; height:36px; border-radius:50%; border:none; background:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#74777f; transition:background .15s,color .15s; }
        .rw-close:hover { background:#e5eeff; color:#001934; }
        .rw-body { flex:1; overflow-y:auto; padding:28px 20px; display:flex; flex-direction:column; align-items:center; }
        .rw-badge { width:120px; height:120px; min-width:120px; min-height:120px; flex-shrink:0; border-radius:50%; background:#001934; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; margin-bottom:20px; position:relative; box-shadow:0 6px 20px rgba(0,25,52,.25); text-align:center; }
        .rw-badge::after { content:''; position:absolute; inset:-6px; border-radius:50%; border:2px solid rgba(0,25,52,.15); }
        .rw-badge-lbl { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; opacity:.7; margin-bottom:2px; }
        .rw-badge-num { font-family:var(--font-noto-serif),Georgia,serif; font-size:48px; font-weight:700; line-height:1; }
        .rw-score { width:80px; height:80px; min-width:80px; min-height:80px; flex-shrink:0; border-radius:50%; border:4px solid #e5eeff; display:flex; align-items:center; justify-content:center; font-family:var(--font-noto-serif),Georgia,serif; font-size:22px; font-weight:700; margin-bottom:16px; }
        .rw-info-box { background:#f8f9ff; border:1px solid #e5eeff; border-radius:16px; padding:18px 16px; width:100%; }
        .rw-info-box h3 { font-family:var(--font-noto-serif),Georgia,serif; font-size:15px; font-weight:700; color:#001934; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #e5eeff; }
        .rw-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .rw-info-lbl { font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#74777f; font-weight:600; margin-bottom:3px; }
        .rw-info-val { font-size:14px; font-weight:600; color:#0b1c30; }
        .rw-divider { margin-top:14px; padding-top:14px; border-top:1px solid #e5eeff; }
        .rw-foot { padding:16px 20px; border-top:1px solid #e5eeff; display:flex; flex-direction:column; gap:10px; flex-shrink:0; background:#f8f9ff; }
        .rw-btn-primary { width:100%; padding:12px; border-radius:50px; border:none; background:#001934; color:#fff; font-family:var(--font-rubik),system-ui,sans-serif; font-size:13px; font-weight:700; cursor:pointer; transition:background .15s; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px; }
        .rw-btn-primary:hover { background:#102e50; }
        .rw-btn-ghost { width:100%; padding:12px; border-radius:50px; border:2px solid #001934; background:none; color:#001934; font-family:var(--font-rubik),system-ui,sans-serif; font-size:13px; font-weight:700; cursor:pointer; transition:background .15s; }
        .rw-btn-ghost:hover { background:#e5eeff; }
        .rw-empty { text-align:center; padding:80px 40px; color:#74777f; }
        @media(max-width:1023px){ .rw-main.rw-open{ padding-right:40px; } .rw-panel{ max-width:360px; } }
        @media(max-width:767px){ .rw-main{ padding:20px 16px 60px; } .rw-grid{ grid-template-columns:1fr; } .rw-h1{ font-size:24px; } .rw-panel{ width:100%; max-width:100%; top:auto; bottom:0; height:85vh; border-left:none; border-top:1px solid #e5eeff; border-radius:24px 24px 0 0; transform:translateY(100%); } .rw-panel.rw-open{ transform:translateY(0); } }
      `}</style>

      <div className="rw-layout">
        {/* MAIN */}
        <div className={`rw-main${open ? ' rw-open' : ''}`}>
          <h1 className="rw-h1">Riwayat Asesmen</h1>
          <p className="rw-sub">Lihat semua hasil asesmen yang telah kamu kerjakan.</p>

          {history.length === 0 ? (
            <div className="rw-empty">
              <span className="material-symbols-outlined" style={{ fontSize:'64px', color:'#c4c6cf', display:'block', marginBottom:'16px' }}>history</span>
              <div style={{ fontFamily:'var(--font-noto-serif)', fontSize:'22px', color:'#43474e', marginBottom:'8px' }}>Belum ada riwayat</div>
              <p style={{ fontSize:'14px' }}>Kamu belum menyelesaikan asesmen apapun.</p>
              <Link href="/siswa/dashboard" style={{ display:'inline-block', marginTop:'20px', background:'#001934', color:'#fff', borderRadius:'50px', padding:'12px 28px', fontWeight:700, fontSize:'14px', textDecoration:'none' }}>
                Ke Dashboard
              </Link>
            </div>
          ) : phases.map((phaseData, pi) => {
            const isCollapsed = collapsedPhases[phaseData.phase];
            const phaseColor = PHASE_ACCENT_COLORS[pi % PHASE_ACCENT_COLORS.length];
            return (
              <section key={phaseData.phase} style={{ marginBottom: '32px' }}>
                <div className="rw-phase-hdr" onClick={() => togglePhase(phaseData.phase)}>
                  <div className="rw-phase-dot" style={{ background: phaseColor }} />
                  <span className="rw-phase-title">{phaseData.phase}</span>
                  <span style={{ fontSize:'13px', color:'#74777f', fontWeight:600, marginLeft:'auto' }}>{phaseData.count} sesi</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#001934', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.2s', marginLeft: '8px' }}>
                    expand_more
                  </span>
                </div>
                
                {!isCollapsed && (
                  <div>
                    {phaseData.categories.map((cat) => (
                      <div key={cat.categoryName}>
                        <h4 className="rw-category-title" style={{ borderLeftColor: phaseColor }}>
                          {cat.categoryName}
                          <span style={{ fontSize: '13px', color: '#74777f', fontWeight: 600, marginLeft: '8px', background: '#e5eeff', padding: '2px 8px', borderRadius: '50px' }}>
                            {cat.items.length} Sesi
                          </span>
                        </h4>
                        <div className="rw-grid">
                          {cat.items.map((item) => (
                            <div key={item.id} className="rw-card" style={{ borderTopColor: item.isPass ? '#34d399' : '#fb7185' }} onClick={() => handleCard(item)}>
                              <div className="rw-card-top">
                                <div className="rw-card-title">{item.categoryName}</div>
                                <div className="rw-card-level">Level {item.levelNumber}</div>
                              </div>
                              <div className="rw-card-date">
                                <span className="material-symbols-outlined" style={{ fontSize:'14px' }}>calendar_month</span>
                                {formatDate(item.startedAt)}
                              </div>
                              <div className="rw-card-footer">
                                <SyncBadge status={item.syncStatus} />
                                <div className="rw-chevron">
                                  <span className="material-symbols-outlined" style={{ fontSize:'20px' }}>chevron_right</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* PANEL */}
        <aside className={`rw-panel${open ? ' rw-open' : ''}`}>
          <div className="rw-panel-hdr">
            <span className="rw-panel-htitle">Detail Riwayat</span>
            <button className="rw-close" onClick={() => setOpen(false)} aria-label="Tutup">
              <span className="material-symbols-outlined" style={{ fontSize:'22px' }}>close</span>
            </button>
          </div>

          {selected && (
            <>
              <div className="rw-body">
                <div className="rw-badge" style={{ background: selected.isPass ? '#001934' : '#ba1a1a' }}>
                  <span className="rw-badge-lbl">Level Dicapai</span>
                  <span className="rw-badge-num">{selected.levelNumber}</span>
                </div>

                <div className="rw-score" style={{ borderColor: selected.isPass ? '#10B981' : '#ba1a1a', color: selected.isPass ? '#10B981' : '#ba1a1a' }}>
                  {Math.round(selected.score)}
                </div>

                <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', borderRadius:'50px', padding:'5px 14px', marginBottom:'20px', background: selected.isCheatFailed ? '#ffe4e6' : (selected.isPass ? '#d1fae5' : '#ffe4e6'), color: selected.isCheatFailed ? '#9f1239' : (selected.isPass ? '#065f46' : '#9f1239'), fontSize:'13px', fontWeight:700 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'16px', fontVariationSettings:"'FILL' 1" }}>
                    {selected.isCheatFailed ? 'gpp_bad' : (selected.isPass ? 'check_circle' : 'cancel')}
                  </span>
                  {selected.isCheatFailed ? 'Pelanggaran Anti-Cheat' : (selected.isPass ? 'Lulus' : 'Tidak Lulus')}
                </span>

                <div className="rw-info-box">
                  <h3>Informasi Asesmen</h3>
                  <div className="rw-info-grid">
                    <div><div className="rw-info-lbl">Kategori / Paket</div><div className="rw-info-val">{selected.categoryName}</div></div>
                    <div><div className="rw-info-lbl">Fase / Sesi</div><div className="rw-info-val">{selected.phase}</div></div>
                    <div><div className="rw-info-lbl">Mata Uji</div><div className="rw-info-val" style={{ textTransform:'capitalize' }}>{selected.subjectArea}</div></div>
                    <div><div className="rw-info-lbl">Percobaan Ke</div><div className="rw-info-val">#{selected.attemptNumber}</div></div>
                  </div>
                  <div className="rw-divider">
                    <div className="rw-info-lbl">Waktu Pengerjaan</div>
                    <div className="rw-info-val" style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'3px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'14px', color:'#001934' }}>calendar_today</span>
                      {formatDateTime(selected.startedAt)}
                    </div>
                  </div>
                  <div className="rw-divider">
                    <div className="rw-info-lbl">Status Sinkronisasi</div>
                    <div style={{ marginTop:'6px' }}><SyncBadge status={selected.syncStatus} /></div>
                  </div>
                  {/* Pesan hasil asesmen */}
                  <div className="rw-divider">
                    <div className="rw-info-lbl" style={{ marginBottom: '8px' }}>
                      {selected.isCheatFailed ? '⚠️ Alasan Pembatalan' : (selected.isPass ? '✅ Pesan Keberhasilan' : '📌 Pesan Evaluasi')}
                    </div>
                    <div style={{
                      background: selected.isCheatFailed ? '#FCE8E8' : (selected.isPass ? '#d1fae5' : '#fef3c7'),
                      border: `1px solid ${selected.isCheatFailed ? '#BA1A1A' : (selected.isPass ? '#10B981' : '#f59e0b')}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      color: selected.isCheatFailed ? '#BA1A1A' : (selected.isPass ? '#065f46' : '#92400e'),
                      fontWeight: 500,
                    }}>
                      {selected.isCheatFailed
                        ? `Sesi digagalkan karena terdeteksi ${selected.cheatStrikes} kali keluar dari aplikasi/layar saat asesmen berlangsung.`
                        : (selected.isPass
                          ? (selected.successMessage || 'Selamat! Level berikutnya kini terbuka. Terus tingkatkan kemampuanmu.')
                          : (selected.failureMessage || 'Kamu perlu mengulang level ini. Pelajari kembali materi dan tingkatkan fokusmu sebelum mencoba lagi.')
                        )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rw-foot">
                <Link href={`/siswa/asesmen/${selected.id}/hasil`} className="rw-btn-primary">
                  <span className="material-symbols-outlined" style={{ fontSize:'16px' }}>open_in_new</span>
                  Lihat Hasil Lengkap
                </Link>
                <button className="rw-btn-ghost" onClick={() => setOpen(false)}>Tutup Detail</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
