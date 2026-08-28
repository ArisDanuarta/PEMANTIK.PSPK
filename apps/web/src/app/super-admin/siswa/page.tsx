import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import StudentsManager from "./StudentsManager";

export const metadata: Metadata = {
  title: "Kelola Anak",
  description: "Manajemen data anak lintas sekolah",
};

export default async function SiswaPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = createServerClient();

  // 1. Parse URL Params
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const limit = 25;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const searchQuery = typeof searchParams.search === 'string' ? searchParams.search.toLowerCase() : "";
  const showSandbox = searchParams.sandbox === "true";

  let students: any[] = [];
  let count = 0;
  let schools: any[] = [];
  let sesVariables: any[] = [];
  let classes: any[] = [];
  
  try {
    // 2. Build Query
    let query = supabase
      .from("students")
      .select("*, schools!inner(name, communities!inner(name, is_sandbox)), classes(name, users!class_teachers(full_name))", { count: 'exact' });

    const { data: sandboxComms } = await supabase.from('communities').select('id').eq('is_sandbox', true);
    const sandboxCommIds = sandboxComms?.map(c => c.id) || [];
    let sandboxSchoolIds: string[] = [];
    if (sandboxCommIds.length > 0) {
      const { data: sandboxSchools } = await supabase.from('schools').select('id').in('community_id', sandboxCommIds);
      sandboxSchoolIds = sandboxSchools?.map(s => s.id) || [];
    }

    if (showSandbox) {
      const sIds = sandboxSchoolIds.length > 0 ? sandboxSchoolIds.join(',') : '00000000-0000-0000-0000-000000000000';
      query = query.in("school_id", sIds.split(','));
    } else {
      if (sandboxSchoolIds.length > 0) query = query.not("school_id", "in", `(${sandboxSchoolIds.join(',')})`);
    }
    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,nisn.ilike.%${searchQuery}%`);
    }

    const [
      { data: stData, count: stCount },
      { data: scData },
      { data: sesData },
      { data: clData }
    ] = await Promise.all([
      query.order("created_at", { ascending: false }).range(start, end),
      supabase.from("schools").select("id, name").eq("is_active", true).order("name", { ascending: true }).limit(5000),
      (supabase as any).from("ses_variables").select("*").order("name", { ascending: true }),
      supabase.from("classes").select("id, name, school_id").order("name", { ascending: true }).limit(5000)
    ]);
    
    students = stData ?? [];
    count = stCount ?? 0;
    schools = scData ?? [];
    sesVariables = sesData ?? [];
    classes = clData ?? [];
  } catch (err) {
    console.error("Unexpected error loading students:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Data Anak</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Anak</span>
          </div>
        </div>
      </div>

      <StudentsManager 
        initialStudents={students} 
        schools={schools} 
        sesVariables={sesVariables} 
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
