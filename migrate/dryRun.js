/**
 * dryRun.js
 * -----------------------------------------------------------------------
 * Jalankan tanpa koneksi Supabase sama sekali. Tujuannya cuma buat
 * VALIDASI data & mapping sebelum benar-benar insert ke database.
 *
 * Usage:
 *   node dryRun.js [--input=./input] [--soal=./input/soal.xlsx]
 *
 * - Baca semua file *.xlsx di folder --input KECUALI file soal (--soal),
 *   masing-masing dianggap 1 file export ujian lama.
 * - Print ringkasan jumlah communities/schools/classes/students/sessions.
 * - Print semua warning (kunci jawaban tidak ketemu, kemungkinan
 *   duplikat siswa, sheet tidak dikenali, dll).
 * - Simpan report lengkap ke output/dry_run_report.json
 * -----------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const { buildAnswerKey } = require('./lib/answerKey');
const { parseOldExportFile } = require('./lib/parseOldExport');
const { buildEntities } = require('./lib/buildEntities');

function parseArgs() {
  const args = { input: './input', soal: './input/soal.xlsx' };
  for (const arg of process.argv.slice(2)) {
    const [k, v] = arg.replace(/^--/, '').split('=');
    if (k in args) args[k] = v;
  }
  return args;
}

function main() {
  const args = parseArgs();
  const inputDir = path.resolve(args.input);
  const soalPath = path.resolve(args.soal);

  console.log('='.repeat(70));
  console.log('DRY RUN - Migrasi Data Ujian KKN UGM -> Pemantik');
  console.log('='.repeat(70));

  // 1. Bangun kunci jawaban
  const { answerKey, skipped, dupWarnings } = buildAnswerKey(soalPath);
  console.log(`\n[1] Kunci jawaban dari ${path.basename(soalPath)}:`);
  console.log(`    Literasi: level ${Object.keys(answerKey.Literasi).sort((a, b) => a - b).join(', ')}`);
  console.log(`    Numerasi: level ${Object.keys(answerKey.Numerasi).sort((a, b) => a - b).join(', ')}`);
  console.log(`    ${skipped.length} baris soal diabaikan (draft/paket lain, mis: ${skipped.slice(0, 3).join(', ')}...)`);
  if (dupWarnings.length) {
    console.log(`    !! ${dupWarnings.length} warning duplikat kode soal:`);
    dupWarnings.forEach((w) => console.log(`       - ${w}`));
  }

  // 2. Parse semua file export lama di folder input (kecuali file soal)
  const files = fs
    .readdirSync(inputDir)
    .filter((f) => f.endsWith('.xlsx') && path.resolve(inputDir, f) !== soalPath);

  console.log(`\n[2] Ditemukan ${files.length} file export ujian lama di ${inputDir}:`);
  files.forEach((f) => console.log(`    - ${f}`));

  let allSessions = [];
  let allWarnings = [];
  for (const f of files) {
    const filePath = path.join(inputDir, f);
    const { sessions, warnings } = parseOldExportFile(filePath, answerKey, f);
    allSessions = allSessions.concat(sessions);
    allWarnings = allWarnings.concat(warnings.map((w) => `[${f}] ${w}`));
  }

  // 3. Bangun entities (communities/schools/classes/students) + dedup check
  const { communities, schools, classes, students, dedupWarnings } = buildEntities(allSessions);
  allWarnings = allWarnings.concat(dedupWarnings);

  // 4. Statistik jawaban
  let totalAnswers = 0;
  let matchedAnswers = 0;
  let correctAnswers = 0;
  let unansweredAnswers = 0;
  for (const s of allSessions) {
    for (const a of s.answers) {
      totalAnswers++;
      if (a.value === null) { unansweredAnswers++; continue; }
      if (a.questionCodeBaru) matchedAnswers++;
      if (a.isCorrect) correctAnswers++;
    }
  }

  console.log(`\n[3] Ringkasan hasil parsing:`);
  console.log(`    Sesi ujian (assessment_sessions): ${allSessions.length}`);
  console.log(`    Komunitas unik                  : ${communities.size}`);
  console.log(`    Sekolah unik                     : ${schools.size}`);
  console.log(`    Kelas unik                       : ${classes.size}`);
  console.log(`    Siswa unik                       : ${students.size}`);
  console.log(`    Total baris jawaban              : ${totalAnswers}`);
  console.log(`      - terjawab                     : ${totalAnswers - unansweredAnswers}`);
  console.log(`      - kosong (tidak dikerjakan)     : ${unansweredAnswers}`);
  console.log(`      - berhasil di-link ke question_code baru : ${matchedAnswers}`);
  console.log(`      - benar (is_correct = true)     : ${correctAnswers}`);

  console.log(`\n[4] Warning (${allWarnings.length}):`);
  allWarnings.slice(0, 30).forEach((w) => console.log(`    - ${w}`));
  if (allWarnings.length > 30) console.log(`    ... dan ${allWarnings.length - 30} warning lainnya (lihat report JSON)`);

  // 5. Simpan report lengkap
  const outDir = path.resolve('./output');
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, 'dry_run_report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        summary: {
          sessions: allSessions.length,
          communities: communities.size,
          schools: schools.size,
          classes: classes.size,
          students: students.size,
          totalAnswers,
          unansweredAnswers,
          matchedAnswers,
          correctAnswers,
        },
        warnings: allWarnings,
        communities: Object.fromEntries(communities),
        schools: Object.fromEntries(schools),
        classes: Object.fromEntries(classes),
        students: Object.fromEntries(
          [...students.entries()].map(([k, v]) => [k, { ...v, sessionKeys: v.sessionKeys.length }])
        ),
        sampleSessions: allSessions.slice(0, 5),
      },
      null,
      2
    )
  );
  console.log(`\nReport lengkap disimpan ke: ${reportPath}`);
  console.log('\nKalau semua terlihat wajar, lanjut jalankan load.js dengan --execute.');
}

main();
