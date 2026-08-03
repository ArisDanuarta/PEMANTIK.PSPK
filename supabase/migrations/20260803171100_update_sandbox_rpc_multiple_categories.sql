-- Hapus fungsi lama yang menggunakan p_category_id (uuid tunggal)
DROP FUNCTION IF EXISTS insert_sandbox_school_data(uuid, uuid, text, uuid, uuid, jsonb, jsonb);

-- Buat fungsi baru yang menggunakan p_category_ids (array uuid[])
CREATE OR REPLACE FUNCTION insert_sandbox_school_data(
  p_community_id       uuid,
  p_school_id          uuid,
  p_school_name        text,
  p_category_ids       uuid[],
  p_granted_by         uuid,
  p_users              jsonb,  -- Array of {id, username, full_name, role, class_name, grade}
  p_students           jsonb   -- Array of {username, full_name, gender, pin_hash, class_index}
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user              jsonb;
  v_student           jsonb;
  v_class_id          uuid;
  v_class_index       int;
  v_class_ids         uuid[];
  v_category_id       uuid;
BEGIN
  -- Validasi: pastikan komunitas ini adalah sandbox
  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = p_community_id AND is_sandbox = true) THEN
    RAISE EXCEPTION 'Komunitas ini tidak memiliki akses sandbox (is_sandbox = false)';
  END IF;

  -- 1. Buat Sekolah
  INSERT INTO public.schools (id, community_id, name, is_active, import_source)
  VALUES (p_school_id, p_community_id, p_school_name, true, 'manual');

  -- 2. Insert users (Admin Sekolah + Guru) & buat Kelas per Guru
  FOR v_user IN SELECT * FROM jsonb_array_elements(p_users)
  LOOP
    -- Insert ke public.users
    INSERT INTO public.users (id, username, full_name, role, school_id, community_id, is_active)
    VALUES (
      (v_user->>'id')::uuid,
      v_user->>'username',
      v_user->>'full_name',
      (v_user->>'role')::user_role,
      p_school_id,
      p_community_id,
      true
    );

    -- Jika role-nya teacher, buat kelas dan mapping
    IF (v_user->>'role') = 'teacher' THEN
      v_class_id := uuid_generate_v4();
      
      INSERT INTO public.classes (id, school_id, teacher_id, name, grade, academic_year, is_active)
      VALUES (
        v_class_id,
        p_school_id,
        (v_user->>'id')::uuid,
        v_user->>'class_name',
        (v_user->>'grade')::int,
        'Trial',
        true
      );

      INSERT INTO public.class_teachers (class_id, teacher_id)
      VALUES (v_class_id, (v_user->>'id')::uuid);

      -- Simpan mapping class_index -> class_id ke array
      -- Ambil class_index dari user data
      v_class_index := (v_user->>'class_index')::int;
      v_class_ids[v_class_index] := v_class_id;
    END IF;
  END LOOP;

  -- 3. Insert Siswa dengan referensi ke class_id yang sudah dibuat
  FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    v_class_index := (v_student->>'class_index')::int;
    
    INSERT INTO public.students (id, school_id, class_id, full_name, gender, pin_hash, username, is_active, import_source)
    VALUES (
      uuid_generate_v4(),
      p_school_id,
      v_class_ids[v_class_index],
      v_student->>'full_name',
      (v_student->>'gender')::gender,
      v_student->>'pin_hash',
      v_student->>'username',
      true,
      'manual'
    );
  END LOOP;

  -- 4. Inject assessment_access (Bypass Pengajuan Fase)
  -- Loop melalui setiap category_id yang dipilih dan berikan akses
  FOREACH v_category_id IN ARRAY p_category_ids
  LOOP
    INSERT INTO public.assessment_access (
      granted_by, valid_from, valid_until, max_attempts,
      is_active, target_type, target_id, phase, category_id
    )
    VALUES (
      p_granted_by,
      now(),
      now() + interval '30 days',
      99,
      true,
      'school',
      p_school_id,
      'Tahap 1',
      v_category_id
    );
  END LOOP;

  RETURN jsonb_build_object('status', 'success', 'school_id', p_school_id);
END;
$$;
