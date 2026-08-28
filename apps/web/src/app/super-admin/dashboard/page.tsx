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
  let isSystemHealthy = true;

  try {
    const [
      { data: cData },
      { data: scData },
      { data: tData },
      { data: stData },
      { data: sessData }
    ] = await Promise.all([
      supabase.from("communities").select("id, name, code, is_active, created_at, is_sandbox").order("name", { ascending: true }).limit(10000),
      supabase.from("schools").select("id, name, community_id, province").limit(20000),
      supabase.from("users").select("id, school_id, community_id").eq("role", "teacher").limit(10000),
      supabase.from("students").select("id, school_id, gender, birth_date, ses_class, province").limit(50000),
      supabase.from("v_assessment_report").select(`
        session_id, completed_at, school_id, community_id, province, 
        gender, birth_date, ses_class, subject_area
      `).not("session_id", "is", null)
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
    
    // Map v_assessment_report flat data to the nested shape expected by IntegratedDashboardManager
    sessions = (sessData || []).map((s: any) => ({
      created_at: s.completed_at || new Date().toISOString(), // Fallback for charts
      school_id: s.school_id,
      school: { 
        province: s.province, 
        community_id: s.community_id 
      },
      student: { 
        ses_class: s.ses_class, 
        gender: s.gender 
      },
      package: { 
        subject_area: s.subject_area 
      }
    })).filter((s: any) => s.school_id && validSchoolIds.has(s.school_id));

  } catch (err) {
    console.error("Failed to fetch superadmin dashboard data:", err);
    isSystemHealthy = false;
  }
  // Get today's start and end date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  let todayErrorCount = 0;
  let dauCommunity = 0;
  let dauSchool = 0;
  let dauTeacher = 0;
  let dauStudent = 0;
  let dauSuperAdmin = 0;

  if (isSystemHealthy) {
    try {
      const { count, error: logErr } = await supabase
        .from("system_logs")
        .select("*", { count: "exact", head: true })
        .in("level", ["error", "critical"])
        .gte("created_at", todayIso);

      if (!logErr && count !== null) {
        todayErrorCount = count;
      }

      // Fetch DAU Students
      // Pastikan ada error handling bila kolom last_login_at belum ada di tabel students.
      const { count: cStudent, error: errStudent } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .gte('last_login_at', todayIso);
      
      if (!errStudent && cStudent !== null) {
        dauStudent = cStudent;
      }

      // Fetch DAU Users (Community, School, Teacher, Super Admin)
      const { data: dauUsers, error: errUsers } = await supabase
        .from('users')
        .select('role')
        .gte('last_login_at', todayIso);
        
      if (!errUsers && dauUsers) {
        dauTeacher = dauUsers.filter((u: any) => u.role === 'teacher').length;
        dauSchool = dauUsers.filter((u: any) => u.role === 'school').length;
        dauCommunity = dauUsers.filter((u: any) => u.role === 'community').length;
        dauSuperAdmin = dauUsers.filter((u: any) => u.role === 'super_admin').length;
      }

    } catch (e) {
      console.error("Failed to fetch system logs or DAU:", e);
    }
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
        todayErrorCount={todayErrorCount}
        isSystemHealthy={isSystemHealthy}
        dauCommunity={dauCommunity}
        dauSchool={dauSchool}
        dauTeacher={dauTeacher}
        dauStudent={dauStudent}
        dauSuperAdmin={dauSuperAdmin}
      />
    </div>
  );
}
