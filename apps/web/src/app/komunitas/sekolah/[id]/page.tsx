import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import SchoolDetailKomunitas from "./SchoolDetailKomunitas";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getStagesForSchool, type SchoolAssessmentStageRow } from "@/app/actions/stages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detail Sekolah Binaan | Pemantik",
  description: "Informasi lengkap dan pemantauan sekolah binaan",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SchoolDetailPage({ params }: PageProps) {
  const { id: schoolId } = await params;
  const supabase = createServerClient();
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  if (!communityId) {
    redirect("/login");
  }

  // 1. Fetch school detail and verify it belongs to this community
  const { data: school, error: schoolErr } = await supabase
    .from("schools")
    .select("*, users(id, username, full_name, role), classes(*)")
    .eq("id", schoolId)
    .eq("community_id", communityId)
    .maybeSingle();

  if (schoolErr || !school) {
    notFound();
  }

  // 2. Fetch teachers specifically for this school
  const { data: teachers = [] } = await supabase
    .from("users")
    .select("id, username, full_name, role, gender, is_active, created_at, classes!class_teachers(id, name)")
    .eq("school_id", schoolId)
    .eq("role", "teacher")
    .order("full_name", { ascending: true });

  // 3. Fetch students for this school
  const { data: students = [] } = await supabase
    .from("students")
    .select("*, classes(name)")
    .eq("school_id", schoolId)
    .order("full_name", { ascending: true });

  // 4. Fetch stages & sessions for timeline and progress
  const stagesRes = await getStagesForSchool(schoolId);
  const stages: SchoolAssessmentStageRow[] = stagesRes.success ? (stagesRes.data || []) : [];

  // 5. Fetch SES variables
  const { data: sesData } = await supabase
    .from("ses_variables")
    .select("*")
    .order("score", { ascending: true });
  const sesVariables = sesData || [];

  const { data: sessions = [] } = await supabase
    .from("assessment_sessions")
    .select(`
      id, status, phase, score, started_at, completed_at,
      students(full_name, nisn),
      question_categories(name, subject_area)
    `)
    .eq("school_id", schoolId)
    .eq("status", "completed")
    .eq("is_void", false)
    .order("completed_at", { ascending: false });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{school.name}</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Sekolah Binaan</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>{school.name}</span>
          </div>
        </div>
      </div>

      <SchoolDetailKomunitas
        school={school}
        teachers={(teachers as any) || []}
        students={students || []}
        classes={school.classes || []}
        stages={stages}
        sessions={sessions || []}
        sesVariables={sesVariables}
      />
    </div>
  );
}
