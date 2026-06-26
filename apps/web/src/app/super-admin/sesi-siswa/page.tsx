import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import { redirect } from "next/navigation";
import StudentSessionsTable from "@/components/shared/StudentSessionsTable";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Manajemen Sesi Ujian Siswa",
  description: "Pantau dan reset sesi ujian siswa jika terjadi kendala teknis",
};

export default async function SuperAdminSesiSiswaPage() {
  const supabase = createServerClient();

  // Middleware handles authentication, so we can just proceed

  // Fetch all sessions for super admin
  // Limiting to last 100 for now to prevent massive load, or we could add pagination
  const { data: sessions, error } = await supabase
    .from("assessment_sessions")
    .select(`
      id,
      status,
      phase,
      attempt_number,
      is_void,
      score,
      started_at,
      completed_at,
      students (
        full_name,
        nisn
      ),
      question_categories (
        name,
        subject_area
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching sessions:", error);
  }

  // Supabase returns related items as array or object depending on relation type.
  // Foreign keys point to a single item usually, so it returns an object or array of one.
  // We need to cast it to match our component props.
  const formattedSessions = (sessions || []).map(session => ({
    ...session,
    students: Array.isArray(session.students) ? session.students[0] : session.students,
    question_categories: Array.isArray(session.question_categories) ? session.question_categories[0] : session.question_categories
  }));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Sesi Ujian Siswa</h1>
          <p className="page-description" style={{ color: "#6b7280", marginTop: "0.5rem" }}>
            Pantau sesi ujian yang sedang berjalan, selesai, atau reset sesi jika siswa mengalami kendala teknis (terputus, keluar tiba-tiba, dll).
          </p>
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <StudentSessionsTable sessions={formattedSessions as any} showResetButton={true} />
      </div>
    </div>
  );
}
