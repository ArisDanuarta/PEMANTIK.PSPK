-- Tambahkan role 'peneliti' ke tipe enum user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'peneliti';
COMMIT;

-- communities: peneliti bisa READ semua (kecuali sandbox)
CREATE POLICY "peneliti_read_communities" ON public.communities
  FOR SELECT TO public
  USING (jwt_user_role() = 'peneliti' AND is_sandbox = false);

-- schools: peneliti bisa READ semua
CREATE POLICY "peneliti_read_schools" ON public.schools
  FOR SELECT TO public
  USING (jwt_user_role() = 'peneliti');

-- students: peneliti bisa READ
CREATE POLICY "peneliti_read_students" ON public.students
  FOR SELECT TO public
  USING (jwt_user_role() = 'peneliti');

-- assessment_sessions: peneliti bisa READ semua non-void
CREATE POLICY "peneliti_read_sessions" ON public.assessment_sessions
  FOR SELECT TO public
  USING (jwt_user_role() = 'peneliti' AND is_void = false);

-- student_answers: peneliti bisa READ semua
CREATE POLICY "peneliti_read_answers" ON public.student_answers
  FOR SELECT TO public
  USING (jwt_user_role() = 'peneliti');

-- interventions: peneliti bisa READ semua
CREATE POLICY "peneliti_read_interventions" ON public.interventions
  FOR SELECT TO public
  USING (jwt_user_role() = 'peneliti');

-- ai_knowledge_nodes: peneliti bisa READ
CREATE POLICY "peneliti_read_ai_nodes" ON public.ai_knowledge_nodes
  FOR SELECT TO public
  USING (jwt_user_role() = 'peneliti');

-- ai_knowledge_edges: peneliti bisa READ
CREATE POLICY "peneliti_read_ai_edges" ON public.ai_knowledge_edges
  FOR SELECT TO public
  USING (jwt_user_role() = 'peneliti');

-- users: peneliti bisa READ pengguna lain (mungkin dibutuhkan untuk view)
CREATE POLICY "peneliti_read_users" ON public.users
  FOR SELECT TO public
  USING (jwt_user_role() = 'peneliti');
