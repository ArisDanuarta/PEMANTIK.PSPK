"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";

// ─── Types ──────────────────────────────────────────────────────────────────
interface GraphNodeData {
  id: string;
  type: "school" | "intervention" | "tag" | "community";
  label: string;
  data: Record<string, any>;
}

interface InterventionGraphProps {
  initialNodes: GraphNodeData[];
  initialEdges: any[];
  title?: string;
  description?: string;
}

// ─── Node Appearance Config ──────────────────────────────────────────────────
const NODE_CONFIG = {
  school: {
    bg: "#1e3a5f",
    border: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.5)",
    color: "#e0f2fe",
    size: { w: 180, h: 48 },
    radius: "12px",
    fontWeight: 700,
    fontSize: "0.82rem",
    icon: "🏫",
    miniColor: "#3b82f6",
  },
  community: {
    bg: "#1e1e4e",
    border: "#6366f1",
    glow: "rgba(99, 102, 241, 0.5)",
    color: "#e0e7ff",
    size: { w: 200, h: 52 },
    radius: "14px",
    fontWeight: 800,
    fontSize: "0.88rem",
    icon: "🏛️",
    miniColor: "#6366f1",
  },
  intervention: {
    bg: "#0f2e1e",
    border: "#22c55e",
    glow: "rgba(34, 197, 94, 0.45)",
    color: "#dcfce7",
    size: { w: 190, h: 52 },
    radius: "10px",
    fontWeight: 600,
    fontSize: "0.78rem",
    icon: "📋",
    miniColor: "#22c55e",
  },
  tag: {
    bg: "#2d1f4e",
    border: "#a855f7",
    glow: "rgba(168, 85, 247, 0.45)",
    color: "#f3e8ff",
    size: { w: 140, h: 38 },
    radius: "999px",
    fontWeight: 700,
    fontSize: "0.73rem",
    icon: "#",
    miniColor: "#a855f7",
  },
};

