import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import PenelitiSoalClient from "./PenelitiSoalClient";

export const metadata: Metadata = {
  title: "Analisis Soal & Level",
  description: "Item analysis soal dan capaian level secara nasional",
};

export const dynamic = "force-dynamic";

export default async function PenelitiSoalPage() {
  const supabase = createServerClient();
  let questionsData: any[] = [];
  
  try {
    // 1. Fetch Item Analysis Data
    // We do a raw query here. We can't do complex GROUP BY in standard supabase-js, 
    // so we'll fetch answered questions data or rely on an RPC. 
    // Since we don't have a global RPC, we'll fetch aggregated questions data via a simpler method,
    // or just fetch all answers if it's not too large.
    // For scalability, in production this should be a view or RPC.
    
    // We will simulate it by fetching questions and doing a light aggregation.
    // In a real scenario we should create an RPC.
    const { data, error } = await (supabase as any)
      .rpc('get_community_item_analysis', { p_community_id: null, p_phase: null });
      
    // If RPC fails (because it requires non-null), we fetch raw (limit 50000)
    if (error || !data) {
      const { data: rawAnswers } = await (supabase as any)
        .from('student_answers')
        .select(`
          is_correct,
          time_spent_sec,
          questions (
            id,
            question_code,
            subject_area,
            question_type
          )
        `)
        .limit(20000); // Sample limit for now
        
      if (rawAnswers) {
        const map = new Map();
        rawAnswers.forEach((a: any) => {
          if (!a.questions) return;
          const qId = a.questions.id;
          if (!map.has(qId)) {
            map.set(qId, {
              id: qId,
              question_code: a.questions.question_code || 'Q-Unknown',
              subject_area: a.questions.subject_area,
              question_type: a.questions.question_type,
              total_answers: 0,
              correct_answers: 0,
              total_time: 0
            });
          }
          const item = map.get(qId);
          item.total_answers += 1;
          if (a.is_correct) item.correct_answers += 1;
          item.total_time += (a.time_spent_sec || 0);
        });
        
        questionsData = Array.from(map.values()).map((q: any) => ({
          ...q,
          success_rate: q.total_answers > 0 ? (q.correct_answers / q.total_answers) * 100 : 0,
          avg_time: q.total_answers > 0 ? (q.total_time / q.total_answers) : 0
        })).sort((a,b) => b.success_rate - a.success_rate);
      }
    } else {
      questionsData = data;
    }

  } catch (err) {
    console.error("Failed to load question data", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Analisis Soal & Level</h1>
          <div className="page-breadcrumb">
            <span>Peneliti</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Analisis Asesmen</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Soal & Level</span>
          </div>
        </div>
      </div>

      <PenelitiSoalClient initialData={questionsData} />
    </div>
  );
}
