import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import { redirect } from "next/navigation";
import StudentSessionsTable from "@/components/shared/StudentSessionsTable";

import RetakeRequestsTable from "./RetakeRequestsClient";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Manajemen Sesi Ujian Anak",
  description: "Pantau dan reset sesi ujian anak jika terjadi kendala teknis",
};

export default async function SuperAdminSesiSiswaPage() {
  const supabase = createServerClient();

  // Fetch pending retake requests
  let pendingRequests: any[] = [];
  try {
    const { data: requests, error: reqErr } = await (supabase as any)
      .from("assessment_retake_requests")
      .select(`
        id, session_id, reason, status, created_at,
        students ( full_name, nisn ),
        schools ( name )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
      
    if (!reqErr && requests) {
      pendingRequests = requests.map((r: any) => ({
        ...r,
        students: Array.isArray(r.students) ? r.students[0] : r.students,
        schools: Array.isArray(r.schools) ? r.schools[0] : r.schools
      }));
    }
  } catch (e) {
    console.error("Retake requests table might not exist yet:", e);
  }

  // Fetch all sessions for super admin
  // Fetch all sessions for super admin
  const { data: sessions, error } = await supabase
    .from("assessment_sessions")
    .select(`
      id, status, phase, attempt_number, is_void, score, started_at, completed_at, current_level_id, level_id,
      students ( full_name, nisn ),
      schools ( name, communities ( name ) ),
      question_categories ( name, subject_area ),
      assessment_retake_requests ( reason, status )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching sessions:", error);
  }

  const formattedSessions = (sessions || []).map(session => {
    const school = Array.isArray(session.schools) ? session.schools[0] : session.schools;
    const comm = school?.communities;
    const community = Array.isArray(comm) ? comm[0] : comm;
    
    return {
      ...session,
      students: Array.isArray(session.students) ? session.students[0] : session.students,
      question_categories: Array.isArray(session.question_categories) ? session.question_categories[0] : session.question_categories,
      schools: {
        name: school?.name || "-",
        community_name: community?.name || "-"
      },
      assessment_retake_requests: Array.isArray(session.assessment_retake_requests) 
        ? session.assessment_retake_requests 
        : (session.assessment_retake_requests ? [session.assessment_retake_requests] : [])
    };
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Sesi Ujian Anak</h1>
          <p className="page-description" style={{ color: "#6b7280", marginTop: "0.5rem" }}>
            Pantau sesi ujian yang sedang berjalan, terima request ujian ulang dari sekolah, atau reset sesi.
          </p>
        </div>
      </div>

      <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Tabel Request Ujian Ulang */}
        <RetakeRequestsTable requests={pendingRequests} />

        {/* Tabel Seluruh Sesi */}
        <StudentSessionsTable sessions={formattedSessions as any} />
      </div>
    </div>
  );
}
