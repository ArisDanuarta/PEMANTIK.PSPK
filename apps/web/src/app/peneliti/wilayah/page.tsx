import type { Metadata } from "next";
import { SupabaseClient } from "@supabase/supabase-js";
import React from "react";
import PenelitiWilayahClient from "./PenelitiWilayahClient";
import { createServerClient } from "@pemantik/supabase";

export const metadata: Metadata = {
  title: "Analisis Wilayah",
  description: "Visualisasi Distribusi Pengguna dan Hasil Asesmen berdasarkan Wilayah Geografis",
};

export const dynamic = "force-dynamic";

export interface FlatWilayahStat {
  school_id: string;
  school_name: string;
  province: string;
  city: string;
  district: string;
  village: string;
  student_count: number;
  teacher_count: number;
  avg_score: number | null;
}

export interface HierarchicalNode {
  name: string;
  type: 'national' | 'province' | 'city' | 'district' | 'village' | 'school';
  schoolCount: number;
  studentCount: number;
  teacherCount: number;
  avgScore: number;
  children: HierarchicalNode[];
  _sumScore: number;
  _scoreCount: number;
}

export default async function PenelitiWilayahPage() {
  const supabase = createServerClient() as SupabaseClient;
  
  let rawData: FlatWilayahStat[] = [];
  
  try {
    const { data, error } = await supabase.rpc("get_peneliti_wilayah_stats");
    if (error) {
      console.error("RPC Error (get_peneliti_wilayah_stats):", error);
    } else if (Array.isArray(data)) {
      rawData = data;
    }
  } catch (err) {
    console.error("Failed to load data for Wilayah analysis", err);
  }
  
  const root: HierarchicalNode = {
    name: "Nasional",
    type: "national",
    schoolCount: 0, studentCount: 0, teacherCount: 0, avgScore: 0,
    children: [], _sumScore: 0, _scoreCount: 0
  };
  
  const nodeMap = new Map<string, HierarchicalNode>();
  nodeMap.set("root", root);
  
  const getOrCreateNode = (parentId: string, parentNode: HierarchicalNode, name: string, type: HierarchicalNode['type']): HierarchicalNode => {
    const id = `${parentId}-${name}`;
    if (!nodeMap.has(id)) {
      const newNode: HierarchicalNode = {
        name, type,
        schoolCount: 0, studentCount: 0, teacherCount: 0, avgScore: 0,
        children: [], _sumScore: 0, _scoreCount: 0
      };
      parentNode.children.push(newNode);
      nodeMap.set(id, newNode);
    }
    return nodeMap.get(id)!;
  };
  
  for (const row of rawData) {
    const prov = row.province || "TIDAK DIKETAHUI";
    const city = row.city || "TIDAK DIKETAHUI";
    const dist = row.district || "TIDAK DIKETAHUI";
    const vill = row.village || "TIDAK DIKETAHUI";
    
    const provNode = getOrCreateNode("root", root, prov, "province");
    const cityNode = getOrCreateNode(`root-${prov}`, provNode, city, "city");
    const distNode = getOrCreateNode(`root-${prov}-${city}`, cityNode, dist, "district");
    const villNode = getOrCreateNode(`root-${prov}-${city}-${dist}`, distNode, vill, "village");
    const schoolNode = getOrCreateNode(`root-${prov}-${city}-${dist}-${vill}`, villNode, row.school_name || "Tanpa Nama", "school");
    
    // Accumulate stats
    const nodes = [root, provNode, cityNode, distNode, villNode, schoolNode];
    for (const n of nodes) {
      if (n.type === 'school') {
         n.schoolCount = 1;
      } else {
         n.schoolCount += 1; 
      }
      n.studentCount += (row.student_count || 0);
      n.teacherCount += (row.teacher_count || 0);
      
      if (row.avg_score != null) {
         const weight = (row.student_count && row.student_count > 0) ? row.student_count : 1;
         n._sumScore += (row.avg_score * weight);
         n._scoreCount += weight;
         n.avgScore = n._sumScore / n._scoreCount;
      }
    }
  }

  return (
    <div className="animate-fade-in" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Analisis Wilayah Geografis</h1>
          <div className="page-breadcrumb">
            <span>Peneliti</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Analisis Asesmen</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Analisis Wilayah</span>
          </div>
        </div>
      </div>

      <PenelitiWilayahClient hierarchicalData={root} />
    </div>
  );
}
