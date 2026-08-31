import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import SchoolsManager from "./SchoolsManager";

export const metadata: Metadata = {
  title: "Kelola Sekolah",
  description: "Manajemen data sekolah lintas komunitas",
};

export default async function SekolahPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = createServerClient();

  // 1. Parse URL Params
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const limit = 20; // 20 per page as per current setting in SchoolsManager
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const searchQuery = typeof searchParams.search === 'string' ? searchParams.search.toLowerCase() : "";
  const showSandbox = searchParams.sandbox === "true";

  let schools: any[] = [];
  let count = 0;
  let communities: any[] = [];
  
  try {
    // 2. Build Query
    let query = supabase
      .from("schools")
      .select("*, communities!left(id, name, is_sandbox), users(username, role, plain_password), classes(id, name)", { count: 'exact' });

    const { data: sandboxComms } = await supabase.from('communities').select('id').eq('is_sandbox', true);
    const sandboxCommIds = sandboxComms?.map(c => c.id) || [];

    if (showSandbox) {
      const cIds = sandboxCommIds.length > 0 ? sandboxCommIds.join(',') : '00000000-0000-0000-0000-000000000000';
      query = query.in("community_id", cIds.split(','));
    } else {
      if (sandboxCommIds.length > 0) query = query.not("community_id", "in", `(${sandboxCommIds.join(',')})`);
    }
    
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,npsn.ilike.%${searchQuery}%`);
      // Note: searching across referenced table 'communities.name' requires a view or complex rpc,
      // so we limit the server-side search to name and npsn for simplicity.
    }

    const [
      { data: scData, count: scCount },
      { data: commData }
    ] = await Promise.all([
      query.order("name", { ascending: true }).range(start, end),
      supabase.from("communities").select("id, name").eq("is_active", true).neq("name", "SEKOLAH INDEPENDEN").order("name", { ascending: true }).limit(5000)
    ]);
    
    schools = scData ?? [];
    count = scCount ?? 0;
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

      <SchoolsManager 
        initialSchools={schools} 
        communities={communities} 
        totalCount={count}
        currentPage={page}
        pageSize={limit}
        currentSearch={searchQuery}
        currentSandbox={showSandbox}
      />
    </div>
  );
}
