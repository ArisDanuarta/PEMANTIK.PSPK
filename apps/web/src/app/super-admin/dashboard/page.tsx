import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";

export const metadata: Metadata = {
  title: "Dashboard Super Admin",
  description: "Kontrol penuh sistem Pemantik — dashboard agregat semua entitas",
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
      supabase.from("communities").select("id, name, code, is_active, created_at").order("name", { ascending: true }),
      supabase.from("schools").select("id, name, community_id"),
      supabase.from("users").select("id, school_id").eq("role", "teacher"),
      supabase.from("students").select("id, school_id, gender, birth_date, ses_class"),
      supabase.from("assessment_sessions").select(`
        id,
        status,
        score,
        completed_at,
        created_at,
        school:schools(province, city, name),
        student:students(gender, birth_date, ses_class, ses_score, full_name, village, district, city, province, father_education_id, mother_education_id, father_occupation_id, mother_occupation_id),
        package:question_categories(name, subject_area)
      `).order("created_at", { ascending: false })
    ]);

    communities = cData || [];
    schools = scData || [];
    teachers = tData || [];
    students = stData || [];
    sessions = sessData || [];

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
