import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import SchoolsManager from "./SchoolsManager";

export const metadata: Metadata = {
  title: "Kelola Sekolah",
  description: "Manajemen data sekolah lintas komunitas",
};

export default async function SekolahPage() {
  const supabase = createServerClient();

  let schools: any[] = [];
  let communities: any[] = [];
  
  try {
    const [
      { data: scData },
      { data: commData }
    ] = await Promise.all([
      supabase.from("schools").select("*, communities(id, name, is_sandbox), users(username, role), classes(id, name)").order("name", { ascending: true }),
      supabase.from("communities").select("id, name").eq("is_active", true).neq("name", "SEKOLAH INDEPENDEN").order("name", { ascending: true })
    ]);
    
    schools = scData ?? [];
    communities = commData ?? [];
  } catch (err) {
    console.error("Unexpected error loading schools:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Data Sekolah</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Sekolah</span>
          </div>
        </div>
      </div>

      <SchoolsManager initialSchools={schools} communities={communities} />
    </div>
  );
}
