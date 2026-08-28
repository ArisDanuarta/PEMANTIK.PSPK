import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import TeachersManager from "./TeachersManager";

export const metadata: Metadata = {
  title: "Kelola Guru",
  description: "Manajemen data guru lintas sekolah",
};

export default async function GuruPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = createServerClient();

  // 1. Parse URL Params
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const limit = 25;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const searchQuery = typeof searchParams.search === 'string' ? searchParams.search.toLowerCase() : "";
  const showSandbox = searchParams.sandbox === "true";

  let teachers: any[] = [];
  let count = 0;
  let schools: any[] = [];
  let classes: any[] = [];
  
  try {
    // 2. Build Query
    let query = supabase
      .from("users")
      .select("*, schools(name, communities(name, is_sandbox)), communities(name, is_sandbox), classes!class_teachers(name)", { count: 'exact' })
      .eq("role", "teacher");

    const { data: sandboxComms } = await supabase.from('communities').select('id').eq('is_sandbox', true);
    const sandboxCommIds = sandboxComms?.map(c => c.id) || [];
    let sandboxSchoolIds: string[] = [];
    if (sandboxCommIds.length > 0) {
      const { data: sandboxSchools } = await supabase.from('schools').select('id').in('community_id', sandboxCommIds);
      sandboxSchoolIds = sandboxSchools?.map(s => s.id) || [];
    }

    if (showSandbox) {
      const cIds = sandboxCommIds.length > 0 ? sandboxCommIds.join(',') : '00000000-0000-0000-0000-000000000000';
      const sIds = sandboxSchoolIds.length > 0 ? sandboxSchoolIds.join(',') : '00000000-0000-0000-0000-000000000000';
      query = query.or(`community_id.in.(${cIds}),school_id.in.(${sIds})`);
    } else {
      if (sandboxCommIds.length > 0) query = query.not("community_id", "in", `(${sandboxCommIds.join(',')})`);
      if (sandboxSchoolIds.length > 0) query = query.not("school_id", "in", `(${sandboxSchoolIds.join(',')})`);
    }
    
    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
    }

    const [
      { data: tData, count: tCount },
      { data: scData },
      { data: cData }
    ] = await Promise.all([
      query.order("created_at", { ascending: false }).range(start, end),
      supabase.from("schools").select("id, name").eq("is_active", true).order("name", { ascending: true }).limit(5000),
      supabase.from("classes").select("id, name, school_id").eq("is_active", true).order("name", { ascending: true }).limit(5000)
    ]);
    
    teachers = tData ?? [];
    count = tCount ?? 0;
    schools = scData ?? [];
    classes = cData ?? [];
  } catch (err) {
    console.error("Unexpected error loading teachers:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Data Guru</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Guru</span>
          </div>
        </div>
      </div>

      <TeachersManager 
        initialTeachers={teachers} 
        schools={schools} 
        classes={classes}
        totalCount={count}
        currentPage={page}
        pageSize={limit}
        currentSearch={searchQuery}
        currentSandbox={showSandbox}
      />
    </div>
  );
}
