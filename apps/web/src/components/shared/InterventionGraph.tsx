"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import {
  getInterventionTagOverview,
  getInterventionGraphByTag,
  type TagCluster,
  type CrossTagLink,
  type GraphNode,
  type GraphEdge,
} from "@/app/actions/interventions";

// ═════════════════════════════════════════════════════════════════════════
//  PSPK KNOWLEDGE GRAPH — implementasi tunggal (konsolidasi)
// ═════════════════════════════════════════════════════════════════════════
//
// File ini menggabungkan DUA implementasi yang sebelumnya terpisah:
//   1. InterventionGraph.tsx   (D3 murni, circle-packing deterministik,
//                                dipakai untuk peta Level-0 blob per-tag
//                                + drilldown Level-1 per-tag)
//   2. RawInterventionGraph.tsx (React Flow + d3-force, dipakai untuk
//                                 render graph relasi penuh: komunitas →
//                                 sekolah → intervensi → tag)
//
// Alasan konsolidasi:
//   - Dua bahasa visual berbeda (cream/editorial vs dark/neon) membuat
//     produk terasa tidak konsisten saat user berpindah rute.
//   - d3-force di versi lama TIDAK deterministik dan (bug penting) di-
//     restart total setiap kali user mengetik di search box / klik
//     filter → seluruh graph "meledak" & re-layout dari posisi acak.
//     Ini dihapus total di sini: layout hanya dihitung ulang saat DATA
//     berubah, bukan saat highlight/filter berubah.
//   - Circle-packing deterministik (spiral golden-angle) dipertahankan
//     karena menjamin TIDAK ADA tabrakan node — tapi sekarang dipakai
//     juga untuk graph relasi penuh (bukan cuma drilldown per-tag),
//     dengan pendekatan "clustered packing": komunitas dikelompokkan,
//     lalu sekolah & intervensi dipaketkan di sekitar induknya, lalu
//     tag dipaketkan sebagai "sabuk" di sekitar seluruh cluster.
//
// Yang ditambahkan supaya UI terasa lebih hidup:
//   - Entrance animation (fade + rise) berjenjang (staggered) tiap kali
//     data baru masuk.
//   - Hover state yang reaktif: node membesar sedikit + garis yang
//     terhubung ikut menyala, bukan cuma bereaksi saat diklik.
//   - Transisi Level-0 → Level-1 berupa zoom-in halus ke blob yang
//     diklik sebelum cross-fade ke drilldown (tidak lompat/instan).
//   - Cross-link (garis putus-putus antar tag) punya animasi "energi
//     berjalan" (stroke-dashoffset) — hanya dipakai pada garis yang
//     jumlahnya sedikit (Level-0 & hub Level-1) supaya tetap ringan.
//   - Angka laporan pakai count-up animation saat pertama muncul.
//   - Loading state berupa skeleton blob berdenyut, bukan teks polos.
//   - Panel inspector disatukan & diperkaya (4 field narasi lengkap +
//     fase + tanggal), dipakai baik di drilldown per-tag maupun di
//     graph relasi penuh.
//
// Ekspor:
//   export default InterventionGraph        → peta Level-0 (blob per tag)
//                                              + drilldown Level-1, self-
//                                              fetching lewat server actions.
//                                              Drop-in replacement untuk
//                                              pemakaian InterventionGraph
//                                              yang lama.
//   export function KnowledgeGraphFullView  → graph relasi penuh, menerima
//                                              initialNodes/initialEdges
//                                              sebagai props — pengganti
//                                              RawInterventionGraph lama.
//                                              Ganti import di rute yang
//                                              masih pakai RawInterventionGraph
//                                              menjadi:
//                                                import { KnowledgeGraphFullView }
//                                                  from "./InterventionGraph";
//                                              lalu RawInterventionGraph.tsx
//                                              & dependency @xyflow/react +
//                                              d3-force pada file itu bisa
//                                              dihapus.
// ═════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────
const FONT_HEAD = "'Lora', serif";
const FONT_BODY = "'Inter', sans-serif";

const PRIMARY = { navy: "#102e50", gold: "#f2af3e", maroon: "#a8281c" };
const SECONDARY = { orange: "#df632f", teal: "#0874aa", darkRed: "#8e2d3f", lightGold: "#f4b867" };
const PALETTE = [
  PRIMARY.navy, PRIMARY.gold, PRIMARY.maroon,
  SECONDARY.orange, SECONDARY.teal, SECONDARY.darkRed, SECONDARY.lightGold,
  "#1a4878", "#c72d1e",
];
const INK = "#1e293b";
const MUTED = "#64748b";
const CANVAS_BG = "#fafaf8";
const CANVAS_BORDER = "#e6e1d6";

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const ROLE_LABEL: Record<string, string> = {
  community: "Komunitas", school: "Sekolah", intervention: "Intervensi", tag: "Tag",
};
const ROLE_BADGE_BG: Record<string, string> = {
  community: "#e7edf5", school: "#fdf1de", intervention: "#fff0f0", tag: "#f6e9e7",
};
const ROLE_BADGE_COLOR: Record<string, string> = {
  community: PRIMARY.navy, school: "#8a6414", intervention: SECONDARY.darkRed, tag: PRIMARY.maroon,
};
const ROLE_STYLE: Record<string, { fill: string; stroke: string }> = {
  community: { fill: "#e7edf5", stroke: PRIMARY.navy },
  school: { fill: "#fdf1de", stroke: PRIMARY.gold },
  intervention: { fill: "#ffffff", stroke: SECONDARY.teal },
  tag: { fill: "#f6e9e7", stroke: PRIMARY.maroon },
};
const ROLE_GEOM: Record<string, { w: number; h: number; packR: number; rotate: number; rx: number }> = {
  community: { w: 128, h: 68, packR: 92, rotate: 0, rx: 16 },
  school: { w: 92, h: 92, packR: 82, rotate: 45, rx: 12 },
  intervention: { w: 18, h: 18, packR: 22, rotate: 0, rx: 4 },
  tag: { w: 78, h: 78, packR: 70, rotate: 45, rx: 10 },
};
const HUB_PACK_R = 96;

// ─────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────
const IconWeb = ({ size = 34, color = MUTED }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.4}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 3.8 6 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-6-3.8-9s1.3-6.3 3.8-9Z" />
  </svg>
);
const IconTap = ({ size = 30, color = MUTED }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.4}>
    <path d="M9 12.5V6a1.5 1.5 0 0 1 3 0v5" />
    <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M15 11.2V7a1.5 1.5 0 0 1 3 0v7c0 3.6-2.5 6.5-6 6.5-2 0-3.3-.7-4.6-2.3L4.6 14a1.4 1.4 0 0 1 2-2l2.4 1.9" />
  </svg>
);
const IconSearch = ({ size = 15, color = MUTED }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────
// GEOMETRY ENGINE — circle packing deterministik (spiral golden-angle)
// ─────────────────────────────────────────────────────────────────────────
interface PackItem { id: string; r: number; }
interface PackedItem extends PackItem { x: number; y: number; }

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Menempatkan tiap item di sepanjang spiral golden-angle, mulai dari radius
 * kecil dan membesar sampai tidak bertabrakan dengan item lain yang sudah
 * ditempatkan (termasuk "obstacle" dari preplaced, mis. hub / cluster lain).
 * Deterministik & selalu menjamin jarak antar-pusat >= r1+r2+padding.
 */
function packCircles(items: PackItem[], cx: number, cy: number, padding = 16, preplaced: PackedItem[] = []): PackedItem[] {
  const placed: PackedItem[] = [...preplaced];
  const startIndex = preplaced.length;
  items.forEach((item, i) => {
    let angle = (i + startIndex) * GOLDEN_ANGLE;
    let radius = item.r + padding * 0.5;
    let x = cx, y = cy;
    let tries = 0;
    if (placed.length === 0) {
      placed.push({ ...item, x: cx, y: cy });
      return;
    }
    while (tries < 4000) {
      x = cx + Math.cos(angle) * radius;
      y = cy + Math.sin(angle) * radius;
      const collides = placed.some(p => Math.hypot(p.x - x, p.y - y) < p.r + item.r + padding);
      if (!collides) break;
      radius += Math.max(5, item.r * 0.12);
      angle += GOLDEN_ANGLE * 0.4;
      tries++;
    }
    placed.push({ ...item, x, y });
  });
  return placed.slice(startIndex);
}

type Pt = [number, number];

/** Sebaran titik merata di dalam piringan radius maxR (pola bunga matahari). */
function phyllotaxis(n: number, maxR: number): Pt[] {
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => {
    const r = maxR * Math.sqrt((i + 0.5) / n);
    const a = i * GOLDEN_ANGLE;
    return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
  });
}

