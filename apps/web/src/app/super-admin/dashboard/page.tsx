import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";

export const metadata: Metadata = {
  title: "Dashboard Super Admin",
  description: "Kontrol penuh sistem Pemantik - dashboard agregat semua entitas",
};

import IntegratedDashboardManager from "./IntegratedDashboardManager";

export default async function SuperAdminDashboard() {
  const supabase = createServerClient();

  let communities: any[] = [];
  let schools: any[] = [];
  let teachers: any[] = [];
  let students: any[] = [];
  let sessions: any[] = [];

  try {
    const [
      { data: cData },
      { data: scData },
      { data: tData },
      { data: stData },
      { data: sessData }
    ] = await Promise.all([
      supabase.from("communities").select("id, name, code, is_active, created_at, is_sandbox").order("name", { ascending: true }),
      supabase.from("schools").select("id, name, community_id"),
      supabase.from("users").select("id, school_id, community_id").eq("role", "teacher"),
      supabase.from("students").select("id, school_id, gender, birth_date, ses_class"),
      supabase.from("assessment_sessions").select(`
        id,
        status,
        score,
        completed_at,
        created_at,
        school_id,
        school:schools(province, city, name, community_id),
        student:students(gender, birth_date, ses_class, ses_score, full_name, village, district, city, province, father_education_id, mother_education_id, father_occupation_id, mother_occupation_id),
        package:question_categories(name, subject_area)
      `).order("created_at", { ascending: false })
    ]);

    const allCommunities = cData || [];
    const validCommunityIds = new Set(allCommunities.filter((c: any) => !c.is_sandbox).map((c: any) => c.id));

    communities = allCommunities.filter((c: any) => validCommunityIds.has(c.id));
    
    // School is valid if independent or belongs to valid community
    schools = (scData || []).filter((s: any) => !s.community_id || validCommunityIds.has(s.community_id));
    const validSchoolIds = new Set(schools.map((s: any) => s.id));
    
    // Teacher is valid if both community and school (if present) are valid
    teachers = (tData || []).filter((t: any) => {
      const isCommunityValid = !t.community_id || validCommunityIds.has(t.community_id);
      const isSchoolValid = !t.school_id || validSchoolIds.has(t.school_id);
      return isCommunityValid && isSchoolValid;
    });
    
    // Student is valid if school is valid
    students = (stData || []).filter((s: any) => !s.school_id || validSchoolIds.has(s.school_id));
    
    // Session is valid if school is valid
    sessions = (sessData || []).filter((s: any) => s.school_id && validSchoolIds.has(s.school_id));

  } catch (err) {
    console.error("Failed to fetch superadmin dashboard data:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Dashboard</span>
          </div>
        </div>
      </div>

      <IntegratedDashboardManager 
        communities={communities}
        schools={schools}
        teachers={teachers}
        students={students}
        sessions={sessions}
      />
    </div>
  );
}
