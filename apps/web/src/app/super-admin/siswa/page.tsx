import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import StudentsManager from "./StudentsManager";

export const metadata: Metadata = {
  title: "Kelola Anak",
  description: "Manajemen data anak lintas sekolah",
};

export default async function SiswaPage() {
  const supabase = createServerClient();

  let students: any[] = [];
  let schools: any[] = [];
  let sesVariables: any[] = [];
  let classes: any[] = [];
  
  try {
    const [
      { data: stData },
      { data: scData },
      { data: sesData },
      { data: clData }
    ] = await Promise.all([
      supabase.from("students").select("*, schools(name, communities(name)), classes(name, users(full_name))").order("created_at", { ascending: false }),
      supabase.from("schools").select("id, name").eq("is_active", true).order("name", { ascending: true }),
      (supabase as any).from("ses_variables").select("*").order("name", { ascending: true }),
      supabase.from("classes").select("id, name, school_id").order("name", { ascending: true })
    ]);
    
    students = stData ?? [];
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

      <StudentsManager initialStudents={students} schools={schools} sesVariables={sesVariables} classes={classes} />
    </div>
  );
}