// ─── Edge Appearance Config ──────────────────────────────────────────────────
function getEdgeStyle(source: string, target: string) {
  if (source.startsWith("comm_") && target.startsWith("school_")) {
    return { stroke: "#6366f1", strokeWidth: 2, opacity: 0.6 };
  }
  if (source.startsWith("school_") && target.startsWith("intervention_")) {
    return { stroke: "#22c55e", strokeWidth: 1.5, opacity: 0.5 };
  }
  if (source.startsWith("comm_") && target.startsWith("intervention_")) {
    return { stroke: "#3b82f6", strokeWidth: 1.5, opacity: 0.5 };
  }
  if (target.startsWith("tag_")) {
    return { stroke: "#a855f7", strokeWidth: 1, opacity: 0.4 };
  }
  return { stroke: "#64748b", strokeWidth: 1, opacity: 0.35 };
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function RawInterventionGraph({
  initialNodes = [],
  initialEdges = [],
  title = "Knowledge Graph Intervensi & Dampak Pembelajaran",
  description = "Peta pengetahuan hidup - hubungan antar Komunitas, Sekolah, Laporan Intervensi, dan Topik Pembelajaran",
}: InterventionGraphProps) {
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [searchTag, setSearchTag] = useState("");
  const [filterType, setFilterType] = useState<"all" | "school" | "intervention" | "tag" | "community">("all");
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Stats
  const stats = useMemo(() => {
    const schools = initialNodes.filter((n) => n.type === "school").length;
    const communities = initialNodes.filter((n) => n.type === "community").length;
    const interventions = initialNodes.filter((n) => n.type === "intervention").length;
    const tags = initialNodes.filter((n) => n.type === "tag").length;
    return { schools, communities, interventions, tags, total: initialNodes.length };
  }, [initialNodes]);

  // Determine which node IDs are highlighted based on search + filter
  useEffect(() => {
    if (!searchTag && filterType === "all") {
      setHighlightedIds(new Set());
      return;
    }
    const ids = new Set<string>();
    for (const n of initialNodes) {
      const matchesSearch = searchTag
        ? n.label.toLowerCase().includes(searchTag.toLowerCase())
        : true;
      const matchesFilter = filterType === "all" || n.type === filterType;
      if (matchesSearch && matchesFilter) ids.add(n.id);
    }
    // Also highlight edges connected to highlighted nodes
    setHighlightedIds(ids);
  }, [searchTag, filterType, initialNodes]);

  // Build React Flow nodes from D3 simulation
  useEffect(() => {
    if (initialNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const d3Nodes = initialNodes.map((n) => ({
      ...n,
      x: Math.random() * 1000 - 500,
      y: Math.random() * 700 - 350,
    }));

    const d3Links = initialEdges.map((e) => ({
      ...e,
      source: e.source,
      target: e.target,
    }));

    const simulation = forceSimulation(d3Nodes as any)
      .force("charge", forceManyBody().strength(-1800))
      .force("collide", forceCollide().radius((d: any) => {
        const cfg = NODE_CONFIG[d.type as keyof typeof NODE_CONFIG] ?? NODE_CONFIG.tag;
        return Math.max(cfg.size.w, cfg.size.h) / 2 + 25;
      }))
      .force("center", forceCenter(0, 0))
      .force(
        "link",
        forceLink(d3Links as any)
          .id((d: any) => d.id)
          .distance((link: any) => {
            const src = (link.source as any).type;
            const tgt = (link.target as any).type;
            if (src === "community" && tgt === "school") return 200;
            if (tgt === "tag") return 130;
            return 175;
          })
      )
      .alphaDecay(0.03)
      .velocityDecay(0.4);

    simulation.on("tick", () => {
      setNodes(
        d3Nodes.map((n: any) => {
          const cfg = NODE_CONFIG[n.type as keyof typeof NODE_CONFIG] ?? NODE_CONFIG.tag;
          const isHighlighted = highlightedIds.size === 0 || highlightedIds.has(n.id);
          const isDimmed = highlightedIds.size > 0 && !isHighlighted;

          return {
            id: n.id,
            type: "default",
            data: {
              label: (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", justifyContent: "center", textAlign: "center" }}>
                  <span>{cfg.icon}</span>
                  <span style={{ lineHeight: 1.3 }}>{n.label}</span>
                </div>
              ) as any,
            },
            position: { x: n.x, y: n.y },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: {
              background: isDimmed ? "rgba(30, 41, 59, 0.3)" : cfg.bg,
              border: `2px solid ${isDimmed ? "rgba(100,116,139,0.3)" : cfg.border}`,
              color: isDimmed ? "rgba(148,163,184,0.4)" : cfg.color,
              padding: "0.5rem 0.9rem",
              borderRadius: cfg.radius,
              fontWeight: cfg.fontWeight,
              fontSize: cfg.fontSize,
              boxShadow: isHighlighted && highlightedIds.size > 0
                ? `0 0 20px ${cfg.glow}, 0 0 40px ${cfg.glow}`
                : isDimmed
                ? "none"
                : `0 0 12px rgba(0,0,0,0.4), 0 0 1px ${cfg.border}`,
              cursor: "pointer",
              minWidth: `${cfg.size.w}px`,
              minHeight: `${cfg.size.h}px`,
              maxWidth: "220px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center" as const,
              transition: "all 0.25s ease",
              opacity: isDimmed ? 0.35 : 1,
            },
          };
        })
      );
    });

    // Set edges with styled colors
    setEdges(
      initialEdges.map((e) => {
        const style = getEdgeStyle(e.source, e.target);
        const isConnectedToHighlight =
          highlightedIds.size === 0 ||
          highlightedIds.has(e.source) ||
          highlightedIds.has(e.target);

        return {
          ...e,
          label: undefined, // pastikan tidak ada label teks ("tag") yang muncul menutupi garis relasi
          type: "smoothstep",
          style: {
            ...style,
            opacity: isConnectedToHighlight ? style.opacity + 0.2 : 0.1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: style.stroke,
            width: 12,
            height: 12,
          },
          animated: isConnectedToHighlight && highlightedIds.size > 0,
        };
      })
    );

    return () => {
      simulation.stop();
    };
  }, [initialNodes, initialEdges, highlightedIds, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    // Find the original node data
    const orig = initialNodes.find((n) => n.id === node.id);
    setSelectedNode(orig ?? node);
  }, [initialNodes]);

  const handleTypeFilter = (type: typeof filterType) => {
    setFilterType(filterType === type ? "all" : type);
  };

  return (
    <div
      style={
        isFullscreen
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              backgroundColor: "#060d1a",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
              height: "100vh",
              overflow: "hidden",
            }
          : { display: "flex", flexDirection: "column", gap: "0.875rem", height: "100%" }
      }
    >

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: "0.75rem", flexWrap: "wrap",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        padding: "1rem 1.25rem", borderRadius: "0.875rem",
        border: "1px solid #334155",
      }}>
        {[
          { label: "Komunitas", count: stats.communities, color: "#6366f1", icon: "🏛️", type: "community" as const },
          { label: "Sekolah", count: stats.schools, color: "#3b82f6", icon: "🏫", type: "school" as const },
          { label: "Laporan Intervensi", count: stats.interventions, color: "#22c55e", icon: "📋", type: "intervention" as const },
          { label: "Tag Topik", count: stats.tags, color: "#a855f7", icon: "#", type: "tag" as const },
        ].map((s) => (
          <button
            key={s.type}
            onClick={() => handleTypeFilter(s.type)}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 0.875rem", borderRadius: "0.625rem",
              border: `1px solid ${filterType === s.type ? s.color : "rgba(255,255,255,0.1)"}`,
              background: filterType === s.type ? `${s.color}22` : "transparent",
              color: filterType === s.type ? s.color : "#94a3b8",
              cursor: "pointer", transition: "all 0.2s",
              fontWeight: filterType === s.type ? 700 : 500,
              fontSize: "0.82rem",
            }}
          >
            <span>{s.icon}</span>
            <span style={{ color: s.color, fontWeight: 700, fontSize: "1rem" }}>{s.count}</span>
            <span>{s.label}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ color: "#475569", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ color: "#64748b" }}>Total Node:</span>
          <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: "1rem" }}>{stats.total}</span>
        </div>
      </div>

      {/* ── Control Bar ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "360px" }}>
          <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Cari node, tag, sekolah..."
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            style={{
              width: "100%", paddingLeft: "2.25rem", paddingRight: "0.875rem",
              paddingTop: "0.55rem", paddingBottom: "0.55rem",
              borderRadius: "0.625rem", border: "1px solid #334155",
              background: "#1e293b", color: "#f1f5f9", fontSize: "0.85rem",
              outline: "none",
            }}
          />
        </div>
        {(searchTag || filterType !== "all") && (
          <button
            onClick={() => { setSearchTag(""); setFilterType("all"); }}
            style={{
              padding: "0.5rem 0.875rem", borderRadius: "0.5rem",
              border: "1px solid #ef4444", background: "transparent",
              color: "#ef4444", fontSize: "0.8rem", cursor: "pointer", fontWeight: 600,
            }}
          >
            Reset Filter
          </button>
        )}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          style={{
            padding: "0.5rem 0.875rem",
            borderRadius: "0.5rem",
            border: `1px solid ${isFullscreen ? "#f59e0b" : "#3b82f6"}`,
            background: isFullscreen ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)",
            color: isFullscreen ? "#fcd34d" : "#60a5fa",
            fontSize: "0.8rem",
            cursor: "pointer",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s",
          }}
        >
          {isFullscreen ? "✕ Keluar Fullscreen (ESC)" : "⛶ Fullscreen Graph"}
        </button>
        <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#475569", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
          Komunitas
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", display: "inline-block", marginLeft: "0.5rem" }} />
          Sekolah
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block", marginLeft: "0.5rem" }} />
          Intervensi
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#a855f7", display: "inline-block", marginLeft: "0.5rem" }} />
          Tag
        </div>
      </div>

      {/* ── Main Graph + Inspector Panel ──────────────────────────────────── */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", flex: 1, minHeight: "600px" }}>
        <div style={{
          flex: "1 1 300px", minWidth: 0, borderRadius: "1rem", overflow: "hidden",
          background: "linear-gradient(180deg, #060d1a 0%, #0d1b2e 100%)",
          border: "1px solid #1e3a5f",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)",
        }}>
          {initialNodes.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", color: "#334155",
              gap: "1rem",
            }}>
              <div style={{ fontSize: "3.5rem", filter: "grayscale(0.3)" }}>🕸️</div>
              <h4 style={{ margin: 0, color: "#475569", fontSize: "1.05rem" }}>
                Knowledge Graph Masih Kosong
              </h4>
              <p style={{ margin: 0, color: "#374151", fontSize: "0.85rem", textAlign: "center", maxWidth: "380px" }}>
                Setelah laporan intervensi diisi dan disubmit, peta pengetahuan akan
                tumbuh secara organik di sini - menghubungkan sekolah, topik, dan dampak.
              </p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onPaneClick={() => setSelectedNode(null)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              attributionPosition="bottom-left"
              minZoom={0.05}
              maxZoom={3}
              defaultEdgeOptions={{ type: "smoothstep" }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                color="#1e3a5f"
                gap={28}
                size={1.2}
              />
              <Controls
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "0.625rem",
                }}
              />
              <MiniMap
                nodeColor={(n: any) => {
                  const orig = initialNodes.find((o) => o.id === n.id);
                  const cfg = NODE_CONFIG[(orig?.type ?? "tag") as keyof typeof NODE_CONFIG];
                  return cfg?.miniColor ?? "#64748b";
                }}
                maskColor="rgba(6, 13, 26, 0.75)"
                style={{
                  background: "#0d1b2e",
                  border: "1px solid #1e3a5f",
                  borderRadius: "0.5rem",
                }}
              />
            </ReactFlow>
          )}
        </div>

        {/* Inspector Panel */}
        {selectedNode && (
          <div style={{
            flex: "1 1 340px", maxWidth: "100%", width: "340px",
            background: "linear-gradient(180deg, #0f1f3a 0%, #0d172b 100%)",
            border: "1px solid #1e3a5f",
            borderRadius: "1rem",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            overflowY: "auto",
            boxShadow: "0 0 30px rgba(0,0,0,0.4)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                {(() => {
                  const cfg = NODE_CONFIG[(selectedNode.type ?? "tag") as keyof typeof NODE_CONFIG];
                  return (
                    <span style={{
                      display: "inline-block", padding: "0.25rem 0.75rem",
                      borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700,
                      background: `${cfg.border}22`, border: `1px solid ${cfg.border}`,
                      color: cfg.color, marginBottom: "0.5rem",
                    }}>
                      {cfg.icon} {selectedNode.type?.toUpperCase()}
                    </span>
                  );
                })()}
                <h4 style={{ margin: 0, color: "#f1f5f9", fontSize: "1rem", lineHeight: 1.4 }}>
                  {selectedNode.label}
                </h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid #334155",
                  fontSize: "1rem", color: "#64748b", cursor: "pointer",
                  borderRadius: "0.4rem", padding: "0.25rem 0.5rem", lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ borderTop: "1px solid #1e3a5f", margin: 0 }} />

            {/* School / Community node */}
            {(selectedNode.type === "school" || selectedNode.type === "community") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", fontSize: "0.83rem" }}>
                {selectedNode.data?.npsn && (
                  <InfoRow label="NPSN" value={selectedNode.data.npsn} />
                )}
                {selectedNode.data?.school_id && (
                  <InfoRow label="School ID" value={selectedNode.data.school_id.slice(0, 12) + "…"} />
                )}
                {selectedNode.data?.community_id && (
                  <InfoRow label="Community ID" value={selectedNode.data.community_id.slice(0, 12) + "…"} />
                )}
              </div>
            )}

            {/* Intervention node */}
            {selectedNode.type === "intervention" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", fontSize: "0.82rem" }}>
                {selectedNode.data?.phase && (
                  <div>
                    <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fase Asesmen</span>
                    <div style={{
                      marginTop: "0.25rem", padding: "0.35rem 0.65rem",
                      borderRadius: "999px", display: "inline-block",
                      background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e",
                      color: "#86efac", fontSize: "0.8rem", fontWeight: 700,
                    }}>
                      {selectedNode.data.phase}
                    </div>
                  </div>
                )}
                {selectedNode.data?.created_at && (
                  <InfoRow
                    label="Tanggal Submit"
                    value={new Date(selectedNode.data.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  />
                )}
                {[
                  { key: "kondisi_awal", label: "Diagnosa Awal", accent: "#3b82f6" },
                  { key: "upaya_dilakukan", label: "Upaya Intervensi", accent: "#22c55e" },
                  { key: "perubahan_signifikan", label: "Dampak Nyata", accent: "#f59e0b" },
                  { key: "alasan_bermakna", label: "Alasan Bermakna", accent: "#a855f7" },
                ].map((field) => selectedNode.data?.[field.key] && (
                  <div key={field.key}>
                    <span style={{ fontSize: "0.68rem", color: field.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {field.label}
                    </span>
                    <div style={{
                      marginTop: "0.25rem", padding: "0.6rem 0.75rem",
                      borderRadius: "0.5rem",
                      background: `${field.accent}10`,
                      border: `1px solid ${field.accent}30`,
                      color: "#cbd5e1", lineHeight: 1.55,
                      fontSize: "0.8rem",
                      maxHeight: "80px", overflowY: "auto",
                    }}>
                      {selectedNode.data[field.key]}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tag node */}
            {selectedNode.type === "tag" && (
              <div style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 0.75rem 0" }}>
                  Tag ini adalah <strong style={{ color: "#c4b5fd" }}>kata kunci pengetahuan</strong> yang menghubungkan berbagai laporan intervensi dengan tantangan atau solusi serupa.
                </p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                  Semakin banyak edge yang terhubung ke tag ini, semakin banyak sekolah yang mengalami tantangan yang sama - informasi berharga untuk intervensi sistemik.
                </p>
              </div>
            )}

            {/* Tip */}
            <div style={{
              marginTop: "auto", padding: "0.6rem 0.75rem",
              borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)",
              border: "1px solid #1e3a5f",
              fontSize: "0.72rem", color: "#475569",
              lineHeight: 1.5,
            }}>
              💡 Klik node lain di graph untuk memeriksa detailnya. Gunakan filter di atas untuk menyoroti tipe node tertentu.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper component ────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
      <span style={{ color: "#64748b", fontWeight: 600, flexShrink: 0 }}>{label}:</span>
      <span style={{ color: "#cbd5e1", textAlign: "right" }}>{value}</span>
    </div>
  );
}