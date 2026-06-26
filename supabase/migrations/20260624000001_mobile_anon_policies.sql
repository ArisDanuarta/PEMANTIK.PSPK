-- 1. Assessment Access: Allow anon to read active access
CREATE POLICY "student_view_access" ON assessment_access
  FOR SELECT USING (auth.role() = 'anon' AND is_active = true);

-- 2. Question Categories: Allow anon to read
CREATE POLICY "student_view_categories" ON question_categories
  FOR SELECT USING (auth.role() = 'anon');

-- 3. Question Levels: Allow anon to read
CREATE POLICY "student_view_levels" ON question_levels
  FOR SELECT USING (auth.role() = 'anon');

-- 4. Questions: Allow anon to read published questions
CREATE POLICY "student_view_questions" ON questions
  FOR SELECT USING (auth.role() = 'anon' AND is_published = true);

-- 5. Assessment Sessions: Allow anon to read, insert, update
CREATE POLICY "student_manage_sessions" ON assessment_sessions
  FOR ALL USING (auth.role() = 'anon');

-- 6. Student Answers: Allow anon to read, insert, update
CREATE POLICY "student_manage_answers" ON student_answers
  FOR ALL USING (auth.role() = 'anon');
