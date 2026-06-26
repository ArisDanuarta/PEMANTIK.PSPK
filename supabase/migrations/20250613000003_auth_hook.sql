-- ══════════════════════════════════════════════════════════════════════════════
-- PEMANTIK — Supabase Auth Hook: inject custom claims ke JWT
-- Jalankan sekali di Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- Function ini dipanggil otomatis oleh Supabase setiap kali token dibuat/refresh
-- Menyuntikkan user_role, community_id, school_id ke dalam JWT payload

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  claims jsonb;
  user_rec record;
BEGIN
  -- Ambil data user dari tabel users kita
  SELECT role, community_id, school_id
  INTO user_rec
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;

  -- Ambil claims yang sudah ada
  claims := event->'claims';

  IF user_rec IS NOT NULL THEN
    -- Inject custom claims
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_rec.role::text));

    IF user_rec.community_id IS NOT NULL THEN
      claims := jsonb_set(claims, '{community_id}', to_jsonb(user_rec.community_id::text));
    END IF;

    IF user_rec.school_id IS NOT NULL THEN
      claims := jsonb_set(claims, '{school_id}', to_jsonb(user_rec.school_id::text));
    END IF;
  END IF;

  -- Return modified event
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant permission ke supabase_auth_admin agar bisa memanggil function ini
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke akses publik
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;
