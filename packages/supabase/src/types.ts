// ══════════════════════════════════════════════════════════════════════════════
// PEMANTIK — Supabase Database Types (auto-generated from schema v1.0)
// ══════════════════════════════════════════════════════════════════════════════

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole =
  | "super_admin"
  | "question_admin"
  | "community"
  | "school"
  | "teacher";

export type QuestionType =
  | "multiple_choice"
  | "drag_drop"
  | "image_choice"
  | "audio_question"
  | "video_question"
  | "voice_recording";

export type DifficultyLevel = "mudah" | "sedang" | "sulit";

export type SubjectArea = "literasi" | "numerasi";

export type Gender = "L" | "P";

export type SesClass = "atas" | "menengah_atas" | "menengah_bawah" | "bawah";

export type SessionStatus = "pending" | "active" | "completed" | "expired";

export type AnswerStatus = "answered" | "skipped" | "flagged";

export type SyncStatus = "synced" | "pending" | "failed";

// ─── Database Schema ───────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      question_categories: {
        Row: {
          id: string;
          name: string;
          subject_area: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject_area: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subject_area?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      question_levels: {
        Row: {
          id: string;
          category_id: string;
          level_number: number;
          time_limit_sec: number;
          passing_threshold: number;
          access_code: string | null;
          learning_objective: string | null;
          success_message: string | null;
          failure_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          level_number: number;
          time_limit_sec?: number;
          passing_threshold?: number;
          access_code?: string | null;
          learning_objective?: string | null;
          success_message?: string | null;
          failure_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          level_number?: number;
          time_limit_sec?: number;
          passing_threshold?: number;
          access_code?: string | null;
          learning_objective?: string | null;
          success_message?: string | null;
          failure_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_levels_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "question_categories";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── communities ─────────────────────────────────────────────────────────
      communities: {
        Row: {
          id: string;
          name: string;
          code: string;
          address: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          address?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          address?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── schools ──────────────────────────────────────────────────────────────
      schools: {
        Row: {
          id: string;
          community_id: string;
          name: string;
          npsn: string | null;
          address: string | null;
          province: string | null;
          city: string | null;
          district: string | null;
          village: string | null;
          principal_name: string | null;
          contact_phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          name: string;
          npsn?: string | null;
          address?: string | null;
          province?: string | null;
          city?: string | null;
          district?: string | null;
          village?: string | null;
          principal_name?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          name?: string;
          npsn?: string | null;
          address?: string | null;
          province?: string | null;
          city?: string | null;
          district?: string | null;
          village?: string | null;
          principal_name?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schools_community_id_fkey";
            columns: ["community_id"];
            referencedRelation: "communities";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── users ────────────────────────────────────────────────────────────────
      users: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          role: UserRole;
          community_id: string | null;
          school_id: string | null;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name: string;
          role: UserRole;
          community_id?: string | null;
          school_id?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          full_name?: string;
          role?: UserRole;
          community_id?: string | null;
          school_id?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_community_id_fkey";
            columns: ["community_id"];
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_school_id_fkey";
            columns: ["school_id"];
            referencedRelation: "schools";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── classes ──────────────────────────────────────────────────────────────
      classes: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string | null;
          name: string;
          grade: number;
          academic_year: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          teacher_id?: string | null;
          name: string;
          grade: number;
          academic_year: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          school_id?: string;
          teacher_id?: string | null;
          name?: string;
          grade?: number;
          academic_year?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey";
            columns: ["school_id"];
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_teacher_id_fkey";
            columns: ["teacher_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── students ─────────────────────────────────────────────────────────────
      students: {
        Row: {
          id: string;
          school_id: string;
          class_id: string | null;
          nis: string | null;
          full_name: string;
          gender: "L" | "P";
          birth_date: string | null;
          ses_class: SesClass | null;
          pin_hash: string;
          username: string;
          is_active: boolean;
          father_education_id: string | null;
          mother_education_id: string | null;
          father_occupation_id: string | null;
          mother_occupation_id: string | null;
          province: string | null;
          city: string | null;
          district: string | null;
          village: string | null;
          ses_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          class_id?: string | null;
          nis?: string | null;
          full_name: string;
          gender: Gender;
          birth_date?: string | null;
          ses_class?: SesClass | null;
          pin_hash: string;
          username: string;
          is_active?: boolean;
          father_education_id?: string | null;
          mother_education_id?: string | null;
          father_occupation_id?: string | null;
          mother_occupation_id?: string | null;
          province?: string | null;
          city?: string | null;
          district?: string | null;
          village?: string | null;
          ses_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          school_id?: string;
          class_id?: string | null;
          nis?: string | null;
          full_name?: string;
          gender?: Gender;
          birth_date?: string | null;
          ses_class?: SesClass | null;
          pin_hash?: string;
          username?: string;
          is_active?: boolean;
          father_education_id?: string | null;
          mother_education_id?: string | null;
          father_occupation_id?: string | null;
          mother_occupation_id?: string | null;
          province?: string | null;
          city?: string | null;
          district?: string | null;
          village?: string | null;
          ses_score?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey";
            columns: ["school_id"];
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_class_id_fkey";
            columns: ["class_id"];
            referencedRelation: "classes";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── questions ────────────────────────────────────────────────────────────
      questions: {
        Row: {
          id: string;
          created_by: string | null;
          question_code: string | null;
          subject_area: SubjectArea;
          question_type: QuestionType;
          difficulty: DifficultyLevel;
          grade_target: number | null;
          question_text: string | null;
          question_audio_url: string | null;
          question_video_url: string | null;
          question_image_url: string | null;
          options: Json | null;
          correct_answer: Json;
          explanation: string | null;
          time_limit_sec: number | null;
          tags: string[] | null;
          is_published: boolean;
          version: number;
          level_id: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          question_code?: string | null;
          subject_area: SubjectArea;
          question_type: QuestionType;
          difficulty: DifficultyLevel;
          grade_target?: number | null;
          question_text?: string | null;
          question_audio_url?: string | null;
          question_video_url?: string | null;
          question_image_url?: string | null;
          options?: Json | null;
          correct_answer: Json;
          explanation?: string | null;
          time_limit_sec?: number | null;
          tags?: string[] | null;
          is_published?: boolean;
          version?: number;
          level_id?: string;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subject_area?: SubjectArea;
          question_type?: QuestionType;
          question_code?: string | null;
          difficulty?: DifficultyLevel;
          grade_target?: number | null;
          question_text?: string | null;
          question_audio_url?: string | null;
          question_video_url?: string | null;
          question_image_url?: string | null;
          options?: Json | null;
          correct_answer?: Json;
          explanation?: string | null;
          time_limit_sec?: number | null;
          tags?: string[] | null;
          is_published?: boolean;
          version?: number;
          level_id?: string;
          order_index?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── assessment_packages ──────────────────────────────────────────────────
      assessment_packages: {
        Row: {
          id: string;
          created_by: string | null;
          name: string;
          description: string | null;
          subject_area: SubjectArea;
          grade_target: number | null;
          total_questions: number;
          time_limit_min: number;
          is_published: boolean;
          valid_from: string | null;
          valid_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          name: string;
          description?: string | null;
          subject_area: SubjectArea;
          grade_target?: number | null;
          total_questions?: number;
          time_limit_min?: number;
          is_published?: boolean;
          valid_from?: string | null;
          valid_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          subject_area?: SubjectArea;
          grade_target?: number | null;
          total_questions?: number;
          time_limit_min?: number;
          is_published?: boolean;
          valid_from?: string | null;
          valid_until?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_packages_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── assessment_package_questions ─────────────────────────────────────────
      assessment_package_questions: {
        Row: {
          id: string;
          category_id: string;
          question_id: string;
          order_index: number;
        };
        Insert: {
          id?: string;
          category_id: string;
          question_id: string;
          order_index: number;
        };
        Update: {
          order_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_package_questions_package_id_fkey";
            columns: ["category_id"];
            referencedRelation: "question_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_package_questions_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── assessment_access ────────────────────────────────────────────────────
      assessment_access: {
        Row: {
          id: string;
          category_id: string;
          target_type: string;
          target_id: string;
          granted_by: string | null;
          valid_from: string;
          valid_until: string;
          max_attempts: number;
          is_active: boolean;
          phase: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          target_type: string;
          target_id: string;
          granted_by?: string | null;
          valid_from: string;
          valid_until: string;
          max_attempts?: number;
          is_active?: boolean;
          phase?: string | null;
          created_at?: string;
        };
        Update: {
          target_type?: string;
          target_id?: string;
          valid_from?: string;
          valid_until?: string;
          max_attempts?: number;
          is_active?: boolean;
          phase?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_access_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "question_categories";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── assessment_sessions ──────────────────────────────────────────────────
      assessment_sessions: {
        Row: {
          id: string;
          student_id: string;
          category_id: string;
          school_id: string;
          status: SessionStatus;
          started_at: string | null;
          completed_at: string | null;
          score: number | null;
          time_spent_sec: number | null;
          device_info: Json | null;
          sync_status: SyncStatus;
          synced_at: string | null;
          phase: string | null;
          attempt_number: number;
          is_void: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          category_id: string;
          school_id: string;
          status?: SessionStatus;
          started_at?: string | null;
          completed_at?: string | null;
          score?: number | null;
          time_spent_sec?: number | null;
          device_info?: Json | null;
          sync_status?: SyncStatus;
          synced_at?: string | null;
          phase?: string | null;
          attempt_number?: number;
          is_void?: boolean;
          created_at?: string;
        };
        Update: {
          status?: SessionStatus;
          started_at?: string | null;
          completed_at?: string | null;
          score?: number | null;
          time_spent_sec?: number | null;
          device_info?: Json | null;
          sync_status?: SyncStatus;
          synced_at?: string | null;
          phase?: string | null;
          attempt_number?: number;
          is_void?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_sessions_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "question_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_sessions_school_id_fkey";
            columns: ["school_id"];
            referencedRelation: "schools";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── student_answers ──────────────────────────────────────────────────────
      student_answers: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          answer_data: Json;
          recording_url: string | null;
          is_correct: boolean | null;
          score: number | null;
          time_spent_sec: number | null;
          status: AnswerStatus;
          answered_at: string;
          sync_status: SyncStatus;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          answer_data: Json;
          recording_url?: string | null;
          is_correct?: boolean | null;
          score?: number | null;
          time_spent_sec?: number | null;
          status?: AnswerStatus;
          answered_at?: string;
          sync_status?: SyncStatus;
        };
        Update: {
          answer_data?: Json;
          recording_url?: string | null;
          is_correct?: boolean | null;
          score?: number | null;
          time_spent_sec?: number | null;
          status?: AnswerStatus;
          sync_status?: SyncStatus;
        };
        Relationships: [
          {
            foreignKeyName: "student_answers_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "assessment_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_answers_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          }
        ];
      };

      ses_variables: {
        Row: {
          id: string;
          type: "education" | "occupation";
          name: string;
          score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: "education" | "occupation";
          name: string;
          score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          type?: "education" | "occupation";
          name?: string;
          score?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      ses_thresholds: {
        Row: {
          id: string;
          name: string;
          min_score: number;
          max_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          min_score: number;
          max_score: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          min_score?: number;
          max_score?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      jwt_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      jwt_community_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      jwt_school_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };

    Enums: {
      user_role: UserRole;
      question_type: QuestionType;
      difficulty_level: DifficultyLevel;
      subject_area: SubjectArea;
      gender: Gender;
      ses_class: SesClass;
      session_status: SessionStatus;
      answer_status: AnswerStatus;
      sync_status: SyncStatus;
    };
  };
}

// ─── Convenience row types ────────────────────────────────────────────────────

export type Community = Database["public"]["Tables"]["communities"]["Row"];
export type School = Database["public"]["Tables"]["schools"]["Row"];
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Class = Database["public"]["Tables"]["classes"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type AssessmentPackage = Database["public"]["Tables"]["assessment_packages"]["Row"];
export type AssessmentPackageQuestion = Database["public"]["Tables"]["assessment_package_questions"]["Row"];
export type AssessmentAccess = Database["public"]["Tables"]["assessment_access"]["Row"];
export type AssessmentSession = Database["public"]["Tables"]["assessment_sessions"]["Row"];
export type StudentAnswer = Database["public"]["Tables"]["student_answers"]["Row"];

// ─── Insert types ─────────────────────────────────────────────────────────────

export type CommunityInsert = Database["public"]["Tables"]["communities"]["Insert"];
export type SchoolInsert = Database["public"]["Tables"]["schools"]["Insert"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type ClassInsert = Database["public"]["Tables"]["classes"]["Insert"];
export type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
export type QuestionInsert = Database["public"]["Tables"]["questions"]["Insert"];
export type QuestionCategoryInsert = Database["public"]["Tables"]["assessment_packages"]["Insert"];
export type AssessmentSessionInsert = Database["public"]["Tables"]["assessment_sessions"]["Insert"];
export type StudentAnswerInsert = Database["public"]["Tables"]["student_answers"]["Insert"];

// ─── JWT Claims (custom claims di-set saat login) ─────────────────────────────

export interface PemantikJwtClaims {
  user_role: UserRole;
  community_id?: string;
  school_id?: string;
}
