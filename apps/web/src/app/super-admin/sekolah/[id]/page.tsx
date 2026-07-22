import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { notFound } from "next/navigation";
import React from "react";
import SchoolDetailClient from "./SchoolDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return {
    title: "Detail Sekolah",
    description: "Manajemen detail sekolah, guru, siswa, dan kelas",
  };
}

export default async function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();

  // Fetch data sekolah beserta relasi
  const [
    { data: school },
    { data: teachers },
    { data: students },
    { data: classes },
    { data: importBatches },
    { data: communities },
    { data: schoolAdmin },
    { data: studentUsers },
    { data: sesVariables },
  ] = await Promise.all([
    supabase
      .from("schools")
      .select("*, communities(id, name, code)")
      .eq("id", id)
      .single(),
    (supabase as any)
      .from("users")
      .select("id, full_name, username, gender, is_active, created_at, classes(id, name)")
      .eq("school_id", id)
      .eq("role", "teacher")
      .order("full_name", { ascending: true }),
    (supabase as any)
      .from("students")
      .select("id, full_name, username, pin_hash, nisn, gender, birth_date, ses_class, ses_score, class_id, import_source, birth_date_parse_error, is_active, created_at, classes(id, name)")
      .eq("school_id", id)
      .order("full_name", { ascending: true }),
    supabase
      .from("classes")
      .select("id, name, grade, academic_year, teacher_id, is_active, users(id, full_name)")
      .eq("school_id", id)
      .order("grade", { ascending: true }),
    (supabase as any)
      .from("dapodik_import_batches")
      .select("*")
      .eq("school_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("communities")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    (supabase as any)
      .from("users")
      .select("id, full_name, username, role")
      .eq("school_id", id)
      .eq("role", "school")
      .limit(1)
      .maybeSingle(),
    (supabase as any)
      .from("users")
      .select("id, username")
      .eq("school_id", id)
      .eq("role", "student"),
    (supabase as any)
      .from("ses_variables")
      .select("*")
      .order("score", { ascending: true })
  ]);

  if (!school) return notFound();

  // Attach username to students
  const enrichedStudents = (students || []).map((student: any) => {
    const matchedUser = (studentUsers || []).find((u: any) => u.id === student.id);
    return {
      ...student,
      users: { username: matchedUser?.username || "" }
    };
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{school.name}</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <a href="/super-admin/sekolah" style={{ color: "#102e50", textDecoration: "none" }}>Sekolah</a>
            <span className="page-breadcrumb-sep">›</span>
            <span>{school.name}</span>
          </div>
        </div>
      </div>

      <SchoolDetailClient
        school={school as any}
        teachers={teachers as any ?? []}
        students={enrichedStudents as any}
        classes={classes || []}
        importBatches={importBatches || []}
        communities={communities || []}
        schoolAdmin={schoolAdmin}
        sesVariables={sesVariables || []}
      />
    </div>
  );
}