function cross2(o: Pt, a: Pt, b: Pt) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
function convexHull(pts: Pt[]): Pt[] {
  const s = [...pts].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  if (s.length <= 2) return s;
  const lo: Pt[] = [], hi: Pt[] = [];
  for (const p of s) { while (lo.length >= 2 && cross2(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (hi.length >= 2 && cross2(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  hi.pop(); lo.pop(); return [...lo, ...hi];
}
function centroid(pts: Pt[]): Pt {
  const n = pts.length, s = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]] as Pt, [0, 0] as Pt);
  return [s[0] / n, s[1] / n];
}
function closedCurve(pts: Pt[]): string {
  const n = pts.length; if (n < 3) return "";
  const get = (i: number) => pts[((i % n) + n) % n];
  let d = `M ${pts[0][0]},${pts[0][1]} `;
  for (let i = 0; i < n; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]} `;
  }
  return d + "Z";
}
function blobPath(dots: Pt[], pad = 25, seed = 1): string {
  if (!dots.length) return "";
  const jitter = (i: number) => ((Math.sin(seed * 999 + i * 57) + 1) / 2);
  if (dots.length < 4) {
    const [cx, cy] = dots.length === 1 ? dots[0] : centroid(dots);
    const r = dots.length === 1 ? pad * 2.2 : Math.hypot(dots[0][0] - dots[dots.length - 1][0], dots[0][1] - dots[dots.length - 1][1]) / 2 + pad * 1.6;
    const ring: Pt[] = [];
    let i = 0;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4, i++) {
      const jr = r * (0.85 + jitter(i) * 0.3);
      ring.push([cx + jr * Math.cos(a), cy + jr * Math.sin(a)]);
    }
    return closedCurve(ring);
  }
  const hull = convexHull(dots); const ctr = centroid(hull);
  const padded: Pt[] = hull.map(([x, y], i) => {
    const dx = x - ctr[0], dy = y - ctr[1], l = Math.hypot(dx, dy) || 1;
    const jpad = pad * (0.9 + jitter(i) * 0.2);
    return [x + (dx / l) * jpad, y + (dy / l) * jpad];
  });
  return closedCurve(padded);
}

// ─────────────────────────────────────────────────────────────────────────
// ANIMATION HELPERS ("kehidupan" UI)
// ─────────────────────────────────────────────────────────────────────────

/** Fade + rise entrance, berjenjang (staggered) per index. */
function entranceRise<T extends d3.BaseType, D>(
  sel: d3.Selection<T, D, any, any>,
  getXY: (d: D) => { x: number; y: number },
  opts: { rise?: number; stagger?: number; duration?: number } = {},
) {
  const { rise = 22, stagger = 28, duration = 480 } = opts;
  sel
    .style("opacity", 0)
    .attr("transform", (d: any) => { const { x, y } = getXY(d); return `translate(${x},${y + rise})`; })
    .transition()
    .delay((_: any, i: number) => i * stagger)
    .duration(duration)
    .ease(d3.easeCubicOut)
    .style("opacity", 1)
    .attr("transform", (d: any) => { const { x, y } = getXY(d); return `translate(${x},${y})`; });
}

/** Count-up sederhana untuk elemen <text>. */
function countUp(sel: d3.Selection<SVGTextElement, unknown, null, undefined>, target: number, suffix = "") {
  sel.transition().duration(650).ease(d3.easeCubicOut).tween("text", function () {
    const node = this as SVGTextElement;
    const i = d3.interpolateNumber(0, target);
    return (t: number) => { node.textContent = `${Math.round(i(t))}${suffix}`; };
  });
}

/** Animasi "energi berjalan" pada garis putus-putus. Hanya untuk garis yang sedikit jumlahnya. */
function animateFlow(sel: d3.Selection<SVGLineElement, unknown, any, any>) {
  sel.each(function () {
    const line = d3.select(this);
    (function loop() {
      line.attr("stroke-dashoffset", 0)
        .transition().duration(1400).ease(d3.easeLinear)
        .attr("stroke-dashoffset", -24)
        .on("end", loop);
    })();
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SHARED UI PIECES
// ─────────────────────────────────────────────────────────────────────────
function ZoomControls({
  onZoomIn, onZoomOut, onReset, accent,
}: { onZoomIn: () => void; onZoomOut: () => void; onReset: () => void; accent: string }) {
  const btn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${accent}`,
    background: "white", color: accent, fontFamily: FONT_BODY, fontWeight: 700,
    fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "transform 0.15s ease",
  };
  return (
    <div style={{ position: "absolute", top: 14, right: 14, display: "flex", flexDirection: "column", gap: 6, zIndex: 2 }}>
      <button style={btn} onClick={onZoomIn} onMouseDown={e => (e.currentTarget.style.transform = "scale(0.9)")} onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")} aria-label="Perbesar">+</button>
      <button style={btn} onClick={onZoomOut} onMouseDown={e => (e.currentTarget.style.transform = "scale(0.9)")} onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")} aria-label="Perkecil">−</button>
      <button style={{ ...btn, fontSize: 11 }} onClick={onReset} aria-label="Reset tampilan">⤾</button>
    </div>
  );
}

/** Blob skeleton berdenyut, dipakai saat memuat data — pengganti teks polos. */
function SkeletonBlobs({ w, h }: { w: number; h: number }) {
  const blobs = [
    { cx: w * 0.28, cy: h * 0.38, r: 70 },
    { cx: w * 0.58, cy: h * 0.28, r: 54 },
    { cx: w * 0.72, cy: h * 0.62, r: 62 },
    { cx: w * 0.4, cy: h * 0.68, r: 46 },
  ];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", minHeight: 560, display: "block" }}>
      <style>{`
        @keyframes pspkPulse { 0%,100% { opacity: 0.10; transform: scale(1); } 50% { opacity: 0.22; transform: scale(1.04); } }
        .pspk-skel { animation: pspkPulse 1.8s ease-in-out infinite; transform-origin: center; }
      `}</style>
      {blobs.map((b, i) => (
        <circle key={i} className="pspk-skel" style={{ animationDelay: `${i * 0.22}s` }}
          cx={b.cx} cy={b.cy} r={b.r} fill={PALETTE[i % PALETTE.length]} />
      ))}
    </svg>
  );
}

