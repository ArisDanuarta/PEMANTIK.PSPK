-- Migration: Menambahkan fungsi (RPC) untuk perakitan paket ujian dan validasi kelulusan level adaptif

-- 1. Fungsi Assemble Package Questions
-- Fungsi ini menambahkan soal-soal published dari kategori & level tertentu ke sebuah paket
create or replace function assemble_package_questions(
  p_package_id uuid,
  p_subject_area text,
  p_level_ids uuid[]
)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into assessment_package_questions (package_id, question_id, order_index)
  select
    p_package_id,
    q.id,
    row_number() over (order by q.created_at)
  from questions q
  where q.subject_area = p_subject_area::subject_area
    and q.level_id = any(p_level_ids)
    and q.is_published = true
    and not exists (
      select 1 from assessment_package_questions apq
      where apq.package_id = p_package_id and apq.question_id = q.id
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 2. Fungsi Validate Level Completion
-- Fungsi ini memvalidasi kelulusan level ujian setelah sesi selesai
create or replace function validate_level_completion(
  p_session_id uuid
)
returns table (passed boolean, score_percent numeric, next_level_id uuid)
language plpgsql
security definer
as $$
declare
  v_level_id uuid;
  v_threshold numeric;
  v_total int;
  v_correct int;
begin
  -- Cari level_id dari sesi ini.
  -- Catatan: assessment_sessions punya package_id. 
  -- Tapi assessment_sessions tidak menyimpan level_id langsung.
  -- Kita ambil dari soal yang dikerjakan siswa.
  select q.level_id into v_level_id
  from student_answers sa
  join questions q on sa.question_id = q.id
  where sa.session_id = p_session_id
  limit 1;

  if v_level_id is null then
    return query select false, 0.0, null::uuid;
    return;
  end if;

  -- Ambil passing_threshold
  select passing_threshold into v_threshold
  from question_levels where id = v_level_id;

  -- Hitung jawaban
  select count(*), count(*) filter (where is_correct = true)
  into v_total, v_correct
  from student_answers
  where session_id = p_session_id;

  return query
  select
    (v_correct::numeric / nullif(v_total, 0) * 100) >= v_threshold,
    (v_correct::numeric / nullif(v_total, 0) * 100),
    (select id from question_levels
       where category_id = (select category_id from question_levels where id = v_level_id)
       and level_number = (select level_number from question_levels where id = v_level_id) + 1
       limit 1);
end;
$$;
