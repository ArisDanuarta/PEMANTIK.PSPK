-- Menambahkan kolom cheat_strikes pada assessment_sessions untuk melacak 3-strike rule
ALTER TABLE assessment_sessions ADD COLUMN cheat_strikes INTEGER NOT NULL DEFAULT 0;
