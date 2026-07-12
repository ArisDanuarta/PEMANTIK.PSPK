"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge, Button } from "@pemantik/ui";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";

interface InterventionGraphProps {
  initialNodes: any[];
  initialEdges: any[];
  title?: string;
  description?: string;
}

export default function InterventionGraph({
  initialNodes = [],
  initialEdges = [],
  title = "Knowledge Graph Intervensi & Dampak Pembelajaran",
  description = "Visualisasi hubungan antara Sekolah/Komunitas, Laporan Intervensi Asesmen, dan Tag Kata Kunci Topik.",
}: InterventionGraphProps) {
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [searchTag, setSearchTag] = useState("");

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // =========================================================================
  // INTEGRASI FORCE-DIRECTED LAYOUT (OBSIDIAN STYLE) MENGGUNAKAN D3-FORCE
  // =========================================================================
  useEffect(() => {
    if (initialNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // 1. Inisialisasi posisi awal acak di sekitar titik tengah
    const d3Nodes = initialNodes.map((n) => ({
      ...n,
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
    }));

    // 2. Pemetaan relasi antar node
    const d3Links = initialEdges.map((e) => ({
      ...e,
      source: e.source,
      target: e.target,
    }));

    // 3. Konfigurasi Mesin Fisika (Force Simulation)
    const simulation = forceSimulation(d3Nodes as any)
      // Tolak-menolak antar node yang kuat (menyebar seperti Obsidian)
      .force("charge", forceManyBody().strength(-1200))
      // Mencegah tumpang tindih
      .force("collide", forceCollide().radius(70))
      // Tarik ke pusat agar tidak melayang keluar layar
      .force("center", forceCenter(0, 0))
      // Tarik-menarik antar node yang memiliki edge (relasi)
      .force(
        "link",
        forceLink(d3Links as any)
          .id((d: any) => d.id)
          .distance(150)
      );

    // 4. Update posisi React Flow pada setiap siklus frame ("tick")
    simulation.on("tick", () => {
      setNodes(
        d3Nodes.map((n: any) => {
          const isHighlighted = searchTag
            ? n.label.toLowerCase().includes(searchTag.toLowerCase()) ||
              (n.type === "tag" && n.label.toLowerCase().includes(searchTag.toLowerCase()))
            : false;

          let bgColor = "#ffffff";
          let borderColor = "#cbd5e1";
          let color = "#1e293b";
          let borderRadius = "999px"; // Bentuk membulat (Pill/Circle) seperti node graf asli

          if (n.type === "school") {
            bgColor = isHighlighted ? "#fef08a" : "#eff6ff";
            borderColor = isHighlighted ? "#ca8a04" : "#3b82f6";
            color = "#1e40af";
          } else if (n.type === "intervention") {
            bgColor = isHighlighted ? "#fef08a" : "#f0fdf4";
            borderColor = isHighlighted ? "#ca8a04" : "#22c55e";
            color = "#166534";
          } else if (n.type === "tag") {
            bgColor = isHighlighted ? "#fef08a" : "#faf5ff";
            borderColor = isHighlighted ? "#ca8a04" : "#a855f7";
            color = "#6b21a8";
          }

          return {
            id: n.id,
            type: n.type,
            data: { ...n.data, label: n.label },
            position: { x: n.x, y: n.y },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: {
              background: bgColor,
              border: `2px solid ${borderColor}`,
              color,
              padding: "0.6rem 1rem",
              borderRadius,
              fontWeight: 600,
              fontSize: "0.85rem",
              boxShadow: isHighlighted
                ? "0 0 15px rgba(234,179,8,0.8)"
                : "0 4px 6px rgba(0,0,0,0.1)",
              cursor: "pointer",
              maxWidth: "200px",
              textAlign: "center" as const,
              transition: "box-shadow 0.2s",
            },
          };
        })
      );
    });

    // Garis relasi diatur menjadi lurus dan lebih tipis (khas network graph)
    setEdges(
      initialEdges.map((e) => ({
        ...e,
        type: "straight",
        style: { stroke: "#64748b", strokeWidth: 1.5, opacity: 0.4 },
        animated: false,
      }))
    );

    // Pembersihan saat komponen di-unmount agar tidak memberatkan memori
    return () => {
      simulation.stop();
    };
  }, [initialNodes, initialEdges, searchTag, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    setSelectedNode(node);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, color: "#102e50", fontSize: "1.15rem" }}>{title}</h3>
          <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.85rem" }}>{description}</p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            type="text"
            placeholder="🔍 Cari node atau tag..."
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            style={{ padding: "0.5rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.85rem", width: "230px" }}
          />
          {searchTag && (
            <Button size="sm" variant="outline" onClick={() => setSearchTag("")}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Graph Area + Sidebar Detail */}
      <div style={{ display: "flex", gap: "1rem", height: "620px", position: "relative" }}>
        <div style={{ flex: 1, border: "1px solid #1e293b", borderRadius: "1rem", overflow: "hidden", backgroundColor: "#0f172a" }}>
          {initialNodes.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🕸️</div>
              <h4 style={{ margin: "0 0 0.25rem 0", color: "#f8fafc" }}>Knowledge Graph Masih Kosong</h4>
              <p style={{ margin: 0, fontSize: "0.85rem", textAlign: "center", maxWidth: "400px" }}>
                Belum ada data intervensi. Setelah form diisi, graf relasi fisika akan otomatis muncul di sini.
              </p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              attributionPosition="bottom-left"
              minZoom={0.1}
            >
              {/* Background diubah menjadi gelap agar lebih terasa seperti Obsidian */}
              <Background color="#334155" gap={25} size={1.5} />
              <Controls style={{ fill: "#f8fafc", backgroundColor: "#1e293b" }} />
              <MiniMap
                nodeColor={(n: any) => {
                  if (n.type === "school") return "#3b82f6";
                  if (n.type === "intervention") return "#22c55e";
                  return "#a855f7";
                }}
                maskColor="rgba(0, 0, 0, 0.4)"
                style={{ backgroundColor: "#1e293b" }}
              />
            </ReactFlow>
          )}
        </div>

        {/* Detail Inspector Panel */}
        {selectedNode && (
          <div style={{
            width: "340px",
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "1rem",
            padding: "1.25rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <Badge variant={selectedNode.type === "school" ? "info" : selectedNode.type === "intervention" ? "success" : "warning"}>
                  {selectedNode.type === "school" ? "🏢 Sekolah / Komunitas" : selectedNode.type === "intervention" ? "📋 Laporan Intervensi" : "🏷️ Tag Topik"}
                </Badge>
                <h4 style={{ margin: "0.5rem 0 0 0", color: "#0f172a", fontSize: "1.05rem" }}>
                  {selectedNode.data?.label || selectedNode.label}
                </h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: "none", border: "none", fontSize: "1.25rem", color: "#64748b", cursor: "pointer", lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <hr style={{ border: 0, borderTop: "1px solid #f1f3f5", margin: 0 }} />

            {selectedNode.type === "school" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                <div><strong style={{ color: "#475569" }}>ID Sekolah:</strong> {selectedNode.data?.school_id || "—"}</div>
                {selectedNode.data?.npsn && <div><strong style={{ color: "#475569" }}>NPSN:</strong> {selectedNode.data.npsn}</div>}
              </div>
            )}

            {selectedNode.type === "intervention" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
                <div>
                  <strong style={{ display: "block", color: "#475569", marginBottom: "0.2rem" }}>Fase Asesmen:</strong>
                  <Badge variant="info">{selectedNode.data?.phase || "—"}</Badge>
                </div>
                {selectedNode.data?.created_at && (
                  <div>
                    <strong style={{ display: "block", color: "#475569", marginBottom: "0.1rem" }}>Tanggal Submit:</strong>
                    {new Date(selectedNode.data.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                )}
                {selectedNode.data?.kondisi_awal && (
                  <div>
                    <strong style={{ display: "block", color: "#475569", marginBottom: "0.2rem" }}>Kondisi Awal / Diagnosa:</strong>
                    <div style={{ backgroundColor: "#f8fafc", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", color: "#334155" }}>
                      {selectedNode.data.kondisi_awal}
                    </div>
                  </div>
                )}
                {selectedNode.data?.upaya_dilakukan && (
                  <div>
                    <strong style={{ display: "block", color: "#475569", marginBottom: "0.2rem" }}>Upaya yang Dilakukan:</strong>
                    <div style={{ backgroundColor: "#f8fafc", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", color: "#334155" }}>
                      {selectedNode.data.upaya_dilakukan}
                    </div>
                  </div>
                )}
                {selectedNode.data?.perubahan_signifikan && (
                  <div>
                    <strong style={{ display: "block", color: "#475569", marginBottom: "0.2rem" }}>Perubahan Signifikan:</strong>
                    <div style={{ backgroundColor: "#f8fafc", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", color: "#334155" }}>
                      {selectedNode.data.perubahan_signifikan}
                    </div>
                  </div>
                )}
                {selectedNode.data?.alasan_bermakna && (
                  <div>
                    <strong style={{ display: "block", color: "#475569", marginBottom: "0.2rem" }}>Alasan Bermakna:</strong>
                    <div style={{ backgroundColor: "#f8fafc", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", color: "#334155" }}>
                      {selectedNode.data.alasan_bermakna}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedNode.type === "tag" && (
              <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                Tag ini menghubungkan berbagai intervensi yang memiliki tantangan atau solusi serupa di berbagai sekolah binaan.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}