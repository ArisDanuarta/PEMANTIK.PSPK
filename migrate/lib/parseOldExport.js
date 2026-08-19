/**
 * lib/parseOldExport.js
 * -----------------------------------------------------------------------
 * Baca 1 file export platform lama (14 sheet: Literasi/Numerasi Level 0-N)
 * dan hasilkan array "session" ternormalisasi + hitung is_correct per
 * jawaban pakai answerKey dari soal.xlsx.
 *
 * Bisa dipanggil berkali-kali untuk banyak file (1 file per komunitas,
 * sesuai dugaan kita soal 25rb baris tersebar di banyak file serupa).
 * -----------------------------------------------------------------------
 */

const XLSX = require('xlsx');
const path = require('path');

// "Literasi Level 0" / "Literasi_Level_4" / "Numerasi Level 0" -> {kategori, level}
function parseSheetName(sheetName) {
  const m = sheetName.match(/^(Literasi|Numerasi)[_ ]Level[_ ](\d+)$/i);
  if (!m) return null;
  return { kategori: m[1], level: parseInt(m[2], 10) };
}

function parseIndonesianDate(str) {
  // "29 Jul 2026 06:21:28" atau "24 Apr 2018"
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseDurationToSeconds(str) {
  // "10 Menit" -> 600
  if (!str) return null;
  const m = str.toString().match(/(\d+)\s*Menit/i);
  return m ? parseInt(m[1], 10) * 60 : null;
}

function parseGradeFromKelas(kelasStr) {
  // "Kelas 2" -> 2
  if (!kelasStr) return null;
  const m = kelasStr.toString().match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * @param {string} filePath - path ke file export lama
 * @param {object} answerKey - hasil dari buildAnswerKey() di answerKey.js
 * @param {string} sourceLabel - label sumber file (buat tracing/debug)
 */
function parseOldExportFile(filePath, answerKey, sourceLabel) {
  const wb = XLSX.readFile(filePath);
  const sessions = [];
  const warnings = [];

  for (const sheetName of wb.SheetNames) {
    const parsed = parseSheetName(sheetName);
    if (!parsed) {
      warnings.push(`Sheet "${sheetName}" tidak match pola nama, dilewati.`);
      continue;
    }
    const { kategori, level } = parsed;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

    // Cari jumlah kolom "Answer N" yang ada di sheet ini
    const answerCols = Object.keys(rows[0] || {}).filter((k) => /^Answer \d+$/.test(k));
    const answerCount = answerCols.length;

    const levelKey = answerKey[kategori] && answerKey[kategori][level];
    if (!levelKey) {
      warnings.push(`Tidak ada kunci jawaban untuk ${kategori} Level ${level} (sheet "${sheetName}"), is_correct akan null.`);
    }

    for (const row of rows) {
      const rawAnswers = [];
      for (let i = 1; i <= answerCount; i++) {
        rawAnswers.push(row[`Answer ${i}`] ?? null);
      }

      const answerDetails = rawAnswers.map((val, idx) => {
        const pos = idx + 1;
        const key = levelKey && levelKey[pos];
        if (val === null) return { position: pos, value: null, isCorrect: null, questionCodeBaru: key ? key.kodeBaru : null };
        if (!key) return { position: pos, value: val, isCorrect: null, questionCodeBaru: null };
        return {
          position: pos,
          value: val,
          isCorrect: val === key.kunciJawaban,
          questionCodeBaru: key.kodeBaru,
        };
      });

      const answeredCount = answerDetails.filter((a) => a.value !== null).length;
      const correctCount = answerDetails.filter((a) => a.isCorrect === true).length;

      sessions.push({
        source: sourceLabel,
        sheetName,
        oldId: row.id,
        oldIdUser: row.id_user,
        kategori,
        level, // sudah dinormalisasi (level 0 sheet -> 0, bukan null)
        attempt: row.attempt || 1,
        namaSiswa: (row.nama_siswa || '').toString().trim(),
        gender: row.gender === 'Laki-laki' ? 'L' : row.gender === 'Perempuan' ? 'P' : null,
        kelasRaw: row.kelas,
        grade: parseGradeFromKelas(row.kelas),
        umurSiswa: row.umur_siswa,
        tglLahirSiswa: parseIndonesianDate(row.tgl_lahir_siswa),
        asalProvinsi: row.asal_provinsi,
        asalKabupatenKota: row.asal_kabupaten_kota,
        asalKecamatan: row.asal_kecamatan,
        asalKelurahan: row.asal_kelurahan,
        pekerjaanAyah: row.pekerjaan_ayah,
        pekerjaanIbu: row.pekerjaan_ibu,
        pendidikanAyah: row.pendidikan_ayah,
        pendidikanIbu: row.pendidikan_ibu,
        ses: row.SES,
        asalSekolah: (row.asal_sekolah || '').toString().trim(),
        organisasiUser: (row.organisasi_user || '').toString().trim(),
        createdAt: parseIndonesianDate(row.created_at),
        mulai: parseIndonesianDate(row.Mulai),
        waktuPengerjaanSec: parseDurationToSeconds(row.Pengerjaan || row.Waktu),
        answers: answerDetails,
        answeredCount,
        totalQuestions: answerCount,
        correctCount,
        scorePercent: answerCount > 0 ? Math.round((correctCount / answerCount) * 100) : null,
      });
    }
  }

  return { sessions, warnings };
}

module.exports = { parseOldExportFile, parseSheetName };
