import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import AksesUjianKomunitasClient from "./AksesUjianKomunitasClient";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Akses Ujian (Distribusi ke Sekolah)",
  description: "Manajemen penugasan kategori ujian ke sekolah",
};

export default async function KomunitasAksesUjianPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  if (!communityId) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>Akses ditolak: Anda tidak tergabung dalam komunitas manapun.</div>;
  }

  // Fetch kategori ujian yang sudah di-assign ke komunitas ini
  const { data: communityAccess } = await supabase
    .from("assessment_access")
    .select(`
      category_id,
      phase,
      valid_from,
      valid_until,
      question_categories(id, name, subject_area)
    `)
    .eq('target_type', 'community')
    .eq('target_id', communityId);

  // Ambil daftar kategori unik yang belum expired
  const packagesMap = new Map();
  const now = new Date();
  
  if (communityAccess) {
    communityAccess.forEach((access: any) => {
      const pkg = access.question_categories;
      let isExpired = false;
      
      if (access.valid_until) {
        const validUntilDate = new Date(access.valid_until);
        // Valid sampai detik terakhir pada tanggal tersebut
        validUntilDate.setHours(23, 59, 59, 999);
        isExpired = validUntilDate < now;
      }

      if (pkg && !isExpired) {
        packagesMap.set(pkg.id, {
          ...pkg,
          phase: access.phase,
          valid_from: access.valid_from,
          valid_until: access.valid_until
        });
      }
    });
  }
  const allowedCategories = Array.from(packagesMap.values());

  // Fetch sekolah di bawah komunitas ini
  const { data: schoolsData } = await supabase
    .from("schools")
    .select("id, name, npsn, communities(name)")
    .eq("community_id", communityId);

  // Fetch logs akses yang pernah diberikan komunitas ke sekolah
  // Catatan: Supabase RLS secara otomatis akan memfilter sekolah yang dimiliki komunitas,
  // tapi kita juga bisa fetch berdasarkan target_id IN (schools)
  const schoolIds = schoolsData?.map((s) => s.id) || [];
  
  const { data: rawAccessLogs } = await supabase
    .from("assessment_access")
    .select(`
      *,
      question_categories(name, subject_area)
    `)
    .eq('target_type', 'school')
    .in('target_id', schoolIds)
    .order('created_at', { ascending: false });

  const accessLogs = (rawAccessLogs || []).map((log: any) => {
    const s = schoolsData?.find(s => s.id === log.target_id);
    return { ...log, target_name: s ? s.name : "Unknown" };
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Akses Ujian</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Distribusi Kategori ke Sekolah</span>
          </div>
        </div>
      </div>

      <AksesUjianKomunitasClient 
        packages={allowedCategories} 
        targets={schoolsData || []} 
        accessLogs={accessLogs || []} 
        communityId={communityId}
      />
    </div>
  );
}
