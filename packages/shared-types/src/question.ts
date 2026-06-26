// ─── Question Types ───────────────────────────────────────────────────────────

export type SubjectType = "literacy" | "numeracy";

export type QuestionInteractionType =
  | "multiple_choice"
  | "drag_and_drop"
  | "audio_stimulus"
  | "video_stimulus"
  | "voice_recording"
  | "image_stimulus";

export type QuestionStatus = "draft" | "review" | "published" | "archived";

// Level: Literasi L1–L9, Numerasi L0–L3+
export interface Question {
  id: string;
  subject: SubjectType;
  level: number; // 0-9
  package_number: number; // Paket 1, 2, 3 ...
  interaction_type: QuestionInteractionType;
  content: QuestionContent; // JSONB
  media_url: string | null;
  answer_key: AnswerKey; // JSONB
  status: QuestionStatus;
  version: number; // question_version for offline conflict resolution
  created_by: string; // user_id of admin_soal
  created_at: string;
  updated_at: string;
}

// Polymorphic content per interaction type
export type QuestionContent =
  | MultipleChoiceContent
  | DragDropContent
  | AudioContent
  | VideoContent
  | VoiceRecordingContent
  | ImageContent;

export interface MultipleChoiceContent {
  type: "multiple_choice";
  question_text: string;
  options: Array<{
    id: string;
    text: string;
    image_url?: string;
  }>;
  allow_multiple: boolean;
}

export interface DragDropContent {
  type: "drag_and_drop";
  instruction: string;
  items: Array<{ id: string; text: string; image_url?: string }>;
  targets: Array<{ id: string; label: string }>;
}

export interface AudioContent {
  type: "audio_stimulus";
  audio_url: string;
  question_text: string;
  options: Array<{ id: string; text: string }>;
}

export interface VideoContent {
  type: "video_stimulus";
  video_url: string;
  question_text: string;
  options: Array<{ id: string; text: string }>;
}

export interface VoiceRecordingContent {
  type: "voice_recording";
  prompt_text: string;
  reference_text?: string; // Kata/kalimat yang harus diucapkan
  max_duration_seconds: number;
}

export interface ImageContent {
  type: "image_stimulus";
  image_url: string;
  question_text: string;
  options: Array<{ id: string; text: string }>;
}

// ─── Answer Key ───────────────────────────────────────────────────────────────

export interface AnswerKey {
  correct_option_ids?: string[]; // for multiple_choice, drag_and_drop
  voice_scoring?: "manual"; // for voice_recording
  scoring_rubric?: string;
  points: number;
}