/** Panel detail node — dipakai di drilldown per-tag maupun graph relasi penuh. */
interface InspectorInfo { id: string; role: string; label: string; data?: Record<string, any>; }
function NodeInspectorPanel({ info, pinned }: { info: InspectorInfo | null; pinned: boolean }) {
  if (!info) {
    return (
      <div style={{
        background: "#f8f7f2", border: `1.5px dashed ${CANVAS_BORDER}`, borderRadius: 14,
        padding: "1.5rem", fontSize: 13, color: "#94a3b8", textAlign: "center", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, fontFamily: FONT_BODY,
      }}>
        <IconTap />
        <span>Arahkan kursor atau klik node<br />untuk melihat detail</span>
      </div>
    );
  }
  const accent = ROLE_BADGE_COLOR[info.role] ?? PRIMARY.navy;
  const d = info.data ?? {};
  const narrativeFields = [
    { key: "kondisi_awal", label: "Kondisi Awal", accent: SECONDARY.teal },
    { key: "upaya_dilakukan", label: "Upaya Dilakukan", accent: "#22a55e" },
    { key: "perubahan_signifikan", label: "Perubahan Signifikan", accent: PRIMARY.gold },
    { key: "alasan_bermakna", label: "Alasan Bermakna", accent: PRIMARY.maroon },
  ];
  return (
    <div style={{ background: "white", border: `2px solid ${accent}`, borderRadius: 14, padding: "1.25rem", fontSize: 13, boxShadow: "0 4px 14px -4px rgba(16,46,80,0.15)", fontFamily: FONT_BODY, maxHeight: 560, overflowY: "auto" }}>
      <span style={{
        display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: 8, fontSize: 10, fontWeight: 700,
        background: ROLE_BADGE_BG[info.role] ?? "#f1f5f9", color: accent, border: "1px solid currentColor", marginBottom: "0.6rem",
      }}>
        {ROLE_LABEL[info.role] ?? info.role}
      </span>
      <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15, color: PRIMARY.navy, marginBottom: "0.6rem", wordBreak: "break-word" }}>
        {info.label}
      </div>

      {info.role === "intervention" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: 12, color: "#475569" }}>
          {d.phase && (
            <div style={{
              display: "inline-block", alignSelf: "flex-start", padding: "0.3rem 0.65rem", borderRadius: 999,
              background: `${SECONDARY.teal}15`, border: `1px solid ${SECONDARY.teal}`, color: SECONDARY.teal, fontWeight: 700,
            }}>{d.phase}</div>
          )}
          {d.created_at && (
            <div style={{ color: MUTED }}>
              {new Date(d.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
          {narrativeFields.map(f => d[f.key] && (
            <div key={f.key}>
              <b style={{ color: f.accent, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em" }}>{f.label}</b>
              <p style={{ margin: "0.25rem 0 0", lineHeight: 1.55, background: `${f.accent}0d`, border: `1px solid ${f.accent}30`, borderRadius: 8, padding: "0.5rem 0.65rem" }}>
                {d[f.key]}
              </p>
            </div>
          ))}
        </div>
      )}

      {(info.role === "school" || info.role === "community") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: 12, color: "#475569" }}>
          {d.npsn && <div><b style={{ color: PRIMARY.navy }}>NPSN:</b> {d.npsn}</div>}
          {d.is_independent && <div style={{ color: MUTED }}>Sekolah independen (tanpa komunitas pembina)</div>}
        </div>
      )}

      {info.role === "tag" && (
        <p style={{ margin: 0, fontSize: 12.5, color: "#64748b", lineHeight: 1.6 }}>
          Kata kunci yang menghubungkan laporan intervensi dengan tantangan atau solusi serupa di sekolah lain.
        </p>
      )}

      <div style={{ marginTop: "1rem", fontSize: 11, color: "#94a3b8", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem" }}>
        {pinned ? "Klik area kosong untuk melepas pin" : "Klik node untuk pin detail"}
      </div>
    </div>
  );
}

/** Hook kecil untuk zoom d3 yang dipakai berulang di beberapa canvas. */
function useD3Zoom(svgRef: React.RefObject<SVGSVGElement | null>) {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const attach = useCallback((zoomG: d3.Selection<SVGGElement, unknown, null, undefined>) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on("zoom", (e) => zoomG.attr("transform", e.transform));
    svg.call(zoom);
    zoomRef.current = zoom;
  }, [svgRef]);
  const zoomBy = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy as any, factor);
  };
  const reset = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform as any, d3.zoomIdentity);
  };
  /** Zoom halus ke satu titik (dipakai untuk transisi Level-0 → Level-1). */
  const focusOn = (x: number, y: number, scale: number, w: number, h: number, duration = 550) => {
    if (!svgRef.current || !zoomRef.current) return Promise.resolve();
    const transform = d3.zoomIdentity.translate(w / 2, h / 2).scale(scale).translate(-x, -y);
    return new Promise<void>((resolve) => {
      d3.select(svgRef.current).transition().duration(duration).ease(d3.easeCubicInOut)
        .call(zoomRef.current!.transform as any, transform)
        .on("end", () => resolve());
    });
  };
  return { attach, zoomBy, reset, focusOn };
}

// ═════════════════════════════════════════════════════════════════════════
// LEVEL 1 — Drilldown per-tag
// ═════════════════════════════════════════════════════════════════════════
const W1 = 960, H1 = 620;

