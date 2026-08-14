import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import TeachersManager from "./TeachersManager";

export const metadata: Metadata = {
  title: "Kelola Guru",
  description: "Manajemen data guru lintas sekolah",
};

export default async function GuruPage() {
  const supabase = createServerClient();

  let teachers: any[] = [];
  let schools: any[] = [];
  let classes: any[] = [];
  
  try {
    const [
      { data: tData },
      { data: scData },
      { data: cData }
    ] = await Promise.all([
      supabase.from("users").select("*, schools(name, communities(name, is_sandbox)), communities(name, is_sandbox), classes!class_teachers(name)").eq("role", "teacher").order("created_at", { ascending: false }),
      supabase.from("schools").select("id, name").eq("is_active", true).order("name", { ascending: true }),
      supabase.from("classes").select("id, name, school_id").eq("is_active", true).order("name", { ascending: true })
    ]);
    
    teachers = tData ?? [];
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

      <TeachersManager initialTeachers={teachers} schools={schools} classes={classes} />
    </div>
  );
}
