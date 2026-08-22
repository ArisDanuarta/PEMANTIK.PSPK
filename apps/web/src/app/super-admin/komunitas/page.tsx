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
  try {
    const { data: commData, error } = await supabase
      .from("communities")
      .select("*")
      .neq("name", "SEKOLAH INDEPENDEN")
      .order("name", { ascending: true })
      .limit(100000);
    
    if (error) {
      console.error("Failed to load communities:", error);
    } else {
      const { data: adminData } = await supabase
        .from("users")
        .select("community_id, username")
        .eq("role", "community");
        
      communities = (commData || []).map(c => {
        const admin = adminData?.find(a => a.community_id === c.id);
        return { ...c, username: admin?.username || `admin_${c.code}` };
      });
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

      <CommunitiesManager initialCommunities={communities} />
    </div>
  );
}
