import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import AksesUjianKomunitasClient from "./AksesUjianKomunitasClient";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Akses Ujian — Distribusi ke Sekolah",
  description: "Manajemen penugasan kategori ujian ke sekolah binaan",
};

export default async function KomunitasAksesUjianPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  if (!communityId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>
        Akses ditolak: Anda tidak tergabung dalam komunitas manapun.
      </div>
    );
  }

  // ── Fetch akses ujian yang diterima dari Super Admin (target komunitas ini) ──
  // Sertakan 'id' agar bisa dipakai sebagai parentAccessId di distributeAccessToSchools
  const { data: communityAccessRaw } = await supabase
    .from("assessment_access")
    .select(`
      id,
      category_id,
      phase,
      valid_from,
      valid_until,
      question_categories(id, name, subject_area)
    `)
    .eq('target_type', 'community')
    .eq('target_id', communityId)
    .order('created_at', { ascending: false });

  // Map ke format AccessEntry yang dipakai Client (dengan field datar untuk kemudahan)
  const communityAccesses = (communityAccessRaw ?? []).map((a: any) => ({
    id:           a.id,
    category_id:  a.category_id,
    name:         a.question_categories?.name ?? 'Tanpa Nama',
    subject_area: a.question_categories?.subject_area ?? '',
    phase:        a.phase ?? 'Tahap 1',
    valid_from:   a.valid_from,
    valid_until:  a.valid_until,
  }));

  // Untuk backward compat dengan AssignPackageModal, buat juga list packages unik
  const packagesMap = new Map<string, any>();
  const now = new Date();
  for (const acc of communityAccesses) {
    const expired = (() => {
      const d = new Date(acc.valid_until);
      d.setHours(23, 59, 59, 999);
      return d < now;
    })();
    if (!expired && !packagesMap.has(acc.category_id)) {
      packagesMap.set(acc.category_id, {
        id: acc.category_id,
        name: acc.name,
        subject_area: acc.subject_area,
        phase: acc.phase,
        valid_from: acc.valid_from,
        valid_until: acc.valid_until,
      });
    }
  }
  const packages = Array.from(packagesMap.values());

  // ── Fetch sekolah aktif dalam komunitas ini ──────────────────────────────
  const { data: schoolsData } = await supabase
    .from("schools")
    .select("id, name, npsn")
    .eq("community_id", communityId)
    .eq("is_active", true)
    .order("name");

  // ── Fetch riwayat distribusi ke sekolah ──────────────────────────────────
  const schoolIds = schoolsData?.map((s) => s.id) ?? [];

  const { data: rawAccessLogs } = schoolIds.length > 0
    ? await supabase
        .from("assessment_access")
        .select(`*, question_categories(name, subject_area)`)
        .eq('target_type', 'school')
        .in('target_id', schoolIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const accessLogs = (rawAccessLogs ?? []).map((log: any) => {
    const s = schoolsData?.find((s) => s.id === log.target_id);
    return { ...log, target_name: s?.name ?? 'Unknown' };
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
        packages={packages}
        communityAccesses={communityAccesses}
        targets={(schoolsData ?? []).map((s) => ({ ...s, npsn: s.npsn ?? undefined }))}
        accessLogs={accessLogs}
        communityId={communityId}
      />
    </div>
  );
}
