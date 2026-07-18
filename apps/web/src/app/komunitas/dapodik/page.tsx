import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import DapodikKomunitasClient from "./DapodikKomunitasClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Upload Data Dapodik | Komunitas - Pemantik",
  description: "Impor dan pemutakhiran data Dapodik terpusat untuk Sekolah Binaan Komunitas",
};

export default async function KomunitasDapodikPage() {
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
      (supabase as any).from("schools")
        .select("id, name, npsn, province, city, district, village, dapodik_imported_at, import_source")
        .eq("community_id", communityId)
        .order("name", { ascending: true }),
      supabase.from("communities")
        .select("name")
        .eq("id", communityId)
        .single()
    ]);

    const rawSchools: any[] = scData ?? [];
    if (commData?.name) {
      communityName = commData.name;
    }

    if (rawSchools.length > 0) {
      const schoolIds = rawSchools.map(s => s.id);
      const [
        { data: stData },
        { data: tcData },
        { data: clData }
      ] = await Promise.all([
        supabase.from("students").select("id, school_id").in("school_id", schoolIds),
        supabase.from("users").select("id, school_id").eq("role", "teacher").in("school_id", schoolIds),
        supabase.from("classes").select("id, school_id").in("school_id", schoolIds)
      ]);

      schools = rawSchools.map(s => ({
        ...s,
        students_count: stData?.filter(st => st.school_id === s.id).length || 0,
        teachers_count: tcData?.filter(tc => tc.school_id === s.id).length || 0,
        classes_count: clData?.filter(cl => cl.school_id === s.id).length || 0
      }));
    }
  } catch (err) {
    console.error("Gagal memuat info sekolah untuk dapodik komunitas:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Upload Data Dapodik Terpusat</h1>
          <div className="page-breadcrumb">
            <span>{communityName}</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Manajemen</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Upload Dapodik</span>
          </div>
        </div>
      </div>

      <DapodikKomunitasClient schools={schools} communityId={communityId} communityName={communityName} />
    </div>
  );
}
