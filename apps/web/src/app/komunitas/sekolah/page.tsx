import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import SchoolsManagerKomunitas from "./SchoolsManagerKomunitas";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Kelola Sekolah Binaan | Pemantik",
  description: "Manajemen data sekolah untuk komunitas",
};

export const dynamic = 'force-dynamic';

export default async function SekolahKomunitasPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  if (!communityId) {
    redirect("/login");
  }

  let schools: any[] = [];
  let communityName = "Komunitas";
  
  try {
    const [
      { data: scData },
      { data: commData }
    ] = await Promise.all([
      supabase.from("schools")
        .select("*, users(username, role), classes(id, name)")
        .eq("community_id", communityId)
        .order("name", { ascending: true }),
      supabase.from("communities")
        .select("name")
        .eq("id", communityId)
        .single()
    ]);
    
    schools = scData ?? [];
    if (commData?.name) {
      communityName = commData.name;
    }
  } catch (err) {
    console.error("Unexpected error loading schools for community:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Data Sekolah Binaan</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Sekolah</span>
          </div>
        </div>
      </div>

      <SchoolsManagerKomunitas 
        initialSchools={schools} 
        communityId={communityId} 
        communityName={communityName} 
      />
    </div>
  );
}
