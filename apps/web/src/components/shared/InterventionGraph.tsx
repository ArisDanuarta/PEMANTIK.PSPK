"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import {
  getInterventionTagOverview,
  getInterventionGraphByTag,
  type TagCluster,
  type CrossTagLink,
} from "@/app/actions/interventions";

// ─────────────────────────────────────────────────────────────────────────────
// InterventionGraph - PSPK Knowledge Map
//
// CATATAN PENTING PERUBAHAN ARSITEKTUR:
// Versi sebelumnya memakai d3-force (forceSimulation) untuk menata posisi node.
// Force simulation TIDAK deterministik - hasil akhirnya tergantung keseimbangan
// charge/collide/center yang bisa "meledak" (sebagian node numpuk, sebagian
// terlempar jauh), dan posisi label yang dihitung di setiap tick bisa telat
// sinkron dengan bentuknya.
//
// Versi ini mengganti seluruh penataan posisi dengan CIRCLE PACKING
// DETERMINISTIK (spiral golden-angle + pengecekan tabrakan eksplisit).
// Setiap node punya "radius pembungkus" (packing radius) berdasarkan ukuran
// bentuknya; algoritma menempatkan node satu per satu di sepanjang spiral dan
// menolak posisi yang jaraknya < jumlah radius + padding. Hasilnya DIJAMIN
// tidak ada tabrakan, dan karena posisi dihitung sekali (bukan tiap frame),
// label & garis penghubung selalu 100% mengikuti posisi bentuknya.
//
// Drag & zoom tetap ada untuk interaktivitas, tapi sekarang murni manual
// (tidak ada simulasi fisika yang jalan di background).
// ─────────────────────────────────────────────────────────────────────────────

const FONT_HEAD = "'Lora', serif";
const FONT_BODY = "'Inter', sans-serif";

const W0 = 960;
const H0 = 620;
const W1 = 960;
const H1 = 620;

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

// ─── Ikon outline kecil (pengganti emoji) ───────────────────────────────────
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

// ─── Circle packing deterministik (inti dari fix "numpuk") ─────────────────
interface PackItem { id: string; r: number; }
interface PackedItem extends PackItem { x: number; y: number; }

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Menempatkan setiap item di sepanjang spiral golden-angle, dimulai dari
 * radius kecil dan membesar sampai tidak bertabrakan dengan item lain yang
 * sudah ditempatkan (termasuk "obstacle" yang sudah ada sebelumnya, mis. hub).
 * Deterministik & selalu menjamin jarak antar-pusat >= r1+r2+padding.
 */
