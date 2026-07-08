import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import CommunitiesManager from "./CommunitiesManager";

export const metadata: Metadata = {
  title: "Kelola Komunitas / Mitra",
  description: "Manajemen data mitra dan komunitas pengelola sekolah",
};

export default async function KomunitasPage() {
  const supabase = createServerClient();

  let communities: any[] = [];
  let schools: any[] = [];
  try {
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .order("name", { ascending: true });
    
    if (error) {
      console.error("Failed to load communities:", error);
    } else {
      communities = data ?? [];
    }
    
    const { data: schoolsData, error: schoolsError } = await supabase
      .from("schools")
      .select("id, name, community_id")
      .eq("is_active", true)
      .order("name", { ascending: true });
      
    if (!schoolsError && schoolsData) {
      schools = schoolsData;
    }
  } catch (err) {
    console.error("Unexpected error loading communities:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Komunitas &amp; Mitra</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Komunitas</span>
          </div>
        </div>
      </div>

      <CommunitiesManager initialCommunities={communities} initialSchools={schools} />
    </div>
  );
}
