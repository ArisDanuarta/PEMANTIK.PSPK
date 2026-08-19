/**
 * load.js
 * -----------------------------------------------------------------------
 * INSERT SUNGGUHAN ke Supabase. Selalu jalankan dryRun.js dulu dan
 * review output/dry_run_report.json sebelum pakai --execute di sini.
 *
 * Usage:
 *   node load.js                          # dry-run (tidak insert apa-apa)
 *   node load.js --execute                # insert sungguhan
 *   node load.js --execute --input=./input --soal=./input/soal.xlsx
 *
 * Environment (.env):
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...          # Service Role, bukan anon key
 * -----------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const config = require('./config');
const { buildAnswerKey } = require('./lib/answerKey');
const { parseOldExportFile } = require('./lib/parseOldExport');
const { buildEntities } = require('./lib/buildEntities');
const { getSupabaseClient } = require('./lib/supabaseClient');

function parseArgs() {
  const args = { input: './input', soal: './input/soal.xlsx', execute: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--execute') { args.execute = true; continue; }
    const [k, v] = arg.replace(/^--/, '').split('=');
    if (k in args) args[k] = v;
  }
  return args;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const args = parseArgs();
  const inputDir = path.resolve(args.input);
  const soalPath = path.resolve(args.soal);
  const DRY = !args.execute;

  console.log('='.repeat(70));
  console.log(`MIGRASI DATA UJIAN KKN UGM -> PEMANTIK  [${DRY ? 'DRY-RUN' : 'EXECUTE'}]`);
  console.log('='.repeat(70));
  if (DRY) console.log('(Tidak ada perubahan ke database. Tambahkan --execute untuk insert sungguhan.)\n');

  // ---- 1. Parse input --------------------------------------------------
  const { answerKey } = buildAnswerKey(soalPath);
  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith('.xlsx') && path.resolve(inputDir, f) !== soalPath);
  let allSessions = [];
  for (const f of files) {
    const { sessions } = parseOldExportFile(path.join(inputDir, f), answerKey, f);
    allSessions = allSessions.concat(sessions);
  }
  const { communities, schools, classes, students, dedupWarnings } = buildEntities(allSessions);

  if (dedupWarnings.length) {
    console.log(`!! ${dedupWarnings.length} warning kemungkinan duplikat siswa -- REVIEW dulu sebelum lanjut:`);
    dedupWarnings.forEach((w) => console.log(`   - ${w}`));
    console.log('');
  }

  console.log(`Sumber: ${files.length} file, ${allSessions.length} sesi, ${communities.size} komunitas, ` +
    `${schools.size} sekolah, ${classes.size} kelas, ${students.size} siswa.\n`);

  const supabase = getSupabaseClient();

  // ---- 2. Lookup question_id dari kode LIT-*/NUM-* yang sudah ada di DB
  console.log('[1/6] Lookup question_id dari tabel questions...');
  const { data: questionRows, error: qErr } = await supabase
    .from('questions')
    .select('id, question_code')
    .or('question_code.like.LIT-%,question_code.like.NUM-%');
  if (qErr) throw qErr;
  const questionCodeToId = new Map((questionRows || []).map((r) => [r.question_code, r.id]));
  console.log(`      ${questionCodeToId.size} question_code ditemukan di DB.`);

  // ---- 3. Upsert communities -------------------------------------------
  console.log('[2/6] Upsert communities...');
  const communityKeyToId = new Map();
  for (const [key, c] of communities) {
    const code = key.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 40);
    if (DRY) {
      console.log(`      (dry-run) community "${c.name}" code=${code} is_sandbox=${config.SANDBOX_MODE}`);
      communityKeyToId.set(key, `DRYRUN-${code}`);
      continue;
    }
    const { data: existing } = await supabase.from('communities').select('id').eq('code', code).maybeSingle();
    if (existing) {
      communityKeyToId.set(key, existing.id);
      continue;
    }
    const { data: inserted, error } = await supabase
      .from('communities')
      .insert({ name: c.name, code, is_sandbox: config.SANDBOX_MODE, is_active: true })
      .select('id')
      .single();
    if (error) throw error;
    communityKeyToId.set(key, inserted.id);
  }

  // ---- 4. Upsert schools -------------------------------------------------
  console.log('[3/6] Upsert schools...');
  const schoolKeyToId = new Map();
  for (const [key, s] of schools) {
    const communityId = communityKeyToId.get(s.communityKey);
    if (DRY) {
      console.log(`      (dry-run) school "${s.name}" under community ${s.communityKey}`);
      schoolKeyToId.set(key, `DRYRUN-${key}`);
      continue;
    }
    const { data: existing } = await supabase
      .from('schools')
      .select('id')
      .eq('name', s.name)
      .eq('community_id', communityId)
      .maybeSingle();
    if (existing) {
      schoolKeyToId.set(key, existing.id);
      continue;
    }
    const { data: inserted, error } = await supabase
      .from('schools')
      .insert({ name: s.name, community_id: communityId, import_source: 'manual', is_active: true })
      .select('id')
      .single();
    if (error) throw error;
    schoolKeyToId.set(key, inserted.id);
  }

  // ---- 5. Upsert classes --------------------------------------------------
  console.log('[4/6] Upsert classes...');
  const classKeyToId = new Map();
  for (const [key, c] of classes) {
    const schoolId = schoolKeyToId.get(c.schoolKey);
    if (!c.grade) {
      console.log(`      !! lewati kelas "${c.name}" (${key}): grade tidak bisa diparse.`);
      continue;
    }
    if (DRY) {
      console.log(`      (dry-run) class "${c.name}" (grade=${c.grade}) under school ${c.schoolKey}`);
      classKeyToId.set(key, `DRYRUN-${key}`);
      continue;
    }
    const { data: existing } = await supabase
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .eq('name', c.name)
      .eq('academic_year', config.DEFAULT_ACADEMIC_YEAR)
      .maybeSingle();
    if (existing) {
      classKeyToId.set(key, existing.id);
      continue;
    }
    const { data: inserted, error } = await supabase
      .from('classes')
      .insert({
        school_id: schoolId,
        name: c.name,
        grade: c.grade,
        academic_year: config.DEFAULT_ACADEMIC_YEAR,
        is_active: true,
      })
      .select('id')
      .single();
    if (error) throw error;
    classKeyToId.set(key, inserted.id);
  }

  // ---- 6. Insert students --------------------------------------------------
  console.log('[5/6] Insert students...');
  const studentKeyToId = new Map();
  const pinHash = bcrypt.hashSync(config.DEFAULT_STUDENT_PIN, 10);
  const studentEntries = [...students.entries()];
  for (const batch of chunk(studentEntries, config.BATCH_SIZE)) {
    const rows = batch.map(([key, st]) => ({
      _key: key,
      school_id: schoolKeyToId.get(st.schoolKey),
      class_id: classKeyToId.get(st.classKey) || null,
      full_name: st.namaSiswa,
      gender: st.gender,
      birth_date: st.tglLahirSiswa ? st.tglLahirSiswa.slice(0, 10) : null,
      pin_hash: pinHash,
      username: st.username,
      province: st.asalProvinsi,
      city: st.asalKabupatenKota,
      district: st.asalKecamatan,
      village: st.asalKelurahan,
      wali_pekerjaan: null,
      import_source: 'manual',
    }));

    if (DRY) {
      rows.forEach((r) => console.log(`      (dry-run) student "${r.full_name}" username=${r.username}`));
      rows.forEach((r) => studentKeyToId.set(r._key, `DRYRUN-${r._key}`));
      continue;
    }

    const insertRows = rows.map(({ _key, ...rest }) => rest);
    const { data: inserted, error } = await supabase.from('students').insert(insertRows).select('id, username');
    if (error) throw error;
    inserted.forEach((row, i) => studentKeyToId.set(rows[i]._key, row.id));
  }

  // ---- 7. Insert assessment_sessions + student_answers ---------------------
  console.log('[6/6] Insert assessment_sessions + student_answers...');
  // category_id lookup (Literasi/Numerasi -> question_categories.id via nama paket)
  let categoryNameToId = new Map();
  if (!DRY) {
    const { data: catRows, error: catErr } = await supabase.from('question_categories').select('id, name');
    if (catErr) throw catErr;
    categoryNameToId = new Map((catRows || []).map((r) => [r.name, r.id]));
  }

  let sessionCount = 0;
  let answerCount = 0;
  for (const batch of chunk(allSessions, config.BATCH_SIZE)) {
    const sessionRows = [];
    const answerRowsBySession = [];

    for (const s of batch) {
      const studentKey = `${s.organisasiUser}||${s.oldIdUser}`;
      const studentId = studentKeyToId.get(studentKey);
      const schoolKey = `${s.organisasiUser}||${s.asalSekolah}`;
      const schoolId = schoolKeyToId.get(schoolKey);
      const paketNama = config.CATEGORY_MAP[s.kategori].paketNama;
      const categoryId = categoryNameToId.get(paketNama);

      if (!DRY && (!studentId || !schoolId || !categoryId)) {
        console.log(`      !! lewati sesi (oldId=${s.oldId}): studentId/schoolId/categoryId tidak lengkap ` +
          `(student=${!!studentId}, school=${!!schoolId}, category=${!!categoryId} untuk "${paketNama}")`);
        continue;
      }

      sessionRows.push({
        _oldId: s.oldId,
        student_id: studentId,
        school_id: schoolId,
        category_id: categoryId,
        status: 'completed',
        started_at: s.mulai,
        completed_at: s.createdAt,
        score: s.scorePercent,
        time_spent_sec: s.waktuPengerjaanSec,
        attempt_number: s.attempt,
        level_id: null, // TODO: isi kalau butuh FK ke question_levels spesifik
        sync_status: 'synced',
      });

      answerRowsBySession.push(s.answers.filter((a) => a.value !== null));
    }

    if (DRY) {
      sessionCount += sessionRows.length;
      answerCount += answerRowsBySession.reduce((sum, a) => sum + a.length, 0);
      continue;
    }

    const insertRows = sessionRows.map(({ _oldId, ...rest }) => rest);
    const { data: insertedSessions, error: sessErr } = await supabase
      .from('assessment_sessions')
      .insert(insertRows)
      .select('id');
    if (sessErr) throw sessErr;

    const answerInsertRows = [];
    insertedSessions.forEach((row, i) => {
      for (const a of answerRowsBySession[i]) {
        const questionId = questionCodeToId.get(a.questionCodeBaru);
        if (!questionId) continue; // sudah di-warn di dry-run
        answerInsertRows.push({
          session_id: row.id,
          question_id: questionId,
          answer_data: { legacy_raw_value: a.value },
          is_correct: a.isCorrect,
          status: 'answered',
          sync_status: 'synced',
        });
      }
    });

    for (const answerBatch of chunk(answerInsertRows, config.BATCH_SIZE)) {
      const { error: ansErr } = await supabase.from('student_answers').insert(answerBatch);
      if (ansErr) throw ansErr;
    }

    sessionCount += insertedSessions.length;
    answerCount += answerInsertRows.length;
  }

  console.log(`\nSelesai. ${DRY ? '(dry-run, tidak ada data yang benar-benar masuk)' : ''}`);
  console.log(`  assessment_sessions: ${sessionCount}`);
  console.log(`  student_answers    : ${answerCount}`);
}

main().catch((err) => {
  console.error('\nMIGRASI GAGAL:', err.message || err);
  process.exit(1);
});
