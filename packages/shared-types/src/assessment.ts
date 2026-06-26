// ─── Assessment Types ─────────────────────────────────────────────────────────

export type AssessmentStatus =
  | "not_started"     // Belum Bisa Ujian
  | "ready"           // Siap Ujian
  | "in_progress"     // Sedang Mengerjakan
  | "completed";      // Sudah Selesai

export type SyncStatus =
  | "pending"         // Belum dikirim ke server
  | "syncing"         // Sedang dikirim
  | "synced"          // Berhasil tersimpan
  | "failed";         // Gagal sinkronisasi

export interface AssessmentSession {
  id: string;
  student_id: string;
  category_id: string;
  subject: "literacy" | "numeracy";
  level: number;
  status: AssessmentStatus;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  created_by: string; // teacher_id | school_id | community_id
  created_at: string;
}

export interface Answer {
  id: string;
  session_id: string;
  question_id: string;
  question_version: number; // stored for conflict resolution
  response: AnswerResponse; // JSONB
  score: number | null;
  is_auto_scored: boolean;
  voice_recording_url: string | null; // Supabase Storage URL
  sync_status: SyncStatus;
  answered_on_old_version: boolean;
  answered_at: string;
  synced_at: string | null;
}

export type AnswerResponse =
  | { type: "multiple_choice"; selected_ids: string[] }
  | { type: "drag_and_drop"; placements: Record<string, string> }
  | { type: "voice_recording"; recording_url: string; duration_seconds: number }
  | { type: "auto"; selected_id: string };

// ─── Assessment Access ─────────────────────────────────────────────────────────

export interface AssessmentAccess {
  id: string;
  target_type: "student" | "class" | "school";
  target_id: string;
  category_id: string;
  granted_by: string; // user_id
  granted_by_role: "super_admin" | "community" | "school" | "teacher";
  created_at: string;
}
