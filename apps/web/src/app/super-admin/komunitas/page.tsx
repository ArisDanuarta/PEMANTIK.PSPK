import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import CommunitiesManager from "./CommunitiesManager";

export const metadata: Metadata = {
  title: "Kelola Komunitas / Mitra",
  description: "Manajemen data mitra dan komunitas pengelola sekolah",
};

export default async function KomunitasPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = createServerClient();

  // 1. Parse URL Params
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const limit = 20; // 20 per page as per current setting in CommunitiesManager
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const searchQuery = typeof searchParams.search === 'string' ? searchParams.search.toLowerCase() : "";
  const showSandbox = searchParams.sandbox === "true";

  let communities: any[] = [];
  let count = 0;
  
  try {
    // 2. Build Query
    let query = supabase
      .from("communities")
      .select("*", { count: "exact" })
      .neq("name", "SEKOLAH INDEPENDEN");

    if (showSandbox) {
      query = query.eq("is_sandbox", true);
    } else {
      query = query.eq("is_sandbox", false);
    }
    
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%,contact_name.ilike.%${searchQuery}%`);
    }

    const { data: commData, count: commCount, error } = await query
      .order("name", { ascending: true })
      .range(start, end);
    
    if (error) {
      console.error("Failed to load communities:", error);
    } else {
      count = commCount ?? 0;
      
      // Fetch admin users only for the communities in this page
      const communityIds = (commData || []).map(c => c.id);
      
      let adminData: any[] = [];
      if (communityIds.length > 0) {
        const { data } = await supabase
          .from("users")
          .select("community_id, username")
          .eq("role", "community")
          .in("community_id", communityIds);
        adminData = data || [];
      }
        
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

      <CommunitiesManager 
        initialCommunities={communities} 
        totalCount={count}
        currentPage={page}
        pageSize={limit}
        currentSearch={searchQuery}
        currentSandbox={showSandbox}
      />
    </div>
  );
}
