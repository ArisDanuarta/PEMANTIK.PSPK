// ─── User Types ───────────────────────────────────────────────────────────────

export type UserRole =
  | "super_admin"
  | "question_admin"
  | "community"
  | "school"
  | "teacher"
  | "student";

export interface User {
  id: string; // uuid
  email: string | null;
  username: string | null;
  role: UserRole;
  entity_id: string | null; // community_id | school_id | teacher_id | student_id
  created_at: string;
  updated_at: string;
}

export interface Community {
  id: string;
  name: string;
  assessment_access: AssessmentAccessConfig; // JSONB
  created_at: string;
}

export interface School {
  id: string;
  community_id: string;
  name: string;
  province: string | null;
  created_at: string;
}

export interface Teacher {
  id: string;
  school_id: string;
  name: string;
  email: string | null;
  created_at: string;
}

// ─── Assessment Access Config (JSONB) ─────────────────────────────────────────

export interface AssessmentAccessConfig {
  literacy?: {
    levels: number[]; // e.g. [1,2,3,4]
    enabled: boolean;
  };
  numeracy?: {
    levels: number[]; // e.g. [0,1,2,3]
    enabled: boolean;
  };
}
