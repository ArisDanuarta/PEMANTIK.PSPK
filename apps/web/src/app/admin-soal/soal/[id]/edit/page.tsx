import React from "react";
import { getQuestionById } from "@/app/actions/questions";
import QuestionFormClient from "../../new/QuestionFormClient";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getQuestionById(id);

  if (!res.success || !res.data) {
    return notFound();
  }

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "calc(100vh - 65px - 3rem)",
      overflow: "hidden" 
    }}>
      <div style={{ flexShrink: 0, marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <Link href="/admin-soal/soal" style={{ color: "var(--clr-biru)", textDecoration: "none", fontWeight: 600 }}>&larr; Kembali</Link>
        <span style={{ color: "black" }}>/</span>
        <h1 style={{ margin: 0, fontSize: "1.25rem", color: "#1a1a1a" }}>Edit Soal</h1>
      </div>

      <QuestionFormClient initialData={res.data} />
    </div>
  );
}
