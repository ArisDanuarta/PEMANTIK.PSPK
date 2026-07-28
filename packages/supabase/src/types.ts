export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_analysis_jobs: {
        Row: {
          completed_at: string | null
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          id: string
          prompt_tokens: number | null
          requested_by: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          prompt_tokens?: number | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          prompt_tokens?: number | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      ai_knowledge_edges: {
        Row: {
          created_at: string
          id: string
          job_id: string
          label: string | null
          source_node_id: string
          target_node_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          label?: string | null
          source_node_id: string
          target_node_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          label?: string | null
          source_node_id?: string
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_edges_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_source_node"
            columns: ["source_node_id", "job_id"]
            isOneToOne: false
            referencedRelation: "ai_knowledge_nodes"
            referencedColumns: ["id", "job_id"]
          },
          {
            foreignKeyName: "fk_target_node"
            columns: ["target_node_id", "job_id"]
            isOneToOne: false
            referencedRelation: "ai_knowledge_nodes"
            referencedColumns: ["id", "job_id"]
          },
        ]
      }
      ai_knowledge_nodes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          job_id: string
          label: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          job_id: string
          label: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string
          label?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_nodes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_access: {
        Row: {
          category_id: string
          created_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          max_attempts: number
          phase: string | null
          target_id: string
          target_type: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          category_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          max_attempts?: number
          phase?: string | null
          target_id: string
          target_type: string
          valid_from: string
          valid_until: string
        }
        Update: {
          category_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          max_attempts?: number
          phase?: string | null
          target_id?: string
          target_type?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_access_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      assessment_phase_requests: {
        Row: {
          category_id: string
          community_id: string
          created_at: string
          id: string
          phase: string
          rejection_reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_school_ids: string[]
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          category_id: string
          community_id: string
          created_at?: string
          id?: string
          phase: string
          rejection_reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_school_ids: string[]
          updated_at?: string
          valid_from: string
          valid_until: string
        }
        Update: {
          category_id?: string
          community_id?: string
          created_at?: string
          id?: string
          phase?: string
          rejection_reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_school_ids?: string[]
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_phase_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_phase_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_phase_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["community_id"]
          },
          {
            foreignKeyName: "assessment_phase_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_phase_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "assessment_phase_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_phase_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          access_id: string | null
          attempt_number: number
          category_id: string
          completed_at: string | null
          created_at: string
          current_level_id: string | null
          device_info: Json | null
          id: string
          is_void: boolean
          level_id: string | null
          phase: string | null
          school_id: string
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          student_id: string
          sync_status: Database["public"]["Enums"]["sync_status"]
          synced_at: string | null
          time_spent_sec: number | null
        }
        Insert: {
          access_id?: string | null
          attempt_number?: number
          category_id: string
          completed_at?: string | null
          created_at?: string
          current_level_id?: string | null
          device_info?: Json | null
          id?: string
          is_void?: boolean
          level_id?: string | null
          phase?: string | null
          school_id: string
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          student_id: string
          sync_status?: Database["public"]["Enums"]["sync_status"]
          synced_at?: string | null
          time_spent_sec?: number | null
        }
        Update: {
          access_id?: string | null
          attempt_number?: number
          category_id?: string
          completed_at?: string | null
          created_at?: string
          current_level_id?: string | null
          device_info?: Json | null
          id?: string
          is_void?: boolean
          level_id?: string | null
          phase?: string | null
          school_id?: string
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          student_id?: string
          sync_status?: Database["public"]["Enums"]["sync_status"]
          synced_at?: string | null
          time_spent_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "assessment_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["access_id"]
          },
          {
            foreignKeyName: "assessment_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_current_level_id_fkey"
            columns: ["current_level_id"]
            isOneToOne: false
            referencedRelation: "question_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "question_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "assessment_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["student_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          status: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          status?: string
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          status?: string
          user_name?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          academic_year: string
          created_at: string
          grade: number
          id: string
          is_active: boolean
          name: string
          school_id: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          grade: number
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          grade?: number
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      communities: {
        Row: {
          address: string | null
          allowed_categories: string[] | null
          city: string | null
          code: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          district: string | null
          id: string
          is_active: boolean
          is_sandbox: boolean
          name: string
          province: string | null
          status_kepemilikan: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          address?: string | null
          allowed_categories?: string[] | null
          city?: string | null
          code: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          name: string
          province?: string | null
          status_kepemilikan?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          address?: string | null
          allowed_categories?: string[] | null
          city?: string | null
          code?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          name?: string
          province?: string | null
          status_kepemilikan?: string | null
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
      dapodik_import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          errors: Json | null
          fail_count: number
          file_name: string
          id: string
          new_ses_variables: Json | null
          school_id: string
          status: string
          success_count: number
          total_rows: number
          uploaded_by: string
          warnings: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          fail_count?: number
          file_name: string
          id?: string
          new_ses_variables?: Json | null
          school_id: string
          status?: string
          success_count?: number
          total_rows?: number
          uploaded_by: string
          warnings?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          fail_count?: number
          file_name?: string
          id?: string
          new_ses_variables?: Json | null
          school_id?: string
          status?: string
          success_count?: number
          total_rows?: number
          uploaded_by?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dapodik_import_batches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dapodik_import_batches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "dapodik_import_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dapodik_import_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      dapodik_parse_cache: {
        Row: {
          created_at: string
          expires_at: string
          parse_token: string
          parsed_data: Json
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          parse_token?: string
          parsed_data: Json
          uploaded_by: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          parse_token?: string
          parsed_data?: Json
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dapodik_parse_cache_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dapodik_parse_cache_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      intervention_tag_links: {
        Row: {
          intervention_id: string
          tag_id: string
        }
        Insert: {
          intervention_id: string
          tag_id: string
        }
        Update: {
          intervention_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_tag_links_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "intervention_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_tags: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      interventions: {
        Row: {
          alasan_bermakna: string
          community_id: string
          created_at: string
          id: string
          kondisi_awal: string
          perubahan_signifikan: string
          phase: string
          school_id: string
          stage_id: string | null
          submitted_by: string
          upaya_dilakukan: string
        }
        Insert: {
          alasan_bermakna: string
          community_id: string
          created_at?: string
          id?: string
          kondisi_awal: string
          perubahan_signifikan: string
          phase: string
          school_id: string
          stage_id?: string | null
          submitted_by: string
          upaya_dilakukan: string
        }
        Update: {
          alasan_bermakna?: string
          community_id?: string
          created_at?: string
          id?: string
          kondisi_awal?: string
          perubahan_signifikan?: string
          phase?: string
          school_id?: string
          stage_id?: string | null
          submitted_by?: string
          upaya_dilakukan?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["community_id"]
          },
          {
            foreignKeyName: "interventions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "interventions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "school_assessment_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      question_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          subject_area: Database["public"]["Enums"]["subject_area"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          subject_area: Database["public"]["Enums"]["subject_area"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subject_area?: Database["public"]["Enums"]["subject_area"]
          updated_at?: string
        }
        Relationships: []
      }
      question_levels: {
        Row: {
          access_code: string | null
          category_id: string | null
          created_at: string
          failure_message: string | null
          id: string
          learning_objective: string | null
          level_number: number
          passing_threshold: number | null
          success_message: string | null
          time_limit_sec: number | null
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          category_id?: string | null
          created_at?: string
          failure_message?: string | null
          id?: string
          learning_objective?: string | null
          level_number: number
          passing_threshold?: number | null
          success_message?: string | null
          time_limit_sec?: number | null
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          category_id?: string | null
          created_at?: string
          failure_message?: string | null
          id?: string
          learning_objective?: string | null
          level_number?: number
          passing_threshold?: number | null
          success_message?: string | null
          time_limit_sec?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_levels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: Json
          created_at: string
          created_by: string | null
          explanation: string | null
          id: string
          is_published: boolean
          level_id: string | null
          options: Json | null
          order_index: number
          question_audio_url: string | null
          question_code: string | null
          question_image_url: string | null
          question_text: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          question_video_url: string | null
          subject_area: Database["public"]["Enums"]["subject_area"]
          tags: string[] | null
          updated_at: string
          version: number
        }
        Insert: {
          correct_answer: Json
          created_at?: string
          created_by?: string | null
          explanation?: string | null
          id?: string
          is_published?: boolean
          level_id?: string | null
          options?: Json | null
          order_index?: number
          question_audio_url?: string | null
          question_code?: string | null
          question_image_url?: string | null
          question_text?: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          question_video_url?: string | null
          subject_area: Database["public"]["Enums"]["subject_area"]
          tags?: string[] | null
          updated_at?: string
          version?: number
        }
        Update: {
          correct_answer?: Json
          created_at?: string
          created_by?: string | null
          explanation?: string | null
          id?: string
          is_published?: boolean
          level_id?: string | null
          options?: Json | null
          order_index?: number
          question_audio_url?: string | null
          question_code?: string | null
          question_image_url?: string | null
          question_text?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          question_video_url?: string | null
          subject_area?: Database["public"]["Enums"]["subject_area"]
          tags?: string[] | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "questions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "question_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_stages: {
        Row: {
          community_id: string
          created_at: string
          current_stage: string
          id: string
          phase: string
          phase_request_id: string | null
          school_id: string
          stage_updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          current_stage?: string
          id?: string
          phase: string
          phase_request_id?: string | null
          school_id: string
          stage_updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          current_stage?: string
          id?: string
          phase?: string
          phase_request_id?: string | null
          school_id?: string
          stage_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_stages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_stages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["community_id"]
          },
          {
            foreignKeyName: "school_assessment_stages_phase_request_id_fkey"
            columns: ["phase_request_id"]
            isOneToOne: false
            referencedRelation: "assessment_phase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_stages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_stages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["school_id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string | null
          community_id: string | null
          contact_phone: string | null
          created_at: string
          dapodik_imported_at: string | null
          district: string | null
          id: string
          import_source: string | null
          is_active: boolean
          name: string
          npsn: string | null
          principal_name: string | null
          province: string | null
          raw_dapodik_header: Json | null
          updated_at: string
          village: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          community_id?: string | null
          contact_phone?: string | null
          created_at?: string
          dapodik_imported_at?: string | null
          district?: string | null
          id?: string
          import_source?: string | null
          is_active?: boolean
          name: string
          npsn?: string | null
          principal_name?: string | null
          province?: string | null
          raw_dapodik_header?: Json | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          community_id?: string | null
          contact_phone?: string | null
          created_at?: string
          dapodik_imported_at?: string | null
          district?: string | null
          id?: string
          import_source?: string | null
          is_active?: boolean
          name?: string
          npsn?: string | null
          principal_name?: string | null
          province?: string | null
          raw_dapodik_header?: Json | null
          updated_at?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["community_id"]
          },
        ]
      }
      ses_thresholds: {
        Row: {
          created_at: string
          id: string
          max_score: number
          min_score: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_score: number
          min_score: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_score?: number
          min_score?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ses_variables: {
        Row: {
          created_at: string
          id: string
          name: string
          needs_review: boolean
          score: number
          source: string | null
          type: Database["public"]["Enums"]["ses_variable_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          needs_review?: boolean
          score?: number
          source?: string | null
          type: Database["public"]["Enums"]["ses_variable_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          needs_review?: boolean
          score?: number
          source?: string | null
          type?: Database["public"]["Enums"]["ses_variable_type"]
          updated_at?: string
        }
        Relationships: []
      }
      student_answers: {
        Row: {
          answer_data: Json
          answered_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          recording_url: string | null
          score: number | null
          session_id: string
          status: Database["public"]["Enums"]["answer_status"]
          sync_status: Database["public"]["Enums"]["sync_status"]
          time_spent_sec: number | null
        }
        Insert: {
          answer_data: Json
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          recording_url?: string | null
          score?: number | null
          session_id: string
          status?: Database["public"]["Enums"]["answer_status"]
          sync_status?: Database["public"]["Enums"]["sync_status"]
          time_spent_sec?: number | null
        }
        Update: {
          answer_data?: Json
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          recording_url?: string | null
          score?: number | null
          session_id?: string
          status?: Database["public"]["Enums"]["answer_status"]
          sync_status?: Database["public"]["Enums"]["sync_status"]
          time_spent_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["session_id"]
          },
        ]
      }
      students: {
        Row: {
          agama: string | null
          birth_date: string | null
          birth_date_parse_error: boolean
          city: string | null
          class_id: string | null
          created_at: string
          district: string | null
          father_education_id: string | null
          father_occupation_id: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          id: string
          import_source: string | null
          is_active: boolean
          mother_education_id: string | null
          mother_occupation_id: string | null
          nik: string | null
          nipd: string | null
          nisn: string | null
          pin_hash: string
          province: string | null
          raw_dapodik: Json | null
          school_id: string
          ses_class: Database["public"]["Enums"]["ses_class"] | null
          ses_score: number | null
          updated_at: string
          username: string
          village: string | null
          wali_nama: string | null
          wali_nik: string | null
          wali_pekerjaan: string | null
          wali_pendidikan: string | null
        }
        Insert: {
          agama?: string | null
          birth_date?: string | null
          birth_date_parse_error?: boolean
          city?: string | null
          class_id?: string | null
          created_at?: string
          district?: string | null
          father_education_id?: string | null
          father_occupation_id?: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          id?: string
          import_source?: string | null
          is_active?: boolean
          mother_education_id?: string | null
          mother_occupation_id?: string | null
          nik?: string | null
          nipd?: string | null
          nisn?: string | null
          pin_hash: string
          province?: string | null
          raw_dapodik?: Json | null
          school_id: string
          ses_class?: Database["public"]["Enums"]["ses_class"] | null
          ses_score?: number | null
          updated_at?: string
          username: string
          village?: string | null
          wali_nama?: string | null
          wali_nik?: string | null
          wali_pekerjaan?: string | null
          wali_pendidikan?: string | null
        }
        Update: {
          agama?: string | null
          birth_date?: string | null
          birth_date_parse_error?: boolean
          city?: string | null
          class_id?: string | null
          created_at?: string
          district?: string | null
          father_education_id?: string | null
          father_occupation_id?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          import_source?: string | null
          is_active?: boolean
          mother_education_id?: string | null
          mother_occupation_id?: string | null
          nik?: string | null
          nipd?: string | null
          nisn?: string | null
          pin_hash?: string
          province?: string | null
          raw_dapodik?: Json | null
          school_id?: string
          ses_class?: Database["public"]["Enums"]["ses_class"] | null
          ses_score?: number | null
          updated_at?: string
          username?: string
          village?: string | null
          wali_nama?: string | null
          wali_nik?: string | null
          wali_pekerjaan?: string | null
          wali_pendidikan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "students_father_education_id_fkey"
            columns: ["father_education_id"]
            isOneToOne: false
            referencedRelation: "ses_variables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_father_occupation_id_fkey"
            columns: ["father_occupation_id"]
            isOneToOne: false
            referencedRelation: "ses_variables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_mother_education_id_fkey"
            columns: ["mother_education_id"]
            isOneToOne: false
            referencedRelation: "ses_variables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_mother_occupation_id_fkey"
            columns: ["mother_occupation_id"]
            isOneToOne: false
            referencedRelation: "ses_variables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["school_id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          level: string
          message: string
          resolved: boolean
          role_context: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string
          message: string
          resolved?: boolean
          role_context?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string
          message?: string
          resolved?: boolean
          role_context?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          gemini_api_key: string | null
          id: number
          maintenance_message: string | null
          maintenance_mode: boolean
          session_timeout: number
          system_name: string
          updated_at: string | null
        }
        Insert: {
          gemini_api_key?: string | null
          id?: number
          maintenance_message?: string | null
          maintenance_mode?: boolean
          session_timeout?: number
          system_name?: string
          updated_at?: string | null
        }
        Update: {
          gemini_api_key?: string | null
          id?: number
          maintenance_message?: string | null
          maintenance_mode?: boolean
          session_timeout?: number
          system_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          birth_date: string | null
          community_id: string | null
          created_at: string
          district: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_active: boolean
          kode_guru: string | null
          last_login_at: string | null
          nip: string | null
          province: string | null
          regency: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          updated_at: string
          username: string
          village: string | null
        }
        Insert: {
          birth_date?: string | null
          community_id?: string | null
          created_at?: string
          district?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          is_active?: boolean
          kode_guru?: string | null
          last_login_at?: string | null
          nip?: string | null
          province?: string | null
          regency?: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          username: string
          village?: string | null
        }
        Update: {
          birth_date?: string | null
          community_id?: string | null
          created_at?: string
          district?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean
          kode_guru?: string | null
          last_login_at?: string | null
          nip?: string | null
          province?: string | null
          regency?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          username?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["community_id"]
          },
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_assessment_report"
            referencedColumns: ["school_id"]
          },
        ]
      }
    }
    Views: {
      v_assessment_report: {
        Row: {
          access_id: string | null
          attempt_number: number | null
          birth_date: string | null
          category_id: string | null
          category_name: string | null
          city: string | null
          class_id: string | null
          class_name: string | null
          community_id: string | null
          community_name: string | null
          completed_at: string | null
          current_level_id: string | null
          final_level_number: number | null
          final_score: number | null
          gender: Database["public"]["Enums"]["gender"] | null
          grade: number | null
          is_void: boolean | null
          nisn: string | null
          npsn: string | null
          passing_threshold: number | null
          phase: string | null
          province: string | null
          school_id: string | null
          school_name: string | null
          ses_class: Database["public"]["Enums"]["ses_class"] | null
          ses_score: number | null
          session_id: string | null
          session_status: Database["public"]["Enums"]["session_status"] | null
          started_at: string | null
          student_city: string | null
          student_district: string | null
          student_id: string | null
          student_name: string | null
          student_province: string | null
          student_username: string | null
          student_village: string | null
          subject_area: Database["public"]["Enums"]["subject_area"] | null
          teacher_id: string | null
          teacher_name: string | null
          time_spent_sec: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_access_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_current_level_id_fkey"
            columns: ["current_level_id"]
            isOneToOne: false
            referencedRelation: "question_levels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advance_student_level: {
        Args: { p_current_level_id: string; p_session_id: string }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      insert_sandbox_school_data: {
        Args: {
          p_community_id: string
          p_school_id: string
          p_school_name: string
          p_category_id: string
          p_granted_by: string
          p_users: Json
          p_students: Json
        }
        Returns: Json
      }
      is_assessment_access_valid: {
        Args: { p_category_id: string; p_phase: string; p_student_id: string }
        Returns: boolean
      }
      jwt_community_id: { Args: never; Returns: string }
      jwt_school_id: { Args: never; Returns: string }
      jwt_school_id_student: { Args: never; Returns: string }
      jwt_student_id: { Args: never; Returns: string }
      jwt_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      jwt_user_role_extended: { Args: never; Returns: string }
      validate_level_completion: {
        Args: { p_session_id: string }
        Returns: {
          next_level_id: string
          passed: boolean
          score_percent: number
        }[]
      }
    }
    Enums: {
      answer_status: "answered" | "skipped" | "flagged"
      difficulty_level: "mudah" | "sedang" | "sulit"
      gender: "L" | "P"
      log_level: "info" | "warning" | "error" | "critical"
      log_source: "frontend" | "backend" | "database" | "system" | "feedback"
      question_type:
        | "multiple_choice"
        | "drag_drop"
        | "image_choice"
        | "audio_question"
        | "video_question"
        | "voice_recording"
      ses_class:
        | "atas"
        | "menengah"
        | "bawah"
        | "menengah_atas"
        | "menengah_bawah"
      ses_variable_type: "education" | "occupation"
      session_status: "pending" | "active" | "completed" | "expired"
      subject_area: "literasi" | "numerasi"
      sync_status: "synced" | "pending" | "failed"
      user_role:
        | "super_admin"
        | "question_admin"
        | "community"
        | "school"
        | "teacher"
        | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      answer_status: ["answered", "skipped", "flagged"],
      difficulty_level: ["mudah", "sedang", "sulit"],
      gender: ["L", "P"],
      log_level: ["info", "warning", "error", "critical"],
      log_source: ["frontend", "backend", "database", "system", "feedback"],
      question_type: [
        "multiple_choice",
        "drag_drop",
        "image_choice",
        "audio_question",
        "video_question",
        "voice_recording",
      ],
      ses_class: [
        "atas",
        "menengah",
        "bawah",
        "menengah_atas",
        "menengah_bawah",
      ],
      ses_variable_type: ["education", "occupation"],
      session_status: ["pending", "active", "completed", "expired"],
      subject_area: ["literasi", "numerasi"],
      sync_status: ["synced", "pending", "failed"],
      user_role: [
        "super_admin",
        "question_admin",
        "community",
        "school",
        "teacher",
        "student",
      ],
    },
  },
} as const

export type UserRole = Database['public']['Enums']['user_role'];
export type QuestionType = Database['public']['Enums']['question_type'];
export type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
export type SubjectArea = Database['public']['Enums']['subject_area'];
export type Gender = Database['public']['Enums']['gender'];
export type SesClass = Database['public']['Enums']['ses_class'];
export type SessionStatus = Database['public']['Enums']['session_status'];
export type AnswerStatus = Database['public']['Enums']['answer_status'];
export type SyncStatus = Database['public']['Enums']['sync_status'];

export type Community = Database['public']['Tables']['communities']['Row'];
export type School = Database['public']['Tables']['schools']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type Class = Database['public']['Tables']['classes']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type Question = Database['public']['Tables']['questions']['Row'];
export type AssessmentPackage = Database['public']['Tables']['question_categories']['Row'];
export type AssessmentAccess = Database['public']['Tables']['assessment_access']['Row'];
export type AssessmentSession = Database['public']['Tables']['assessment_sessions']['Row'];
export type StudentAnswer = Database['public']['Tables']['student_answers']['Row'];

export type CommunityInsert = Database['public']['Tables']['communities']['Insert'];
export type SchoolInsert = Database['public']['Tables']['schools']['Insert'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type ClassInsert = Database['public']['Tables']['classes']['Insert'];
export type StudentInsert = Database['public']['Tables']['students']['Insert'];
export type QuestionInsert = Database['public']['Tables']['questions']['Insert'];
export type QuestionCategoryInsert = Database['public']['Tables']['question_categories']['Insert'];
export type AssessmentSessionInsert = Database['public']['Tables']['assessment_sessions']['Insert'];
export type StudentAnswerInsert = Database['public']['Tables']['student_answers']['Insert'];

export interface PemantikJwtClaims {
  community_id?: string;
  school_id?: string;
  role?: UserRole;
  is_student?: boolean;
}
