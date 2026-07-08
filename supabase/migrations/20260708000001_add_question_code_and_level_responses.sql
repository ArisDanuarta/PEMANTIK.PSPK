-- Add question_code to questions table
ALTER TABLE questions
ADD COLUMN question_code TEXT;

-- Add learning_objective, success_message, and failure_message to question_levels table
ALTER TABLE question_levels
ADD COLUMN learning_objective TEXT,
ADD COLUMN success_message TEXT,
ADD COLUMN failure_message TEXT;
