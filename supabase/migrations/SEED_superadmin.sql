-- ══════════════════════════════════════════════════════════════════════════════
-- PEMANTIK — Seed: Buat akun Super Admin pertama
-- Jalankan di Supabase SQL Editor setelah migration schema berhasil
--
-- GANTI nilai berikut sebelum run:
--   email    : email super admin (untuk login Supabase Auth)
--   password : password yang kuat (min 8 karakter)
--   username : username untuk login di Pemantik
--   full_name: nama lengkap
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id    uuid;
  v_email      text := 'superadmin@pemantik.pspk.id';  -- GANTI
  v_password   text := 'SuperAdmin@2026';              -- GANTI (wajib kuat)
  v_username   text := 'superadmin_pemantik';                    -- GANTI jika perlu
  v_full_name  text := 'Super Administrator';           -- GANTI
BEGIN
  -- 1. Buat user di Supabase Auth
  v_user_id := extensions.uuid_generate_v4();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    role,
    aud,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(v_password, gen_salt('bf')),
    NOW(),
    'authenticated',
    'authenticated',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('full_name', v_full_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- 2. Buat identity entry (diperlukan untuk password login)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    extensions.uuid_generate_v4(),
    v_user_id,
    v_email,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- 3. Buat row di tabel public.users
  INSERT INTO public.users (
    id,
    username,
    full_name,
    role,
    community_id,
    school_id,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_username,
    v_full_name,
    'super_admin',
    NULL,
    NULL,
    true,
    NOW(),
    NOW()
  );

  RAISE NOTICE '✓ Super Admin berhasil dibuat!';
  RAISE NOTICE '  Email    : %', v_email;
  RAISE NOTICE '  Username : %', v_username;
  RAISE NOTICE '  User ID  : %', v_user_id;
END;
$$;
