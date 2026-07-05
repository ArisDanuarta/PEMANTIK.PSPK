-- Tambahkan role 'student' ke tipe enum user_role agar query RLS tidak error 22P02
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student';