function DrilldownView({
  tagCluster, rawNodes, rawEdges, onBack, enteringFrom,
}: {
  tagCluster: TagCluster; rawNodes: GraphNode[]; rawEdges: GraphEdge[]; onBack: () => void;
  enteringFrom: { x: number; y: number } | null;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { attach, zoomBy, reset } = useD3Zoom(svgRef);
  const [hoveredInfo, setHoveredInfo] = useState<InspectorInfo | null>(null);
  const [pinnedInfo, setPinnedInfo] = useState<InspectorInfo | null>(null);
  const color = colorFor(tagCluster.tagId);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const CX = W1 / 2, CY = H1 / 2;
    const communities = rawNodes.filter(n => n.type === "community");
    const schools = rawNodes.filter(n => n.type === "school");
    const interventions = rawNodes.filter(n => n.type === "intervention");
    const otherTags = rawNodes.filter(n => n.type === "tag");

    const hubObstacle: PackedItem = { id: "HUB", r: HUB_PACK_R, x: CX, y: CY };
    let placed: PackedItem[] = [hubObstacle];
    const communityPacked = packCircles(communities.map(n => ({ id: n.id, r: ROLE_GEOM.community.packR })), CX, CY, 20, placed);
    placed = [...placed, ...communityPacked];
    const schoolPacked = packCircles(schools.map(n => ({ id: n.id, r: ROLE_GEOM.school.packR })), CX, CY, 20, placed);
    placed = [...placed, ...schoolPacked];
    const tagPacked = packCircles(otherTags.map(n => ({ id: n.id, r: ROLE_GEOM.tag.packR })), CX, CY, 18, placed);
    placed = [...placed, ...tagPacked];
    const interventionPacked = packCircles(interventions.map(n => ({ id: n.id, r: ROLE_GEOM.intervention.packR })), CX, CY, 14, placed);
    placed = [...placed, ...interventionPacked];

    const byId = new Map<string, GraphNode>(rawNodes.map(n => [n.id, n]));
    type SimNode = { id: string; nodeRef: GraphNode; role: string; w: number; h: number; x: number; y: number };
    const allPositioned: SimNode[] = [...communityPacked, ...schoolPacked, ...tagPacked, ...interventionPacked].map(p => {
      const ref = byId.get(p.id)!;
      const g = ROLE_GEOM[ref.type] ?? ROLE_GEOM.tag;
      return { id: p.id, nodeRef: ref, role: ref.type, w: g.w, h: g.h, x: p.x, y: p.y };
    });
    const nodeById = new Map(allPositioned.map(n => [n.id, n]));

    const simEdges = rawEdges
      .map(e => ({
        source: e.source === "TAG_CENTER" ? { id: "TAG_CENTER", x: CX, y: CY } : nodeById.get(e.source),
        target: nodeById.get(e.target),
      }))
      .filter(e => e.source && e.target) as { source: { x: number; y: number }; target: SimNode }[];

    const zoomG = svg.append("g");
    attach(zoomG);

    // Blob latar hub (dengan animasi "napas" halus supaya tidak terasa mati)
    const dotPts: Pt[] = allPositioned.filter(n => n.role === "intervention").map(n => [n.x - CX, n.y - CY] as Pt);
    const hubBlob = zoomG.append("path")
      .attr("d", dotPts.length ? blobPath([[0, 0], ...dotPts], 34, tagCluster.tagId.length) : blobPath(phyllotaxis(10, 60).map(([x, y]) => [x, y] as Pt), 20, 2))
      .attr("transform", `translate(${CX},${CY})`)
      .attr("fill", color).attr("fill-opacity", 0).attr("stroke", color).attr("stroke-opacity", 0);
    hubBlob.transition().duration(600).attr("fill-opacity", 0.14).attr("stroke-opacity", 0.45);

    // Garis
    const linkG = zoomG.append("g").attr("class", "links");
    const hubLines = linkG.append("g").attr("class", "hub-lines");
    simEdges.forEach(e => {
      linkG.append("line")
        .attr("x1", e.source.x).attr("y1", e.source.y).attr("x2", e.target.x).attr("y2", e.target.y)
        .attr("stroke", e.target.role === "tag" ? "#000000" : "#cbd5e1").attr("stroke-width", 1.5)
        .attr("stroke-dasharray", e.target.role === "tag" ? "5,5" : "0")
        .attr("data-link-for", e.target.id)
        .style("opacity", 0).transition().delay(200).duration(400).style("opacity", 1);
    });
    const connectedIds = new Set(simEdges.map(e => e.target.id));
    allPositioned.filter(n => n.role !== "tag" && !connectedIds.has(n.id)).forEach(n => {
      hubLines.append("line")
        .attr("x1", CX).attr("y1", CY).attr("x2", n.x).attr("y2", n.y)
        .attr("stroke", "#000000").attr("stroke-width", 1).attr("stroke-dasharray", "4,5")
        .attr("data-link-for", n.id)
        .style("opacity", 0).transition().delay(200).duration(400).style("opacity", 0.28);
    });
    // Animasi "energi berjalan" — hanya untuk garis hub (jumlahnya sedikit)
    animateFlow(hubLines.selectAll<SVGLineElement, unknown>("line"));

    // Hub
    const hubG = zoomG.append("g").attr("transform", `translate(${CX},${CY})`).style("opacity", 0);
    hubG.transition().duration(400).style("opacity", 1);
    hubG.append("rect").attr("x", -62).attr("y", -40).attr("width", 124).attr("height", 80).attr("rx", 18)
      .attr("fill", "white").attr("stroke", color).attr("stroke-width", 2.5);
    hubG.append("rect").attr("x", -40).attr("y", -22).attr("width", 80).attr("height", 30).attr("rx", 10)
      .attr("fill", color).attr("fill-opacity", 0.12);
    const hubWords = tagCluster.tagName.split(" ");
    const hLines = hubWords.length <= 2 ? [hubWords.join(" ")] : [hubWords.slice(0, Math.ceil(hubWords.length / 2)).join(" "), hubWords.slice(Math.ceil(hubWords.length / 2)).join(" ")];
    hLines.forEach((ln, li) => {
      hubG.append("text").attr("y", -6 - (hLines.length - 1) * 8 + li * 16)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-family", FONT_HEAD).attr("font-size", 14).attr("font-weight", 700).attr("fill", color).text(ln);
    });
    const countText = hubG.append("text").attr("y", hLines.length * 8 + 12).attr("text-anchor", "middle")
      .attr("font-family", FONT_BODY).attr("font-size", 11).attr("fill", MUTED);
    countUp(countText as any, tagCluster.count, " laporan");

    // Nodes
    const nodeG = zoomG.append("g").attr("class", "nodes")
      .selectAll(".node").data(allPositioned, (d: any) => d.id).enter().append("g")
      .attr("class", "node")
      .style("cursor", "grab");

    entranceRise(nodeG as any, (d: any) => ({ x: d.x, y: d.y }), { stagger: 22 });

    nodeG.call(d3.drag<SVGGElement, SimNode>()
      .on("start", function () { d3.select(this).style("cursor", "grabbing").raise(); })
      .on("drag", function (e, d) {
        d.x = e.x; d.y = e.y;
        d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
        linkG.selectAll(`line[data-link-for="${d.id}"]`).attr("x2", d.x).attr("y2", d.y);
      })
      .on("end", function () { d3.select(this).style("cursor", "grab"); })
    );

    nodeG.each(function (d: SimNode) {
      const g = d3.select(this);
      const rs = ROLE_STYLE[d.role] || { fill: "#f1f5f9", stroke: MUTED };
      const geom = ROLE_GEOM[d.role] ?? ROLE_GEOM.tag;
      // Wrapper terpisah untuk hover-scale supaya tidak bentrok dgn transform posisi
      const scaleWrap = g.append("g").attr("class", "scaleWrap");
      const shapeG = scaleWrap.append("g").attr("transform", geom.rotate ? `rotate(${geom.rotate})` : null);
      shapeG.append("rect")
        .attr("x", -d.w / 2).attr("y", -d.h / 2).attr("width", d.w).attr("height", d.h).attr("rx", geom.rx)
        .attr("fill", rs.fill).attr("stroke", rs.stroke).attr("stroke-width", d.role === "intervention" ? 2 : 2.2);

      if (d.role === "intervention") {
        shapeG.append("rect").attr("x", -d.w * 0.22).attr("y", -d.h * 0.22).attr("width", d.w * 0.44).attr("height", d.h * 0.44)
          .attr("rx", 2).attr("fill", rs.stroke).attr("fill-opacity", 0.55);
      } else {
        const words = d.nodeRef.label.split(" ");
        const lines = words.length <= 3 ? [words.join(" ")] : [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")];
        const lineH = 12;
        const startY = -(lines.length - 1) * lineH / 2;
        lines.slice(0, 2).forEach((ln, li) => {
          scaleWrap.append("text").attr("y", startY + li * lineH).attr("text-anchor", "middle").attr("dominant-baseline", "middle")
            .attr("font-family", FONT_BODY).attr("font-size", d.role === "community" ? 11 : 10).attr("font-weight", 600)
            .attr("fill", INK).attr("pointer-events", "none").text(ln.length > 14 ? ln.slice(0, 13) + "…" : ln);
        });
      }
    });

    // Hover: scale-up + highlight garis terhubung
    nodeG
      .on("mouseenter", function (e, d: SimNode) {
        d3.select(this).select(".scaleWrap").transition().duration(150).attr("transform", "scale(1.1)");
        linkG.selectAll(`line[data-link-for="${d.id}"]`).transition().duration(150).attr("stroke-width", 2.6).style("opacity", 1);
        setHoveredInfo({ id: d.nodeRef.id, role: d.role, label: d.nodeRef.label, data: d.nodeRef.data });
      })
      .on("mouseleave", function (e, d: SimNode) {
        d3.select(this).select(".scaleWrap").transition().duration(150).attr("transform", "scale(1)");
        linkG.selectAll(`line[data-link-for="${d.id}"]`).transition().duration(150).attr("stroke-width", 1.5);
        setHoveredInfo(null);
      })
      .on("click", (e, d: SimNode) => {
        e.stopPropagation();
        setPinnedInfo(prev => prev?.id === d.nodeRef.id ? null : { id: d.nodeRef.id, role: d.role, label: d.nodeRef.label, data: d.nodeRef.data });
      });

    svg.on("click", () => setPinnedInfo(null));
  }, [rawNodes, rawEdges, tagCluster, color, attach]);

  const info = pinnedInfo || hoveredInfo;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", fontFamily: FONT_BODY }}>
      <button
        onClick={onBack}
        style={{
          alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6,
          padding: "0.45rem 1.1rem", borderRadius: 10, border: `1.5px solid ${color}`,
          color, background: "white", fontWeight: 600, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer",
          transition: "transform 0.15s ease",
        }}
        onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
        onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        ← Kembali ke Peta Utama
      </button>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px", minWidth: 0, background: CANVAS_BG, borderRadius: 16, border: `1px solid ${CANVAS_BORDER}`, position: "relative", overflow: "hidden" }}>
          <svg ref={svgRef} viewBox={`0 0 ${W1} ${H1}`} style={{ width: "100%", height: "auto", display: "block", minHeight: 520 }} />
          <ZoomControls accent={color} onZoomIn={() => zoomBy(1.3)} onZoomOut={() => zoomBy(0.75)} onReset={reset} />
          <div style={{ position: "absolute", bottom: 10, left: 14, display: "flex", gap: 14, fontSize: 12, fontFamily: FONT_BODY, color: MUTED, flexWrap: "wrap" }}>
            {[
              { label: "Komunitas", bg: "#e7edf5", stroke: PRIMARY.navy, shape: "square" },
              { label: "Sekolah", bg: "#fdf1de", stroke: PRIMARY.gold, shape: "diamond" },
              { label: "Intervensi", bg: "white", stroke: SECONDARY.teal, shape: "square" },
              { label: "Tag lain", bg: "#f6e9e7", stroke: PRIMARY.maroon, shape: "diamond" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 13, height: 13, background: l.bg, border: `2px solid ${l.stroke}`,
                  display: "inline-block", borderRadius: 3,
                  transform: l.shape === "diamond" ? "rotate(45deg)" : undefined,
                }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: "1 1 270px", maxWidth: "100%", width: 270, minHeight: 200, flexShrink: 0 }}>
          <NodeInspectorPanel info={info} pinned={!!pinnedInfo} />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// LEVEL 0 — Peta utama (blob per tag) + transisi ke drilldown
// ═════════════════════════════════════════════════════════════════════════
const W0 = 960, H0 = 620;

export default function InterventionGraph() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { attach, zoomBy, reset, focusOn } = useD3Zoom(svgRef);
  const clusterSelectionRef = useRef<d3.Selection<any, any, any, any> | null>(null);
  const posByIdRef = useRef<Map<string, PackedItem>>(new Map());

  const [clusters, setClusters] = useState<TagCluster[]>([]);
  const [crossLinks, setCrossLinks] = useState<CrossTagLink[]>([]);
  const [totalInterventions, setTotal] = useState(0);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [selectedTag, setSelectedTag] = useState<TagCluster | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [drillNodes, setDrillNodes] = useState<GraphNode[]>([]);
  const [drillEdges, setDrillEdges] = useState<GraphEdge[]>([]);
  const [loadingDrill, setLoadingDrill] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [enteringFrom, setEnteringFrom] = useState<{ x: number; y: number } | null>(null);

  const [search, setSearch] = useState("");
  const [overviewRenderKey, setOverviewRenderKey] = useState(0);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true); setOverviewError(null);
    const res = await getInterventionTagOverview();
    if (res.success) { setClusters(res.clusters || []); setCrossLinks(res.crossLinks || []); setTotal(res.totalInterventions || 0); }
    else setOverviewError(res.error || "Gagal memuat Knowledge Graph.");
    setLoadingOverview(false);
    setOverviewRenderKey(k => k + 1);
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const filteredIds = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return new Set(clusters.filter(c => c.tagName.toLowerCase().includes(q)).map(c => c.tagId));
  }, [clusters, search]);

  // ── Effect 1: bangun layout SEKALI per data baru (circle packing) ───────
  useEffect(() => {
    if (!svgRef.current || loadingOverview || clusters.length === 0 || selectedTag) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const CX = W0 / 2, CY = H0 / 2;
    const visR = (count: number) => 46 + Math.sqrt(count) * 15;
    const packItems: PackItem[] = clusters.map(c => ({ id: c.tagId, r: visR(c.count) * 1.35 + 26 }));
    const packed = packCircles(packItems, CX, CY, 30);
    const posById = new Map(packed.map(p => [p.id, p]));
    posByIdRef.current = posById;

    const zoomG = svg.append("g");
    attach(zoomG);

    const linkG = zoomG.append("g").attr("class", "links");
    crossLinks.forEach(cl => {
      const a = posById.get(cl.tagIdA), b = posById.get(cl.tagIdB);
      if (!a || !b) return;
      linkG.append("line")
        .attr("x1", a.x).attr("y1", a.y).attr("x2", b.x).attr("y2", b.y)
        .attr("stroke", "#000000").attr("stroke-width", Math.min(1 + cl.sharedCount * 0.8, 5))
        .attr("stroke-dasharray", "5,5").attr("stroke-dashoffset", 0)
        .style("opacity", 0)
        .attr("data-endpoint-a", cl.tagIdA).attr("data-endpoint-b", cl.tagIdB)
        .transition().delay(250).duration(400).style("opacity", 0.45);
    });
    animateFlow(linkG.selectAll<SVGLineElement, unknown>("line"));

    const clusterG = zoomG.append("g").attr("class", "clusters")
      .selectAll(".cluster").data(clusters, (d: any) => d.tagId).enter().append("g")
      .attr("class", "cluster")
      .attr("data-id", (d: any) => d.tagId)
      .style("cursor", "pointer");

    entranceRise(clusterG as any, (d: any) => posById.get(d.tagId)!, { stagger: 45, rise: 30 });

    clusterG.call(d3.drag<SVGGElement, TagCluster>()
      .on("start", function () { d3.select(this).raise(); })
      .on("drag", function (e, d) {
        const p = posById.get(d.tagId)!; p.x = e.x; p.y = e.y;
        d3.select(this).attr("transform", `translate(${p.x},${p.y})`);
        linkG.selectAll(`line[data-endpoint-a="${d.tagId}"]`).attr("x1", p.x).attr("y1", p.y);
        linkG.selectAll(`line[data-endpoint-b="${d.tagId}"]`).attr("x2", p.x).attr("y2", p.y);
      })
    );

    clusterSelectionRef.current = clusterG;

    clusterG.each(function (d: TagCluster) {
      const g = d3.select(this);
      const scaleWrap = g.append("g").attr("class", "scaleWrap");
      const r = visR(d.count);
      const dotPts = phyllotaxis(Math.min(d.count, 40), r * 0.62);
      scaleWrap.append("path")
        .attr("d", blobPath(dotPts.length ? dotPts : [[0, 0]], 28, d.tagId.length + d.count))
        .attr("fill", colorFor(d.tagId)).attr("fill-opacity", 0.12)
        .attr("stroke", colorFor(d.tagId)).attr("stroke-width", 2).attr("stroke-opacity", 0.5);

      scaleWrap.append("g").attr("class", "dots")
        .selectAll(".dot").data(dotPts).enter().append("rect")
        .attr("x", (p: Pt) => p[0] - 4).attr("y", (p: Pt) => p[1] - 4)
        .attr("width", 8).attr("height", 8).attr("rx", 2)
        .attr("fill", "#fff").attr("stroke", colorFor(d.tagId)).attr("stroke-width", 1.5);

      scaleWrap.append("text").attr("text-anchor", "middle").attr("y", -r - 12)
        .attr("font-family", FONT_HEAD).attr("font-weight", 700).attr("font-size", 15)
        .attr("fill", colorFor(d.tagId)).text(`#${d.tagName}`);

      const countTxt = scaleWrap.append("text").attr("text-anchor", "middle").attr("y", -r + 6)
        .attr("font-family", FONT_BODY).attr("font-size", 12).attr("fill", MUTED);
      countUp(countTxt as any, d.count, " laporan");
    });

    // Hover: scale-up blob + highlight cross-link yang menyentuhnya
    clusterG
      .on("mouseenter", function (e, d: TagCluster) {
        if (transitioning) return;
        d3.select(this).select(".scaleWrap").transition().duration(160).attr("transform", "scale(1.06)");
        linkG.selectAll(`line[data-endpoint-a="${d.tagId}"], line[data-endpoint-b="${d.tagId}"]`)
          .transition().duration(160).style("opacity", 0.9);
      })
      .on("mouseleave", function (e, d: TagCluster) {
        d3.select(this).select(".scaleWrap").transition().duration(160).attr("transform", "scale(1)");
        linkG.selectAll(`line[data-endpoint-a="${d.tagId}"], line[data-endpoint-b="${d.tagId}"]`)
          .transition().duration(160).style("opacity", 0.45);
      })
      .on("click", function (e, d: any) { if ((e as any).defaultPrevented) return; handleSelectTag(d, this as SVGGElement); });

    return () => { clusterSelectionRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, crossLinks, loadingOverview, selectedTag, overviewRenderKey, attach]);

  // ── Effect 2: filter pencarian - hanya opacity, TIDAK menata ulang posisi ──
  useEffect(() => {
    if (!clusterSelectionRef.current) return;
    clusterSelectionRef.current.transition().duration(180)
      .style("opacity", (d: TagCluster) => !filteredIds || filteredIds.has(d.tagId) ? 1 : 0.15);
  }, [filteredIds]);

  const handleSelectTag = useCallback(async (tag: TagCluster, el?: SVGGElement) => {
    // Zoom-in halus ke blob yang diklik SEBELUM cross-fade ke drilldown,
    // supaya perpindahan level terasa menerus, bukan lompat instan.
    const p = posByIdRef.current.get(tag.tagId);
    if (p) {
      setEnteringFrom({ x: p.x, y: p.y });
      await focusOn(p.x, p.y, 1.8, W0, H0, 500);
    }
    setTransitioning(true);
    await new Promise(r => setTimeout(r, 180)); // durasi fade-out overview

    setSelectedTag(tag); setLoadingDrill(true); setDrillError(null);
    const res = await getInterventionGraphByTag(tag.tagId);
    if (res.success) { setDrillNodes(res.nodes || []); setDrillEdges(res.edges || []); }
    else setDrillError(res.error || "Gagal memuat detail.");
    setLoadingDrill(false);
    setTransitioning(false);
  }, [focusOn]);

  const handleBack = () => {
    setSelectedTag(null); setDrillNodes([]); setDrillEdges([]); setDrillError(null); setEnteringFrom(null);
    setOverviewRenderKey(k => k + 1); // remount graph utama, langsung tampil tanpa reload data
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", fontFamily: FONT_BODY }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: MUTED, flexWrap: "wrap" }}>
        <span onClick={handleBack} style={{ cursor: "pointer", fontWeight: !selectedTag ? 700 : 500, color: !selectedTag ? PRIMARY.navy : "#94a3b8", fontFamily: FONT_HEAD }}>
          Peta Utama{totalInterventions > 0 ? ` (${totalInterventions} laporan)` : ""}
        </span>
        {selectedTag && (
          <>
            <span>→</span>
            <span style={{ fontWeight: 700, color: colorFor(selectedTag.tagId), fontFamily: FONT_HEAD }}>#{selectedTag.tagName} ({selectedTag.count})</span>
          </>
        )}

        {!selectedTag && (
          <div style={{ position: "relative", marginLeft: 12 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><IconSearch /></span>
            <input
              type="text"
              placeholder="Cari tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "0.4rem 0.75rem 0.4rem 2rem", borderRadius: 8, border: `1px solid ${CANVAS_BORDER}`,
                background: "white", fontSize: 13, color: INK, fontFamily: FONT_BODY, outline: "none", width: 180,
              }}
            />
          </div>
        )}

        <div style={{ marginLeft: "auto" }}>
          <button onClick={loadOverview} style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, padding: "0.4rem 1rem", borderRadius: 8, border: `1px solid ${CANVAS_BORDER}`, background: "white", color: PRIMARY.navy, cursor: "pointer" }}>
            ↻ Muat Ulang
          </button>
        </div>
      </div>

      {!selectedTag && (
        <div style={{
          background: CANVAS_BG, borderRadius: 18, border: `1px solid ${CANVAS_BORDER}`, minHeight: 560, position: "relative", overflow: "hidden",
          opacity: transitioning ? 0 : 1, transition: "opacity 0.22s ease",
        }}>
          {loadingOverview && <SkeletonBlobs w={W0} h={H0} />}
          {!loadingOverview && overviewError && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 560, color: PRIMARY.maroon, flexDirection: "column", gap: 12, fontFamily: FONT_BODY }}>
              <span>{overviewError}</span>
              <button onClick={loadOverview} style={{ padding: "0.5rem 1.5rem", borderRadius: 8, border: `1px solid ${PRIMARY.maroon}`, color: PRIMARY.maroon, background: "white", cursor: "pointer", fontWeight: 600 }}>Coba Lagi</button>
            </div>
          )}
          {!loadingOverview && !overviewError && clusters.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 560, color: "#94a3b8", flexDirection: "column", gap: 12, fontFamily: FONT_BODY }}>
              <IconWeb size={44} />
              <span>Belum ada data intervensi yang tercatat.</span>
            </div>
          )}
          {!loadingOverview && !overviewError && clusters.length > 0 && (
            <svg key={overviewRenderKey} ref={svgRef} viewBox={`0 0 ${W0} ${H0}`} style={{ width: "100%", height: "auto", display: "block", minHeight: 560 }} />
          )}
          {!loadingOverview && !overviewError && clusters.length > 0 && (
            <ZoomControls accent={PRIMARY.navy} onZoomIn={() => zoomBy(1.3)} onZoomOut={() => zoomBy(0.75)} onReset={reset} />
          )}
          <div style={{ position: "absolute", bottom: 16, right: 20, fontSize: 12, fontFamily: FONT_BODY, color: MUTED, background: "rgba(255,255,255,0.85)", padding: "4px 12px", borderRadius: 20 }}>
            Tarik untuk geser, scroll untuk zoom, klik blob untuk buka relasi
          </div>
        </div>
      )}

      {selectedTag && (
        <div style={{ opacity: loadingDrill ? 0.6 : 1, animation: "pspkFadeIn 0.28s ease" }}>
          <style>{`@keyframes pspkFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          {loadingDrill && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 520, color: "#94a3b8", background: CANVAS_BG, borderRadius: 18, border: `1px solid ${CANVAS_BORDER}`, fontFamily: FONT_BODY }}>Memuat detail relasi #{selectedTag.tagName}…</div>}
          {!loadingDrill && drillError && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 520, color: PRIMARY.maroon, background: "#fdf3f2", borderRadius: 18, border: "1px solid #f3c9c4", flexDirection: "column", gap: 12, fontFamily: FONT_BODY }}>
              <span>{drillError}</span>
              <button onClick={() => handleSelectTag(selectedTag)} style={{ padding: "0.5rem 1.5rem", borderRadius: 8, border: `1px solid ${PRIMARY.maroon}`, color: PRIMARY.maroon, background: "white", cursor: "pointer", fontWeight: 600 }}>Coba Lagi</button>
            </div>
          )}
          {!loadingDrill && !drillError && <DrilldownView tagCluster={selectedTag} rawNodes={drillNodes} rawEdges={drillEdges} onBack={handleBack} enteringFrom={enteringFrom} />}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// KnowledgeGraphFullView — pengganti RawInterventionGraph.tsx
// Graph relasi PENUH (komunitas → sekolah → intervensi → tag), dipakai
// lewat props initialNodes/initialEdges (dari getGlobalInterventionGraph,
// getInterventionGraph, atau getSchoolInterventionGraph).
// ═════════════════════════════════════════════════════════════════════════
const WF = 1100, HF = 720;

interface FullViewNode { id: string; role: string; label: string; data: Record<string, any>; x: number; y: number; }

/**
 * Layout "clustered packing": komunitas (atau sekolah independen) jadi
 * pusat cluster; sekolah & intervensi di-pack di sekitar pusatnya; tag
 * (yang bisa dipakai lintas cluster) di-pack terakhir sebagai "sabuk" di
 * sekitar seluruh cluster supaya tidak pernah bertabrakan dengan node lain.
 * Seluruhnya deterministik — tidak ada simulasi fisika yang berjalan.
 */
function buildFullGraphLayout(nodes: GraphNode[], edges: GraphEdge[], w: number, h: number): { positioned: FullViewNode[]; } {
  const CX = w / 2, CY = h / 2;
  const byId = new Map(nodes.map(n => [n.id, n]));

  const parentOfSchool = new Map<string, string>(); // school id -> community id
  edges.forEach(e => { if (e.source.startsWith("comm_") && e.target.startsWith("school_")) parentOfSchool.set(e.target, e.source); });

  const parentOfIntervention = new Map<string, string>(); // intervention id -> community id (atau school id jika independen)
  edges.forEach(e => {
    if (!e.target.startsWith("intervention_")) return;
    if (e.source.startsWith("comm_")) parentOfIntervention.set(e.target, e.source);
    else if (e.source.startsWith("school_")) parentOfIntervention.set(e.target, parentOfSchool.get(e.source) ?? e.source);
  });

  // Kelompokkan berdasarkan root cluster: id komunitas, atau "indep_<schoolId>" untuk sekolah independen.
  type Cluster = { rootId: string; communityNode?: GraphNode; schoolNodes: GraphNode[]; interventionNodes: GraphNode[] };
  const clusters = new Map<string, Cluster>();
  const clusterOf = (rootId: string): Cluster => {
    if (!clusters.has(rootId)) clusters.set(rootId, { rootId, schoolNodes: [], interventionNodes: [] });
    return clusters.get(rootId)!;
  };

  nodes.filter(n => n.type === "community").forEach(n => { clusterOf(n.id).communityNode = n; });
  nodes.filter(n => n.type === "school").forEach(n => {
    const parentComm = parentOfSchool.get(n.id);
    const rootId = parentComm ?? `indep_${n.id}`;
    clusterOf(rootId).schoolNodes.push(n);
  });
  nodes.filter(n => n.type === "intervention").forEach(n => {
    const rootId = parentOfIntervention.get(n.id) ?? `orphan_${n.id}`;
    clusterOf(rootId).interventionNodes.push(n);
  });
  const tagNodes = nodes.filter(n => n.type === "tag");

  // Radius cluster berdasarkan jumlah anggotanya, supaya cluster besar dapat ruang lebih.
  const clusterList = [...clusters.values()].filter(c => c.communityNode || c.schoolNodes.length || c.interventionNodes.length);
  const clusterRadius = (c: Cluster) => {
    const members = c.schoolNodes.length + c.interventionNodes.length + (c.communityNode ? 1 : 0);
    return 100 + Math.sqrt(members) * 55;
  };
  const clusterItems: PackItem[] = clusterList.map(c => ({ id: c.rootId, r: clusterRadius(c) }));
  const clusterCenters = packCircles(clusterItems, CX, CY, 60);
  const centerById = new Map(clusterCenters.map(p => [p.id, p]));

  const positioned: FullViewNode[] = [];
  let globalPlaced: PackedItem[] = [];

  clusterList.forEach(c => {
    const center = centerById.get(c.rootId)!;
    const hubId = c.communityNode?.id ?? (c.schoolNodes[0]?.id ? `hub_${c.rootId}` : c.rootId);
    let localPlaced: PackedItem[] = [];

    if (c.communityNode) {
      positioned.push({ id: c.communityNode.id, role: "community", label: c.communityNode.label, data: c.communityNode.data, x: center.x, y: center.y });
      localPlaced = [{ id: c.communityNode.id, r: ROLE_GEOM.community.packR, x: center.x, y: center.y }];
    } else {
      // Sekolah independen jadi hub visual cluster-nya sendiri.
      localPlaced = [{ id: hubId, r: ROLE_GEOM.school.packR, x: center.x, y: center.y }];
    }

    const schoolsToPack = c.communityNode ? c.schoolNodes : c.schoolNodes.slice(1); // sekolah pertama = hub independen
    if (!c.communityNode && c.schoolNodes[0]) {
      positioned.push({ id: c.schoolNodes[0].id, role: "school", label: c.schoolNodes[0].label, data: c.schoolNodes[0].data, x: center.x, y: center.y });
    }
    const schoolPacked = packCircles(schoolsToPack.map(n => ({ id: n.id, r: ROLE_GEOM.school.packR })), center.x, center.y, 18, [...globalPlaced, ...localPlaced]);
    schoolPacked.forEach(p => {
      const ref = byId.get(p.id)!;
      positioned.push({ id: p.id, role: "school", label: ref.label, data: ref.data, x: p.x, y: p.y });
    });
    localPlaced = [...localPlaced, ...schoolPacked];

    const interventionPacked = packCircles(c.interventionNodes.map(n => ({ id: n.id, r: ROLE_GEOM.intervention.packR })), center.x, center.y, 12, [...globalPlaced, ...localPlaced]);
    interventionPacked.forEach(p => {
      const ref = byId.get(p.id)!;
      positioned.push({ id: p.id, role: "intervention", label: ref.label, data: ref.data, x: p.x, y: p.y });
    });
    localPlaced = [...localPlaced, ...interventionPacked];

    globalPlaced = [...globalPlaced, ...localPlaced];
  });

  // Tag dipaketkan terakhir sebagai "sabuk" — menghindari semua node yang sudah ditempatkan.
  const tagPacked = packCircles(tagNodes.map(n => ({ id: n.id, r: ROLE_GEOM.tag.packR })), CX, CY, 22, globalPlaced);
  tagPacked.forEach(p => {
    const ref = byId.get(p.id)!;
    positioned.push({ id: p.id, role: "tag", label: ref.label, data: ref.data, x: p.x, y: p.y });
  });

  return { positioned };
}

export function KnowledgeGraphFullView({
  initialNodes = [],
  initialEdges = [],
  title = "Knowledge Graph Intervensi & Dampak Pembelajaran",
  description = "Peta relasi antara Komunitas, Sekolah, Laporan Intervensi, dan Topik Pembelajaran",
}: {
  initialNodes: GraphNode[];
  initialEdges: GraphEdge[];
  title?: string;
  description?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { attach, zoomBy, reset } = useD3Zoom(svgRef);
  const nodeSelectionRef = useRef<d3.Selection<any, any, any, any> | null>(null);
  const linkSelectionRef = useRef<d3.Selection<any, any, any, any> | null>(null);

  const [hoveredInfo, setHoveredInfo] = useState<InspectorInfo | null>(null);
  const [pinnedInfo, setPinnedInfo] = useState<InspectorInfo | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "community" | "school" | "intervention" | "tag">("all");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const stats = useMemo(() => ({
    community: initialNodes.filter(n => n.type === "community").length,
    school: initialNodes.filter(n => n.type === "school").length,
    intervention: initialNodes.filter(n => n.type === "intervention").length,
    tag: initialNodes.filter(n => n.type === "tag").length,
    total: initialNodes.length,
  }), [initialNodes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && isFullscreen) setIsFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // Highlight set — dipisah dari layout, tidak pernah memicu re-packing.
  const highlightedIds = useMemo(() => {
    if (!search.trim() && filterRole === "all") return null;
    const q = search.toLowerCase();
    const ids = new Set<string>();
    initialNodes.forEach(n => {
      const matchesSearch = q ? n.label.toLowerCase().includes(q) : true;
      const matchesFilter = filterRole === "all" || n.type === filterRole;
      if (matchesSearch && matchesFilter) ids.add(n.id);
    });
    return ids;
  }, [search, filterRole, initialNodes]);

  // ── Effect 1: layout & render — HANYA jalan saat DATA berubah ──────────
  // (Ini fix untuk bug versi lama: dulu forceSimulation di-restart total
  // setiap kali search/filter berubah, sehingga seluruh graph "meledak"
  // dan lompat ke posisi acak setiap keystroke. Sekarang posisi dihitung
  // sekali dan search/filter hanya mengubah opacity di Effect 2.)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    if (initialNodes.length === 0) return;

    const { positioned } = buildFullGraphLayout(initialNodes, initialEdges, WF, HF);
    const posById = new Map(positioned.map(p => [p.id, p]));

    const zoomG = svg.append("g");
    attach(zoomG);

    const linkG = zoomG.append("g").attr("class", "links");
    const linkSel = linkG.selectAll(".edge").data(initialEdges, (d: any) => d.id).enter().append("line")
      .attr("class", "edge")
      .attr("x1", (e: GraphEdge) => posById.get(e.source)?.x ?? 0)
      .attr("y1", (e: GraphEdge) => posById.get(e.source)?.y ?? 0)
      .attr("x2", (e: GraphEdge) => posById.get(e.target)?.x ?? 0)
      .attr("y2", (e: GraphEdge) => posById.get(e.target)?.y ?? 0)
      .attr("stroke", (e: GraphEdge) => {
        const t = posById.get(e.target)?.role;
        return t === "tag" ? "#000000" : t === "intervention" ? SECONDARY.teal : PRIMARY.navy;
      })
      .attr("stroke-width", (e: GraphEdge) => posById.get(e.target)?.role === "tag" ? 1 : 1.5)
      .attr("stroke-dasharray", (e: GraphEdge) => posById.get(e.target)?.role === "tag" ? "4,4" : "0")
      .attr("stroke-opacity", 0.32)
      .attr("data-source", (e: GraphEdge) => e.source)
      .attr("data-target", (e: GraphEdge) => e.target)
      .style("opacity", 0);
    linkSel.transition().delay(300).duration(400).style("opacity", 1);
    linkSelectionRef.current = linkSel;

    const nodeG = zoomG.append("g").attr("class", "nodes")
      .selectAll(".node").data(positioned, (d: any) => d.id).enter().append("g")
      .attr("class", "node").attr("data-id", (d: FullViewNode) => d.id)
      .style("cursor", "grab");

    entranceRise(nodeG as any, (d: any) => ({ x: d.x, y: d.y }), { stagger: 8, duration: 420 });

    nodeG.call(d3.drag<SVGGElement, FullViewNode>()
      .on("start", function () { d3.select(this).style("cursor", "grabbing").raise(); })
      .on("drag", function (e, d) {
        d.x = e.x; d.y = e.y;
        d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
        linkG.selectAll(`line[data-source="${d.id}"]`).attr("x1", d.x).attr("y1", d.y);
        linkG.selectAll(`line[data-target="${d.id}"]`).attr("x2", d.x).attr("y2", d.y);
      })
      .on("end", function () { d3.select(this).style("cursor", "grab"); })
    );

    nodeG.each(function (d: FullViewNode) {
      const g = d3.select(this);
      const rs = ROLE_STYLE[d.role] || { fill: "#f1f5f9", stroke: MUTED };
      const geom = ROLE_GEOM[d.role] ?? ROLE_GEOM.tag;
      const scaleWrap = g.append("g").attr("class", "scaleWrap");
      const shapeG = scaleWrap.append("g").attr("transform", geom.rotate ? `rotate(${geom.rotate})` : null);
      shapeG.append("rect")
        .attr("x", -geom.w / 2).attr("y", -geom.h / 2).attr("width", geom.w).attr("height", geom.h).attr("rx", geom.rx)
        .attr("fill", rs.fill).attr("stroke", rs.stroke).attr("stroke-width", d.role === "intervention" ? 2 : 2.2);
      if (d.role === "intervention") {
        shapeG.append("rect").attr("x", -geom.w * 0.22).attr("y", -geom.h * 0.22).attr("width", geom.w * 0.44).attr("height", geom.h * 0.44)
          .attr("rx", 2).attr("fill", rs.stroke).attr("fill-opacity", 0.55);
      } else {
        const words = d.label.split(" ");
        const lines = words.length <= 3 ? [words.join(" ")] : [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")];
        const lineH = 12;
        const startY = -(lines.length - 1) * lineH / 2;
        lines.slice(0, 2).forEach((ln, li) => {
          scaleWrap.append("text").attr("y", startY + li * lineH).attr("text-anchor", "middle").attr("dominant-baseline", "middle")
            .attr("font-family", FONT_BODY).attr("font-size", d.role === "community" ? 11 : 10).attr("font-weight", 600)
            .attr("fill", INK).attr("pointer-events", "none").text(ln.length > 16 ? ln.slice(0, 15) + "…" : ln);
        });
      }
    });

    nodeG
      .on("mouseenter", function (e, d: FullViewNode) {
        d3.select(this).select(".scaleWrap").transition().duration(140).attr("transform", "scale(1.12)");
        linkG.selectAll(`line[data-source="${d.id}"], line[data-target="${d.id}"]`).transition().duration(140).attr("stroke-opacity", 0.9).attr("stroke-width", 2.4);
        setHoveredInfo({ id: d.id, role: d.role, label: d.label, data: d.data });
      })
      .on("mouseleave", function (e, d: FullViewNode) {
        d3.select(this).select(".scaleWrap").transition().duration(140).attr("transform", "scale(1)");
        linkG.selectAll(`line[data-source="${d.id}"], line[data-target="${d.id}"]`).transition().duration(140).attr("stroke-opacity", 0.32).attr("stroke-width", posById.get(d.id)?.role === "tag" ? 1 : 1.5);
        setHoveredInfo(null);
      })
      .on("click", (e, d: FullViewNode) => {
        e.stopPropagation();
        setPinnedInfo(prev => prev?.id === d.id ? null : { id: d.id, role: d.role, label: d.label, data: d.data });
      });

    svg.on("click", () => setPinnedInfo(null));
    nodeSelectionRef.current = nodeG;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, initialEdges, attach]);

  // ── Effect 2: highlight/dim berdasarkan search+filter — HANYA opacity ──
  useEffect(() => {
    if (!nodeSelectionRef.current || !linkSelectionRef.current) return;
    nodeSelectionRef.current.transition().duration(180)
      .style("opacity", (d: FullViewNode) => !highlightedIds || highlightedIds.has(d.id) ? 1 : 0.15);
    linkSelectionRef.current.transition().duration(180)
      .attr("stroke-opacity", (e: GraphEdge) => {
        if (!highlightedIds) return 0.32;
        const on = highlightedIds.has(e.source) || highlightedIds.has(e.target);
        return on ? 0.6 : 0.06;
      });
  }, [highlightedIds]);

  const StatChip = ({ role, icon, label, count }: { role: typeof filterRole; icon: string; label: string; count: number }) => (
    <button
      onClick={() => setFilterRole(prev => prev === role ? "all" : role as any)}
      style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        padding: "0.5rem 0.875rem", borderRadius: "0.625rem",
        border: `1.5px solid ${filterRole === role ? ROLE_BADGE_COLOR[role] ?? PRIMARY.navy : CANVAS_BORDER}`,
        background: filterRole === role ? `${ROLE_BADGE_COLOR[role] ?? PRIMARY.navy}12` : "white",
        color: filterRole === role ? (ROLE_BADGE_COLOR[role] ?? PRIMARY.navy) : MUTED,
        cursor: "pointer", transition: "all 0.15s ease", fontWeight: filterRole === role ? 700 : 500, fontSize: "0.82rem", fontFamily: FONT_BODY,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: "1rem" }}>{count}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div style={
      isFullscreen
        ? { position: "fixed", inset: 0, zIndex: 99999, background: CANVAS_BG, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem", overflow: "hidden" }
        : { display: "flex", flexDirection: "column", gap: "0.875rem", width: "100%", fontFamily: FONT_BODY }
    }>
      <div>
        <h3 style={{ margin: 0, fontFamily: FONT_HEAD, color: PRIMARY.navy, fontSize: "1.15rem" }}>{title}</h3>
        <p style={{ margin: "0.2rem 0 0", color: MUTED, fontSize: "0.85rem" }}>{description}</p>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
        <StatChip role="community" icon="" label="Komunitas" count={stats.community} />
        <StatChip role="school" icon="" label="Sekolah" count={stats.school} />
        <StatChip role="intervention" icon="" label="Intervensi" count={stats.intervention} />
        <StatChip role="tag" icon="" label="Tag" count={stats.tag} />

        <div style={{ position: "relative", marginLeft: "auto", minWidth: 200 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><IconSearch /></span>
          <input
            type="text" placeholder="Cari node..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "0.5rem 0.75rem 0.5rem 2rem", borderRadius: 8, border: `1px solid ${CANVAS_BORDER}`, background: "white", fontSize: 13, color: INK, fontFamily: FONT_BODY, outline: "none" }}
          />
        </div>
        {(search || filterRole !== "all") && (
          <button onClick={() => { setSearch(""); setFilterRole("all"); }}
            style={{ padding: "0.5rem 0.875rem", borderRadius: 8, border: `1px solid ${PRIMARY.maroon}`, background: "white", color: PRIMARY.maroon, fontSize: "0.8rem", cursor: "pointer", fontWeight: 600 }}>
            Reset Filter
          </button>
        )}
        <button onClick={() => setIsFullscreen(v => !v)}
          style={{ padding: "0.5rem 0.875rem", borderRadius: 8, border: `1px solid ${PRIMARY.navy}`, background: isFullscreen ? `${PRIMARY.navy}12` : "white", color: PRIMARY.navy, fontSize: "0.8rem", cursor: "pointer", fontWeight: 700 }}>
          {isFullscreen ? "✕ Keluar Fullscreen (ESC)" : "⛶ Fullscreen"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", flex: 1, minHeight: 600 }}>
        <div style={{ flex: "1 1 300px", minWidth: 0, background: CANVAS_BG, borderRadius: 18, border: `1px solid ${CANVAS_BORDER}`, position: "relative", overflow: "hidden" }}>
          {initialNodes.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 600, gap: "1rem", color: "#94a3b8" }}>
              <IconWeb size={44} />
              <h4 style={{ margin: 0, color: MUTED, fontFamily: FONT_HEAD }}>Knowledge Graph Masih Kosong</h4>
              <p style={{ margin: 0, fontSize: "0.85rem", textAlign: "center", maxWidth: 380 }}>
                Setelah laporan intervensi diisi dan disubmit, peta pengetahuan akan tumbuh di sini — menghubungkan sekolah, topik, dan dampak.
              </p>
            </div>
          ) : (
            <svg ref={svgRef} viewBox={`0 0 ${WF} ${HF}`} style={{ width: "100%", height: "auto", display: "block", minHeight: 600 }} />
          )}
          {initialNodes.length > 0 && <ZoomControls accent={PRIMARY.navy} onZoomIn={() => zoomBy(1.3)} onZoomOut={() => zoomBy(0.75)} onReset={reset} />}
          <div style={{ position: "absolute", bottom: 16, left: 20, display: "flex", gap: 14, fontSize: 12, color: MUTED, background: "rgba(255,255,255,0.85)", padding: "4px 12px", borderRadius: 20, flexWrap: "wrap" }}>
            {(["community", "school", "intervention", "tag"] as const).map(r => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: ROLE_STYLE[r].fill, border: `2px solid ${ROLE_STYLE[r].stroke}` }} />
                {ROLE_LABEL[r]}
              </div>
            ))}
          </div>
        </div>

        {(pinnedInfo || hoveredInfo) && (
          <div style={{ flex: "1 1 300px", maxWidth: "100%", width: 300, flexShrink: 0 }}>
            <NodeInspectorPanel info={pinnedInfo || hoveredInfo} pinned={!!pinnedInfo} />
          </div>
        )}
      </div>
    </div>
  );
}