function packCircles(items: PackItem[], cx: number, cy: number, padding = 16, preplaced: PackedItem[] = []): PackedItem[] {
  const placed: PackedItem[] = [...preplaced];
  items.forEach((item, i) => {
    let angle = (i + preplaced.length) * GOLDEN_ANGLE;
    let radius = item.r + padding * 0.5;
    let x = cx, y = cy;
    let tries = 0;
    // Kasus pertama tanpa obstacle apa pun: taruh langsung di pusat.
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
  return placed.slice(preplaced.length);
}

/** Sebaran titik merata di dalam piringan radius maxR (pola bunga matahari). */
function phyllotaxis(n: number, maxR: number): Pt[] {
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => {
    const r = maxR * Math.sqrt((i + 0.5) / n);
    const a = i * GOLDEN_ANGLE;
    return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
  });
}

// ─── Blob organik dari kumpulan titik (convex hull + spline tertutup) ───────
type Pt = [number, number];
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

// Ukuran bentuk & radius pembungkus (dipakai packCircles) per role
const ROLE_GEOM: Record<string, { w: number; h: number; packR: number; rotate: number; rx: number }> = {
  community: { w: 128, h: 68, packR: 92, rotate: 0, rx: 16 },
  school: { w: 92, h: 92, packR: 82, rotate: 45, rx: 12 },
  intervention: { w: 18, h: 18, packR: 22, rotate: 0, rx: 4 },
  tag: { w: 78, h: 78, packR: 70, rotate: 45, rx: 10 },
};
const HUB_PACK_R = 96;

function ZoomControls({
  onZoomIn, onZoomOut, onReset, accent,
}: { onZoomIn: () => void; onZoomOut: () => void; onReset: () => void; accent: string }) {
  const btn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${accent}`,
    background: "white", color: accent, fontFamily: FONT_BODY, fontWeight: 700,
    fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  };
  return (
    <div style={{ position: "absolute", top: 14, right: 14, display: "flex", flexDirection: "column", gap: 6, zIndex: 2 }}>
      <button style={btn} onClick={onZoomIn} aria-label="Perbesar">+</button>
      <button style={btn} onClick={onZoomOut} aria-label="Perkecil">−</button>
      <button style={{ ...btn, fontSize: 11 }} onClick={onReset} aria-label="Reset tampilan">⤾</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Level 1: DrilldownView
// ─────────────────────────────────────────────────────────────────────────────
interface DrillNode { id: string; type: string; label: string; data?: any; }
interface DrillEdge { id: string; source: string; target: string; }
interface DrillInfo { node: DrillNode; x: number; y: number; }

function DrilldownView({
  tagCluster, rawNodes, rawEdges, onBack,
}: {
  tagCluster: TagCluster; rawNodes: DrillNode[]; rawEdges: DrillEdge[]; onBack: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<DrillInfo | null>(null);
  const [pinnedInfo, setPinnedInfo] = useState<DrillInfo | null>(null);
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

    // ── Circle packing: hub dulu jadi obstacle, lalu tiap grup role
    // ditempatkan berurutan supaya semuanya (termasuk vs hub) dijamin
    // tidak saling tumpang tindih.
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

    type SimNode = { id: string; nodeRef: DrillNode; role: string; w: number; h: number; x: number; y: number };
    const roleOf = (id: string) => rawNodes.find(n => n.id === id)?.type ?? "tag";
    const byId = new Map<string, DrillNode>(rawNodes.map(n => [n.id, n]));
    const allPositioned: SimNode[] = [...communityPacked, ...schoolPacked, ...tagPacked, ...interventionPacked].map(p => {
      const role = roleOf(p.id);
      const g = ROLE_GEOM[role] ?? ROLE_GEOM.tag;
      return { id: p.id, nodeRef: byId.get(p.id)!, role, w: g.w, h: g.h, x: p.x, y: p.y };
    });
    const nodeById = new Map(allPositioned.map(n => [n.id, n]));

    const simEdges = rawEdges
      .map(e => ({
        source: e.source === "TAG_CENTER" ? { id: "TAG_CENTER", x: CX, y: CY } : nodeById.get(e.source),
        target: nodeById.get(e.target),
      }))
      .filter(e => e.source && e.target) as { source: { x: number; y: number }; target: SimNode }[];

    const zoomG = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.4, 3]).on("zoom", (e) => zoomG.attr("transform", e.transform));
    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Blob latar hub
    const dotPts: Pt[] = allPositioned.filter(n => n.role === "intervention").map(n => [n.x - CX, n.y - CY] as Pt);
    const hubBlob = zoomG.append("path")
      .attr("d", dotPts.length ? blobPath([[0, 0], ...dotPts], 34, tagCluster.tagId.length) : blobPath(phyllotaxis(10, 60).map(([x, y]) => [x, y] as Pt), 20, 2))
      .attr("transform", `translate(${CX},${CY})`)
      .attr("fill", color).attr("fill-opacity", 0.14).attr("stroke", color).attr("stroke-opacity", 0.45);

    // Garis: edge eksplisit + garis tipis untuk node lepas ke hub
    const linkG = zoomG.append("g").attr("class", "links");
    simEdges.forEach(e => {
      linkG.append("line")
        .attr("x1", e.source.x).attr("y1", e.source.y).attr("x2", e.target.x).attr("y2", e.target.y)
        .attr("stroke", "#cbd5e1").attr("stroke-width", 1.5)
        .attr("stroke-dasharray", e.target.role === "tag" ? "5,5" : "0")
        .attr("data-link-for", e.target.id);
    });
    const connectedIds = new Set(simEdges.map(e => e.target.id));
    allPositioned.filter(n => n.role !== "tag" && !connectedIds.has(n.id)).forEach(n => {
      linkG.append("line")
        .attr("x1", CX).attr("y1", CY).attr("x2", n.x).attr("y2", n.y)
        .attr("stroke", color).attr("stroke-width", 1).attr("opacity", 0.22)
        .attr("data-link-for", n.id);
    });

    // Hub - rounded-rect (senada logogram bubble chat PSPK)
    const hubG = zoomG.append("g").attr("transform", `translate(${CX},${CY})`);
    hubG.append("rect").attr("x", -62).attr("y", -40).attr("width", 124).attr("height", 80).attr("rx", 18)
      .attr("fill", "white").attr("stroke", color).attr("stroke-width", 2.5);
    hubG.append("rect").attr("x", -40).attr("y", -22).attr("width", 80).attr("height", 30).attr("rx", 10)
      .attr("fill", color).attr("fill-opacity", 0.12);
    const hubWords = tagCluster.tagName.split(" ");
    const hubLines = hubWords.length <= 2 ? [hubWords.join(" ")] : [hubWords.slice(0, Math.ceil(hubWords.length / 2)).join(" "), hubWords.slice(Math.ceil(hubWords.length / 2)).join(" ")];
    hubLines.forEach((ln, li) => {
      hubG.append("text").attr("y", -6 - (hubLines.length - 1) * 8 + li * 16)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-family", FONT_HEAD).attr("font-size", 14).attr("font-weight", 700).attr("fill", color).text(ln);
    });
    hubG.append("text").attr("y", hubLines.length * 8 + 12).attr("text-anchor", "middle")
      .attr("font-family", FONT_BODY).attr("font-size", 11).attr("fill", MUTED).text(`${tagCluster.count} laporan`);

    // Nodes
    const roleStyle: Record<string, { fill: string; stroke: string }> = {
      community: { fill: "#e7edf5", stroke: PRIMARY.navy },
      school: { fill: "#fdf1de", stroke: PRIMARY.gold },
      intervention: { fill: "#ffffff", stroke: color },
      tag: { fill: "#f6e9e7", stroke: PRIMARY.maroon },
    };

    const nodeG = zoomG.append("g").attr("class", "nodes")
      .selectAll(".node").data(allPositioned, (d: any) => d.id).enter().append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
      .style("cursor", "grab")
      .call(d3.drag<SVGGElement, SimNode>()
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
      const rs = roleStyle[d.role] || { fill: "#f1f5f9", stroke: MUTED };
      const geom = ROLE_GEOM[d.role] ?? ROLE_GEOM.tag;
      const shapeG = g.append("g").attr("transform", geom.rotate ? `rotate(${geom.rotate})` : null);
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
          g.append("text").attr("y", startY + li * lineH).attr("text-anchor", "middle").attr("dominant-baseline", "middle")
            .attr("font-family", FONT_BODY).attr("font-size", d.role === "community" ? 11 : 10).attr("font-weight", 600)
            .attr("fill", INK).attr("pointer-events", "none").text(ln.length > 14 ? ln.slice(0, 13) + "…" : ln);
        });
      }
    });

    nodeG.on("mouseenter", (e, d: SimNode) => setHoveredInfo({ node: d.nodeRef, x: d.x, y: d.y }))
      .on("mouseleave", () => setHoveredInfo(null))
      .on("click", (e, d: SimNode) => { e.stopPropagation(); setPinnedInfo(prev => prev?.node.id === d.nodeRef.id ? null : { node: d.nodeRef, x: d.x, y: d.y }); });

    svg.on("click", () => setPinnedInfo(null));
  }, [rawNodes, rawEdges, tagCluster, color]);

  const info = pinnedInfo || hoveredInfo;

  const zoomInOut = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy as any, factor);
  };
  const resetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.transform as any, d3.zoomIdentity);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", fontFamily: FONT_BODY }}>
      <button
        onClick={onBack}
        style={{
          alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6,
          padding: "0.45rem 1.1rem", borderRadius: 10, border: `1.5px solid ${color}`,
          color, background: "white", fontWeight: 600, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer",
        }}
      >
        ← Kembali ke Peta Utama
      </button>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px", minWidth: 0, background: CANVAS_BG, borderRadius: 16, border: `1px solid ${CANVAS_BORDER}`, position: "relative", overflow: "hidden" }}>
          <svg ref={svgRef} viewBox={`0 0 ${W1} ${H1}`} style={{ width: "100%", height: "auto", display: "block", minHeight: 520 }} />
          <ZoomControls accent={color} onZoomIn={() => zoomInOut(1.3)} onZoomOut={() => zoomInOut(0.75)} onReset={resetZoom} />
          <div style={{ position: "absolute", bottom: 10, left: 14, display: "flex", gap: 14, fontSize: 12, fontFamily: FONT_BODY, color: MUTED, flexWrap: "wrap" }}>
            {[
              { label: "Komunitas", bg: "#e7edf5", stroke: PRIMARY.navy, shape: "square" },
              { label: "Sekolah", bg: "#fdf1de", stroke: PRIMARY.gold, shape: "diamond" },
              { label: "Intervensi", bg: "white", stroke: color, shape: "square" },
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

        <div style={{ flex: "1 1 270px", maxWidth: "100%", width: 270, minHeight: 200, flexShrink: 0, fontFamily: FONT_BODY }}>
          {info ? (
            <div style={{ background: "white", border: `2px solid ${color}`, borderRadius: 14, padding: "1.25rem", fontSize: 13, boxShadow: "0 4px 14px -4px rgba(16,46,80,0.15)" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <span style={{
                  padding: "0.2rem 0.65rem", borderRadius: 8, fontSize: 10, fontWeight: 700,
                  background: info.node.type === "community" ? "#e7edf5" : info.node.type === "school" ? "#fdf1de" : info.node.type === "tag" ? "#f6e9e7" : "#fff0f0",
                  color: info.node.type === "community" ? PRIMARY.navy : info.node.type === "school" ? "#8a6414" : info.node.type === "tag" ? PRIMARY.maroon : SECONDARY.darkRed,
                  border: "1px solid currentColor",
                }}>
                  {info.node.type === "community" ? "Komunitas" : info.node.type === "school" ? "Sekolah" : info.node.type === "tag" ? "Tag" : "Intervensi"}
                </span>
              </div>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15, color: PRIMARY.navy, marginBottom: "0.5rem", wordBreak: "break-word" }}>
                {info.node.label}
              </div>
              {info.node.type === "intervention" && info.node.data && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: 12, color: "#475569" }}>
                  {info.node.data.phase && <div><b style={{ color: PRIMARY.navy }}>Fase:</b> {info.node.data.phase}</div>}
                  {info.node.data.kondisi_awal && (
                    <div>
                      <b style={{ color: PRIMARY.navy }}>Kondisi awal:</b>
                      <p style={{ margin: "0.2rem 0 0", lineHeight: 1.5, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 4, overflow: "hidden" }}>{info.node.data.kondisi_awal}</p>
                    </div>
                  )}
                  {info.node.data.upaya_dilakukan && (
                    <div>
                      <b style={{ color: PRIMARY.navy }}>Upaya:</b>
                      <p style={{ margin: "0.2rem 0 0", lineHeight: 1.5, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 4, overflow: "hidden" }}>{info.node.data.upaya_dilakukan}</p>
                    </div>
                  )}
                </div>
              )}
              {info.node.type === "school" && info.node.data?.npsn && (
                <div style={{ fontSize: 12, color: MUTED, marginTop: "0.5rem" }}>NPSN: {info.node.data.npsn}</div>
              )}
              <div style={{ marginTop: "1rem", fontSize: 11, color: "#94a3b8", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem" }}>
                {pinnedInfo ? "Klik area kosong untuk melepas pin" : "Klik node untuk pin detail"}
              </div>
            </div>
          ) : (
            <div style={{ background: "#f8f7f2", border: `1.5px dashed ${CANVAS_BORDER}`, borderRadius: 14, padding: "1.5rem", fontSize: 13, color: "#94a3b8", textAlign: "center", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
              <IconTap />
              <span>Arahkan kursor atau klik node<br />untuk melihat detail narasi</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Level 0: Main Graph Component
// ─────────────────────────────────────────────────────────────────────────────
export default function InterventionGraph() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const clusterSelectionRef = useRef<d3.Selection<any, any, any, any> | null>(null);

  const [clusters, setClusters] = useState<TagCluster[]>([]);
  const [crossLinks, setCrossLinks] = useState<CrossTagLink[]>([]);
  const [totalInterventions, setTotal] = useState(0);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [selectedTag, setSelectedTag] = useState<TagCluster | null>(null);
  const [drillNodes, setDrillNodes] = useState<any[]>([]);
  const [drillEdges, setDrillEdges] = useState<any[]>([]);
  const [loadingDrill, setLoadingDrill] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);

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
    if (!search.trim()) return null; // null = tidak sedang memfilter
    const q = search.toLowerCase();
    return new Set(clusters.filter(c => c.tagName.toLowerCase().includes(q)).map(c => c.tagId));
  }, [clusters, search]);

  // ── Effect 1: bangun layout SEKALI (circle packing deterministik) ──────
  useEffect(() => {
    if (!svgRef.current || loadingOverview || clusters.length === 0 || selectedTag) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const CX = W0 / 2, CY = H0 / 2;

    // Radius visual blob per cluster (berdasarkan jumlah laporan)
    const visR = (count: number) => 46 + Math.sqrt(count) * 15;
    // Radius pembungkus utk packing: sedikit lebih besar dari radius visual
    // karena blob organik bisa melebar ~1.3x + padding antar-cluster.
    const packItems: PackItem[] = clusters.map(c => ({ id: c.tagId, r: visR(c.count) * 1.35 + 26 }));
    const packed = packCircles(packItems, CX, CY, 30);
    const posById = new Map(packed.map(p => [p.id, p]));

    const zoomG = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.4, 3]).on("zoom", (e) => zoomG.attr("transform", e.transform));
    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Cross-links antar tag (garis putus2)
    const linkG = zoomG.append("g").attr("class", "links");
    crossLinks.forEach(cl => {
      const a = posById.get(cl.tagIdA), b = posById.get(cl.tagIdB);
      if (!a || !b) return;
      const line = linkG.append("line")
        .attr("x1", a.x).attr("y1", a.y).attr("x2", b.x).attr("y2", b.y)
        .attr("stroke", "#cbd5e1").attr("stroke-width", Math.min(1 + cl.sharedCount * 0.8, 5))
        .attr("stroke-dasharray", "5,5").attr("opacity", 0.45);
      // Dua tag id disimpan di data-attribute berbeda supaya saat salah satu
      // ujung di-drag, kita tahu ujung mana (x1/y1 atau x2/y2) yang perlu diupdate.
      line.attr("data-endpoint-a", cl.tagIdA).attr("data-endpoint-b", cl.tagIdB);
    });

    // Cluster groups (blob + dots + label), posisi FIXED hasil packing
    const clusterG = zoomG.append("g").attr("class", "clusters")
      .selectAll(".cluster").data(clusters, (d: any) => d.tagId).enter().append("g")
      .attr("class", "cluster")
      .attr("data-id", (d: any) => d.tagId)
      .attr("transform", (d: any) => { const p = posById.get(d.tagId)!; return `translate(${p.x},${p.y})`; })
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, TagCluster>()
        .on("start", function () { d3.select(this).raise(); })
        .on("drag", function (e, d) {
          const p = posById.get(d.tagId)!; p.x = e.x; p.y = e.y;
          d3.select(this).attr("transform", `translate(${p.x},${p.y})`);
          linkG.selectAll(`line[data-endpoint-a="${d.tagId}"]`).attr("x1", p.x).attr("y1", p.y);
          linkG.selectAll(`line[data-endpoint-b="${d.tagId}"]`).attr("x2", p.x).attr("y2", p.y);
        })
      )
      .on("click", function (e, d: any) { if ((e as any).defaultPrevented) return; handleSelectTag(d); });

    clusterSelectionRef.current = clusterG;

    clusterG.each(function (d: TagCluster) {
      const g = d3.select(this);
      const r = visR(d.count);
      const dotPts = phyllotaxis(Math.min(d.count, 40), r * 0.62);
      g.append("path")
        .attr("d", blobPath(dotPts.length ? dotPts : [[0, 0]], 28, d.tagId.length + d.count))
        .attr("fill", colorFor(d.tagId)).attr("fill-opacity", 0.12)
        .attr("stroke", colorFor(d.tagId)).attr("stroke-width", 2).attr("stroke-opacity", 0.5);

      g.append("g").attr("class", "dots")
        .selectAll(".dot").data(dotPts).enter().append("rect")
        .attr("x", (p: Pt) => p[0] - 4).attr("y", (p: Pt) => p[1] - 4)
        .attr("width", 8).attr("height", 8).attr("rx", 2)
        .attr("fill", "#fff").attr("stroke", colorFor(d.tagId)).attr("stroke-width", 1.5);

      g.append("text").attr("text-anchor", "middle").attr("y", -r - 12)
        .attr("font-family", FONT_HEAD).attr("font-weight", 700).attr("font-size", 15)
        .attr("fill", colorFor(d.tagId)).text(`#${d.tagName}`);
      g.append("text").attr("text-anchor", "middle").attr("y", -r + 6)
        .attr("font-family", FONT_BODY).attr("font-size", 12).attr("fill", MUTED)
        .text(`${d.count} laporan`);
    });

    return () => { clusterSelectionRef.current = null; };
  }, [clusters, crossLinks, loadingOverview, selectedTag, overviewRenderKey]);

  // ── Effect 2: filter pencarian - hanya ubah opacity, TIDAK menata ulang posisi ──
  useEffect(() => {
    if (!clusterSelectionRef.current) return;
    clusterSelectionRef.current.transition().duration(150)
      .attr("opacity", (d: TagCluster) => !filteredIds || filteredIds.has(d.tagId) ? 1 : 0.15);
  }, [filteredIds]);

  const handleSelectTag = useCallback(async (tag: TagCluster) => {
    setSelectedTag(tag); setLoadingDrill(true); setDrillError(null);
    const res = await getInterventionGraphByTag(tag.tagId);
    if (res.success) { setDrillNodes(res.nodes || []); setDrillEdges(res.edges || []); }
    else setDrillError(res.error || "Gagal memuat detail.");
    setLoadingDrill(false);
  }, []);

  const handleBack = () => {
    setSelectedTag(null); setDrillNodes([]); setDrillEdges([]); setDrillError(null);
    setOverviewRenderKey(k => k + 1); // paksa remount graph utama → langsung tampil, tanpa refresh
  };

  const zoomInOut = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy as any, factor);
  };
  const resetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.transform as any, d3.zoomIdentity);
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
            <input
              type="text"
              placeholder="Cari tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "0.4rem 0.75rem", borderRadius: 8, border: `1px solid ${CANVAS_BORDER}`,
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
        <div style={{ background: CANVAS_BG, borderRadius: 18, border: `1px solid ${CANVAS_BORDER}`, minHeight: 560, position: "relative", overflow: "hidden" }}>
          {loadingOverview && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 560, color: "#94a3b8", fontFamily: FONT_BODY }}>Memuat peta cluster…</div>}
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
            <ZoomControls accent={PRIMARY.navy} onZoomIn={() => zoomInOut(1.3)} onZoomOut={() => zoomInOut(0.75)} onReset={resetZoom} />
          )}
          <div style={{ position: "absolute", bottom: 16, right: 20, fontSize: 12, fontFamily: FONT_BODY, color: MUTED, background: "rgba(255,255,255,0.85)", padding: "4px 12px", borderRadius: 20 }}>
            Tarik untuk geser, scroll untuk zoom, klik blob untuk buka relasi
          </div>
        </div>
      )}

      {selectedTag && (
        <div>
          {loadingDrill && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 520, color: "#94a3b8", background: CANVAS_BG, borderRadius: 18, border: `1px solid ${CANVAS_BORDER}`, fontFamily: FONT_BODY }}>Memuat detail relasi #{selectedTag.tagName}…</div>}
          {!loadingDrill && drillError && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 520, color: PRIMARY.maroon, background: "#fdf3f2", borderRadius: 18, border: "1px solid #f3c9c4", flexDirection: "column", gap: 12, fontFamily: FONT_BODY }}>
              <span>{drillError}</span>
              <button onClick={() => handleSelectTag(selectedTag)} style={{ padding: "0.5rem 1.5rem", borderRadius: 8, border: `1px solid ${PRIMARY.maroon}`, color: PRIMARY.maroon, background: "white", cursor: "pointer", fontWeight: 600 }}>Coba Lagi</button>
            </div>
          )}
          {!loadingDrill && !drillError && <DrilldownView tagCluster={selectedTag} rawNodes={drillNodes} rawEdges={drillEdges} onBack={handleBack} />}
        </div>
      )}
    </div>
  );
}