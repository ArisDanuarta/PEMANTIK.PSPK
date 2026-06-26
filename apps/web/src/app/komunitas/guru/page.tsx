import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import TeachersManagerKomunitas from "./TeachersManagerKomunitas";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Kelola Guru Binaan | Pemantik",
  description: "Manajemen data guru untuk komunitas",
};

export const dynamic = 'force-dynamic';

export default async function GuruKomunitasPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  if (!communityId) {
    redirect("/login");
  }

  let teachers: any[] = [];
  let schools: any[] = [];
  let classes: any[] = [];
  
  try {
    // 1. Dapatkan daftar sekolah yang merupakan binaan komunitas ini
    const { data: scData } = await supabase
      .from("schools")
      .select("id, name")
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    schools = scData ?? [];
    const schoolIds = schools.map(s => s.id);

    // 2. Jika ada sekolah binaan, ambil guru dan kelas yang ada di dalam sekolah-sekolah tersebut
    if (schoolIds.length > 0) {
      const [
        { data: tData },
        { data: cData }
      ] = await Promise.all([
        supabase
          .from("users")
          .select("*, schools(name, communities(name)), classes(name)")
          .eq("role", "teacher")
          .in("school_id", schoolIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("classes")
          .select("id, name, school_id")
          .eq("is_active", true)
          .in("school_id", schoolIds)
          .order("name", { ascending: true })
      ]);
      
      teachers = tData ?? [];
      classes = cData ?? [];
    }
  } catch (err) {
    console.error("Unexpected error loading teachers for community:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Data Guru Binaan</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Guru</span>
          </div>
        </div>
      </div>

      <TeachersManagerKomunitas initialTeachers={teachers} schools={schools} classes={classes} />
    </div>
  );
}
