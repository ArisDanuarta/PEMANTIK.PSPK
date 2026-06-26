import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import Link from "next/link";
import { Button } from "@pemantik/ui";
import AksesUjianClient from "./AksesUjianClient";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Akses Ujian (Distribusi Kategori)",
  description: "Manajemen penugasan kategori ujian ke komunitas",
};

export default async function AksesUjianPage() {
  const supabase = createServerClient();

  // Fetch all packages
  const { data: packagesData } = await supabase
    .from("question_categories")
    .select("id, name, subject_area");

  // We will show all packages to Super Admin for now
  const publishedCategories = packagesData || [];

  // Fetch all communities for super admin
  const { data: communitiesData } = await supabase
    .from("communities")
    .select("id, name, code");

  // Fetch all schools for super admin
  const { data: schoolsData } = await supabase
    .from("schools")
    .select("id, name, npsn, community_id, communities(name)");

  // Fetch access logs to show on the table
  const { data: rawAccessLogs } = await supabase
    .from("assessment_access")
    .select(`
      *,
      question_categories(name, subject_area)
    `)
    .in('target_type', ['community', 'school'])
    .order('created_at', { ascending: false });

  // Map target names manually because target_id is polymorphic without FK
  const accessLogs = (rawAccessLogs || []).map((log: any) => {
    let targetName = "Unknown";
    if (log.target_type === 'community') {
      const c = communitiesData?.find(c => c.id === log.target_id);
      if (c) targetName = c.name;
    } else if (log.target_type === 'school') {
      const s = schoolsData?.find(s => s.id === log.target_id);
      if (s) targetName = s.name;
    }
    return { ...log, target_name: targetName };
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Akses Ujian</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Distribusi Kategori Ujian</span>
          </div>
        </div>
      </div>

      <AksesUjianClient 
        packages={packagesData || []} 
        communities={communitiesData || []} 
        schools={schoolsData || []}
        accessLogs={accessLogs || []} 
      />
    </div>
  );
}
