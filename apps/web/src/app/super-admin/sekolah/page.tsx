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
    const supabase = createServerClient();

    // Ambil ID komunitas sandbox untuk filtering
    const { data: sandboxComms } = await supabase.from('communities').select('id').eq('is_sandbox', true);
    const sandboxCommIds = sandboxComms?.map(c => c.id) || [];

    // Helper untuk apply filter sandbox & search ke query manapun
    const applyFilters = (q: any) => {
      if (showSandbox) {
        // Mode sandbox: tampilkan HANYA sekolah yang berada di komunitas sandbox
        const cIds = sandboxCommIds.length > 0 ? sandboxCommIds : ['00000000-0000-0000-0000-000000000000'];
        q = q.in("community_id", cIds);
      } else {
        // Mode normal: tampilkan semua sekolah KECUALI yang di komunitas sandbox.
        // PENTING: Gunakan .or() bukan .not("in") karena PostgreSQL/Supabase
        // mengecualikan baris dengan community_id = NULL saat memakai NOT IN,
        // sehingga sekolah independen (tanpa komunitas) tidak pernah muncul.
        if (sandboxCommIds.length > 0) {
          q = q.or(`community_id.not.in.(${sandboxCommIds.join(',')}),community_id.is.null`);
        }
        // Jika tidak ada sandbox, tidak perlu filter → semua sekolah tampil (termasuk independen)
      }
      if (searchQuery) {
        q = q.or(`name.ilike.%${searchQuery}%,npsn.ilike.%${searchQuery}%`);
      }
      return q;
    };

    // ─── 1. Query COUNT terpisah — tanpa join, murni hitung baris schools ───
    let countQuery = supabase.from("schools").select("id", { count: 'exact', head: true });
    countQuery = applyFilters(countQuery);
    const { count: scCount } = await countQuery;

    // ─── 2. Query DATA dengan join — hanya ambil halaman yang diminta ───
    let dataQuery = supabase
      .from("schools")
      .select("*, communities!left(id, name, is_sandbox), users(username, role, plain_password), classes(id, name)");
    dataQuery = applyFilters(dataQuery);
    const { data: scData } = await dataQuery
      .order("name", { ascending: true })
      .range(start, end);

    // ─── 3. Query daftar komunitas untuk dropdown form ───
    const { data: commData } = await supabase
      .from("communities")
      .select("id, name")
      .eq("is_active", true)
      .neq("name", "SEKOLAH INDEPENDEN")
      .order("name", { ascending: true })
      .limit(5000);

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
