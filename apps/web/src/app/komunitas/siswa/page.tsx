import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import StudentsManagerKomunitas from "./StudentsManagerKomunitas";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Kelola Anak Binaan | Pemantik",
  description: "Manajemen data anak untuk komunitas",
};

export const dynamic = 'force-dynamic';

export default async function SiswaKomunitasPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  if (!communityId) {
    redirect("/login");
  }

  let students: any[] = [];
  let schools: any[] = [];
  let sesVariables: any[] = [];
  let classes: any[] = [];
  
  try {
    // 1. Dapatkan daftar sekolah binaan
    const { data: scData } = await supabase
      .from("schools")
      .select("id, name")
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    schools = scData ?? [];
    const schoolIds = schools.map(s => s.id);

    // 2. Dapatkan variabel SES
    const { data: sesData } = await (supabase as any)
      .from("ses_variables")
      .select("*")
      .order("name", { ascending: true });
    sesVariables = sesData ?? [];

    // 3. Jika ada sekolah binaan, ambil siswa dan kelas
    if (schoolIds.length > 0) {
      const [
        { data: stData },
        { data: clData }
      ] = await Promise.all([
        supabase
          .from("students")
          .select("*, schools(name, communities(name)), classes(name, users(full_name))")
          .in("school_id", schoolIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("classes")
          .select("id, name, school_id")
          .in("school_id", schoolIds)
          .order("name", { ascending: true })
      ]);
      
      students = stData ?? [];
      classes = clData ?? [];
    }
  } catch (err) {
    console.error("Unexpected error loading students for community:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Data Anak Binaan</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Anak</span>
          </div>
        </div>
      </div>

      <StudentsManagerKomunitas 
        initialStudents={students} 
        schools={schools} 
        sesVariables={sesVariables} 
        classes={classes} 
      />
    </div>
  );
}
