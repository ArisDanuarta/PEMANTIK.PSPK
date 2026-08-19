/**
 * lib/answerKey.js
 * -----------------------------------------------------------------------
 * Parse soal.xlsx (bank soal platform lama) jadi lookup table:
 *
 *   answerKey["Literasi"][level][positionIndex] = {
 *     kodeLama: 'Literasi_3_1',
 *     kodeBaru: 'LIT-3-1',           // dipakai buat lookup question_id
 *     kunciJawaban: 'opsi-2',
 *   }
 *
 * Literasi: urutan diambil dari angka di belakang kode
 *           (Literasi_3_1..5 lalu Literasi_3.6..10, digabung & diurutkan).
 * Numerasi: urutan diambil dari NUMERASI_TOPIC_ORDER di config.js
 *           (Numerasi_Bilangan_Operasi_{level} = posisi 1, dst).
 *
 * Baris dengan kode yang tidak match pola Literasi_N_M / Literasi_N.M /
 * Numerasi_{Topik}_N (misal Lit2024_*, Num2024_*, coba_soal_*, Tes-1)
 * DIABAIKAN karena itu draft/paket lain, bukan bagian dari paket yang
 * dipakai di export ujian KKN UGM.
 * -----------------------------------------------------------------------
 */

const XLSX = require('xlsx');
const config = require('../config');

const LITERASI_RE = /^Literasi[_.](\d+)[_.](\d+)$/;
const NUMERASI_RE = /^Numerasi_(Bilangan_Operasi|Aljabar|Geometri|Pengukuran|Data_Peluang)_(\d+)$/;

function buildAnswerKey(soalXlsxPath) {
  const wb = XLSX.readFile(soalXlsxPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

  const answerKey = { Literasi: {}, Numerasi: {} };
  const skipped = [];
  const dupWarnings = [];

  for (const row of rows) {
    const kode = (row.kode_soal || '').toString().trim();
    const kunci = row.kunci_jawaban;
    if (!kode || !kunci) continue;

    const litMatch = kode.match(LITERASI_RE);
    if (litMatch) {
      const level = parseInt(litMatch[1], 10);
      const posInLevel = parseInt(litMatch[2], 10); // 1-based, but may come
      // from either the "_N" (1-5) or ".N" (6-10) group; we just use it as
      // the final sort key directly since both groups continue 1..10.
      answerKey.Literasi[level] = answerKey.Literasi[level] || {};
      if (answerKey.Literasi[level][posInLevel]) {
        dupWarnings.push(`Literasi level ${level} posisi ${posInLevel} duplikat (kode: ${kode})`);
      }
      answerKey.Literasi[level][posInLevel] = {
        kodeLama: kode,
        kodeBaru: `LIT-${level}-${posInLevel}`,
        kunciJawaban: kunci,
      };
      continue;
    }

    const numMatch = kode.match(NUMERASI_RE);
    if (numMatch) {
      const topik = numMatch[1];
      const level = parseInt(numMatch[2], 10);
      const posInLevel = config.NUMERASI_TOPIC_ORDER.indexOf(topik) + 1; // 1-based
      if (posInLevel === 0) continue; // topik tidak dikenal, skip
      answerKey.Numerasi[level] = answerKey.Numerasi[level] || {};
      if (answerKey.Numerasi[level][posInLevel]) {
        dupWarnings.push(`Numerasi level ${level} posisi ${posInLevel} duplikat (kode: ${kode})`);
      }
      answerKey.Numerasi[level][posInLevel] = {
        kodeLama: kode,
        kodeBaru: `NUM-${level}-${posInLevel}`,
        kunciJawaban: kunci,
      };
      continue;
    }

    // Tidak match pola manapun -> draft/paket lain, diabaikan.
    skipped.push(kode);
  }

  return { answerKey, skipped, dupWarnings };
}

module.exports = { buildAnswerKey };
