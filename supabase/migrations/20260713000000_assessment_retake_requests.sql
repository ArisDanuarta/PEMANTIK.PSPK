
CREATE TABLE IF NOT EXISTS public.assessment_retake_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_retake_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin can manage all retake requests" ON public.assessment_retake_requests;
CREATE POLICY "Superadmin can manage all retake requests" 
ON public.assessment_retake_requests 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
);

DROP POLICY IF EXISTS "Schools can insert own requests" ON public.assessment_retake_requests;
CREATE POLICY "Schools can insert own requests" 
ON public.assessment_retake_requests 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role IN ('school', 'teacher') 
        AND u.school_id = assessment_retake_requests.school_id
    )
);

DROP POLICY IF EXISTS "Schools can view own requests" ON public.assessment_retake_requests;
CREATE POLICY "Schools can view own requests" 
ON public.assessment_retake_requests 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role IN ('school', 'teacher') 
        AND u.school_id = assessment_retake_requests.school_id
    )
);

