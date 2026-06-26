// ─── Student Types ────────────────────────────────────────────────────────────

export type SESClass = "I" | "II" | "III" | "IV";
export type Gender = "male" | "female";

export interface Student {
  id: string;
  school_id: string;
  teacher_id: string | null;
  name: string;
  username: string; // for simple login (no email)
  pin: string; // hashed, for mobile login
  class_name: string; // e.g. "3A", "4B"
  grade: number; // school grade level
  ses_class: SESClass; // Socioeconomic status I–IV
  gender: Gender;
  created_at: string;
}
