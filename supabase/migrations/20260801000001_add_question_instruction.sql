-- Tambah kolom question_instruction untuk instruksi/teks yang muncul DI ATAS media
-- Urutan tampil: question_instruction → media (video/audio/gambar) → question_text (pertanyaan/instruksi bawah)
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_instruction text DEFAULT NULL;

COMMENT ON COLUMN public.questions.question_instruction IS
  'Instruksi yang tampil DI ATAS media (contoh: "Dengarkan suara berikut"). '
  'question_text tetap berisi pertanyaan/instruksi SETELAH media (contoh: "Pilihlah suara yang kamu dengar").';
