// ─── Supabase Package — Pemantik Platform ─────────────────────────────────────
export { createBrowserClient, createServerClient } from "./client";

// Database schema
export type { Database } from "./types";

// Enums
export type {
  UserRole,
  QuestionType,
  DifficultyLevel,
  SubjectArea,
  Gender,
  SesClass,
  SessionStatus,
  AnswerStatus,
  SyncStatus,
} from "./types";

// Row types (read from DB)
export type {
  Community,
  School,
  User,
  Class,
  Student,
  Question,
  AssessmentPackage,
  AssessmentPackageQuestion,
  AssessmentAccess,
  AssessmentSession,
  StudentAnswer,
} from "./types";

// Insert types (write to DB)
export type {
  CommunityInsert,
  SchoolInsert,
  UserInsert,
  ClassInsert,
  StudentInsert,
  QuestionInsert,
  QuestionCategoryInsert,
  AssessmentSessionInsert,
  StudentAnswerInsert,
} from "./types";

// Auth
export type { Json, PemantikJwtClaims } from "./types";
