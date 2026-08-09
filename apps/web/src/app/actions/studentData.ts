'use server';

import { createServerClient } from "@pemantik/supabase";

export async function getStudentDashboardData(student: any) {
  const supabase = createServerClient();

  const targetIds = [student.id];
  if (student.class_id) targetIds.push(student.class_id);
  if (student.school_id) targetIds.push(student.school_id);
  const communityId = student.schools?.community_id;
  if (communityId) targetIds.push(communityId);

  const { data: accessData, error: accessErr } = await supabase
    .from('assessment_access')
    .select(`id, valid_until, phase, category_id, question_categories (id, name, subject_area)`)
    .in('target_id', targetIds)
    .eq('is_active', true);

  if (accessErr || !accessData || accessData.length === 0) {
    return { activePackages: [], historyPackages: [] };
  }

  const uniqueCategories = new Map();
  for (const access of accessData) {
    if (!uniqueCategories.has(access.category_id)) {
      uniqueCategories.set(access.category_id, access);
    }
  }

  const categoryIds = Array.from(uniqueCategories.keys());

  const { data: levelsData } = await supabase
    .from('question_levels')
    .select('category_id, id')
    .in('category_id', categoryIds);

  const levelCounts: Record<string, number> = {};
  if (levelsData) {
    for (const lvl of levelsData) {
      if (lvl.category_id) levelCounts[lvl.category_id] = (levelCounts[lvl.category_id] || 0) + 1;
    }
  }

  const { data: sessionsData } = await supabase
    .from('assessment_sessions')
    .select('category_id, level_id, status')
    .eq('student_id', student.id)
    .in('category_id', categoryIds);

  const completedCounts: Record<string, number> = {};
  if (sessionsData) {
    for (const session of sessionsData) {
      const catId = session.category_id;
      if (!completedCounts[catId]) completedCounts[catId] = 0;
      if (session.status === 'completed') completedCounts[catId]++;
    }
  }

  const activePackages: any[] = [];
  const historyPackages: any[] = [];
  const now = new Date();

  for (const access of Array.from(uniqueCategories.values())) {
    const cat = access.question_categories as any;
    if (!cat) continue;
    const catId = access.category_id;
    const total = levelCounts[catId] || 0;
    const completed = completedCounts[catId] || 0;
    let statusLabel = 'Belum Mulai';
    if (completed > 0) statusLabel = 'Aktif';
    if (total > 0 && completed >= total) statusLabel = 'Selesai';
    const isExpired = access.valid_until ? new Date(access.valid_until) < now : false;
    const pkg = { id: catId, title: cat.name, subject: cat.subject_area, validUntil: access.valid_until, levelsTotal: total, levelsCompleted: completed, status: statusLabel };
    if (statusLabel === 'Selesai' || isExpired) historyPackages.push(pkg);
    else activePackages.push(pkg);
  }

  return { activePackages, historyPackages };
}

export async function getStudentLevelsData(studentId: string, categoryId: string) {
  const supabase = createServerClient();

  const { data: category } = await supabase
    .from('question_categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (!category) return null;

  const { data: levelsData, error: levelsErr } = await supabase
    .from('question_levels')
    .select('*')
    .eq('category_id', categoryId)
    .order('level_number', { ascending: true });

  if (levelsErr || !levelsData) return null;

  const { data: sessionsData } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('student_id', studentId)
    .eq('category_id', categoryId)
    .eq('is_void', false);

  const sessionMap = new Map();
  if (sessionsData) {
    for (const session of sessionsData) sessionMap.set(session.level_id, session);
  }

  let nextUnlocked = true;
  let hasFailed = false;

  const levels = levelsData.map((level) => {
    const session = sessionMap.get(level.id);
    let status = 'Terkunci';

    if (session) {
      if (session.status === 'completed') {
        const passed = (session.score ?? 0) >= (level.passing_threshold ?? 0);
        if (passed) { status = 'Selesai'; nextUnlocked = true; }
        else { status = 'Perlu Diulang'; nextUnlocked = false; hasFailed = true; }
      } else {
        status = 'Aktif';
        nextUnlocked = false;
      }
    } else {
      if (nextUnlocked && !hasFailed) { status = 'Aktif'; nextUnlocked = false; }
      else { status = 'Terkunci'; }
    }

    return { ...level, status, session };
  });

  return { category, levels };
}

export async function getStudentHistoryData(studentId: string) {
  const supabase = createServerClient();

  const { data: sessions, error } = await supabase
    .from('assessment_sessions')
    .select(`
      id, score, status, phase, attempt_number, started_at, created_at, sync_status,
      question_levels!assessment_sessions_level_id_fkey (
        id, level_number, passing_threshold,
        question_categories ( id, name, subject_area )
      )
    `)
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching history:', error);
    return [];
  }

  return (sessions || []).map((s) => {
    const level = s.question_levels as any;
    const category = level?.question_categories as any;
    const score = s.score ?? 0;
    const passingThreshold = level?.passing_threshold ?? 70;
    const isPass = score >= passingThreshold;
    return {
      id: s.id,
      score,
      passingThreshold,
      isPass,
      phase: s.phase || 'Tahap 1',
      attemptNumber: s.attempt_number || 1,
      startedAt: s.started_at || s.created_at,
      syncStatus: s.sync_status || 'synced',
      levelNumber: level?.level_number ?? 0,
      levelId: level?.id ?? '',
      categoryId: category?.id ?? '',
      categoryName: category?.name ?? 'Tidak diketahui',
      subjectArea: category?.subject_area ?? 'literasi',
    };
  });
}
