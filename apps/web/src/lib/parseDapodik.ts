/**
 * parseDapodik.ts
 * =====================================================================================
 * Fungsi pure untuk mem-parsing file Excel Dapodik "Daftar Peserta Didik".
 * TIDAK ada side-effect database — murni transformasi buffer → struktur data.
 *
 * v4.1 — GLOBAL METADATA SCANNING (ANTI-FALSE-POSITIVE)
 * Membaca metadata dari seluruh sheet, dengan kecerdasan tambahan untuk
 * membedakan antara "baris profil sekolah" dan "baris judul kolom tabel siswa".
 * =====================================================================================
 */

import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedDapodikRow {
  full_name: string;
  gender: "L" | "P";

  nisn: string | null;
  nipd: string | null;
  nik: string | null;
  birth_date: string | null;
  birth_date_parse_error: boolean;
  birth_date_raw: string | null;
  agama: string | null;

  kelurahan: string | null;
  kecamatan: string | null;
  kode_pos: string | null;

  rombel: string | null;

  pendidikan_ayah: string | null;
  pekerjaan_ayah: string | null;
  pendidikan_ibu: string | null;
  pekerjaan_ibu: string | null;

  wali_nama: string | null;
  wali_nik: string | null;
  wali_pendidikan: string | null;
  wali_pekerjaan: string | null;

  raw_dapodik: Record<string, any>;
}

export interface DapodikParseResult {
  detected_school_name: string | null;
  detected_npsn: string | null;
  detected_province: string | null;
  detected_city: string | null;
  detected_district: string | null;
  detected_village: string | null;
  raw_header_text: string;

  row_count: number;
  skipped_count: number;

  rows: ParsedDapodikRow[];
  preview_rows: ParsedDapodikRow[];

  detected_classes: string[];

  detected_ses_values: {
    pendidikan: string[];
    pekerjaan: string[];
  };

  warnings: DapodikRowIssue[];
  skipped_rows: DapodikRowIssue[];

  detected_sheet_name: string;
  detected_header_row_index: number; 
  detected_header_row_count: 1 | 2;
}

interface DapodikRowIssue {
  row_number: number;
  full_name: string | null;
  field: string;
  message: string;
}

// ─── Konstanta ───────────────────────────────────────────────────────────────

const HEADER_KEYWORDS = ["nisn", "nik", "nama", "jk", "jenis kelamin", "rombel"];
const MIN_HEADER_SCORE = 2; 

const SUBHEADER_KEYWORDS = [
  "ayah", "ibu", "wali", "tahun", "jenjang", "pekerjaan",
  "penghasilan", "alamat", "kecamatan", "kelurahan", "desa", "pos",
  "l/p", "lahir",
];

const MAX_SCAN_ROWS = 20; 

const BULAN_ID: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4,
  mei: 5, juni: 6, juli: 7, agustus: 8,
  september: 9, oktober: 10, november: 11, desember: 12,
};

// ─── Helper: Date Parsing ───────────────────────────────────────────────────

function parseBirthDate(raw: any): { date: string | null; error: boolean } {
  if (raw === null || raw === undefined || raw === "") return { date: null, error: false };
  const rawStr = String(raw).trim();

  if (typeof raw === "number" && raw > 10000 && raw < 100000) {
    try {
      const jsDate = XLSX.SSF.parse_date_code(raw);
      if (jsDate) {
        const y = jsDate.y;
        const m = String(jsDate.m).padStart(2, "0");
        const d = String(jsDate.d).padStart(2, "0");
        return { date: `${y}-${m}-${d}`, error: false };
      }
    } catch {}
  }

  const isoMatch = rawStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return { date: `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, "0")}-${String(isoMatch[3]).padStart(2, "0")}`, error: false };

  const dmyMatch = rawStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) return { date: `${dmyMatch[3]}-${String(dmyMatch[2]).padStart(2, "0")}-${String(dmyMatch[1]).padStart(2, "0")}`, error: false };

  const humanMatch = rawStr.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (humanMatch) {
    const bulanNum = BULAN_ID[humanMatch[2].toLowerCase()];
    if (bulanNum) return { date: `${humanMatch[3]}-${String(bulanNum).padStart(2, "0")}-${String(humanMatch[1]).padStart(2, "0")}`, error: false };
  }

  return { date: null, error: true };
}

// ─── Helper: Normalisasi ────────────────────────────────────────────────────

function normalizeGender(raw: any): "L" | "P" | null { // <--- Ubah return-nya
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  
  // Konversi cerdas ke L / P
  if (s === "l" || s === "laki-laki" || s === "laki laki" || s === "pria") return "L";
  if (s === "p" || s === "perempuan" || s === "wanita") return "P";
  
  return null;
}

function str(val: any): string | null {
  if (val === null || val === undefined || val === "") return null;
  return String(val).trim() || null;
}

function normCell(val: any): string {
  return String(val ?? "").trim().toLowerCase();
}

// ─── Helper: Deteksi Header Dinamis ─────────────────────────────────────────

interface HeaderDetection {
  headerRowIndex: number;   
  headerRowCount: 1 | 2;
  score: number;
}

function scoreHeaderRow(row: any[]): number {
  const cells = row.map(normCell).filter(Boolean);
  let score = 0;
  for (const kw of HEADER_KEYWORDS) {
    if (cells.some((c) => c.includes(kw))) score++;
  }
  return score;
}

function looksLikeSubheader(row: any[]): boolean {
  const cells = row.map(normCell).filter(Boolean);
  if (cells.length === 0) return false;

  const hasDataIndicators = cells.some(c => 
    /\d{8,}/.test(c) || 
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(c) || 
    /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(c)
  );

  if (hasDataIndicators) return false;

  return cells.some((c) => SUBHEADER_KEYWORDS.some((kw) => c.includes(kw)));
}

function detectHeader(allRows: any[][]): HeaderDetection | null {
  let best: HeaderDetection | null = null;
  const limit = Math.min(MAX_SCAN_ROWS, allRows.length);
  
  for (let r = 0; r < limit; r++) {
    const score = scoreHeaderRow(allRows[r] ?? []);
    if (score >= MIN_HEADER_SCORE && (!best || score > best.score)) {
      const nextRow = allRows[r + 1] ?? [];
      const hasSubheader = looksLikeSubheader(nextRow);
      best = { headerRowIndex: r, headerRowCount: hasSubheader ? 2 : 1, score };
    }
  }
  return best;
}

// ─── Helper BARU: Ekstraksi Metadata Global (Lintas Sheet) ──────────────────

function extractGlobalMetadata(workbook: XLSX.WorkBook) {
  let metadata: any = {
    detected_school_name: null,
    detected_npsn: null,
    detected_province: null,
    detected_city: null,
    detected_district: null,
    detected_village: null,
  };

  const findValueInRow = (row: any[], labelRegex: RegExp) => {
    // Cari label di 10 kolom pertama
    for (let i = 0; i < Math.min(row.length, 10); i++) {
      const cell = String(row[i] || "").trim().toLowerCase();
      if (labelRegex.test(cell)) {
        // Jika label ketemu, cari nilainya di kolom sebelahnya
        for (let j = i + 1; j <= i + 3 && j < row.length; j++) {
          const val = String(row[j] || "").trim();
          if (val && val !== ":" && val !== "=") {
            // ANTI FALSE-POSITIVE: Jika val ternyata adalah nama kolom standar Dapodik, 
            // berarti ini adalah baris tabel siswa, BUKAN data profil. Tolak!
            if (/^(kode pos|kecamatan|kelurahan|desa|kabupaten|kota|provinsi|rt|rw|alamat|no|nama|nisn|nik)$/i.test(val)) {
              return null;
            }
            return val;
          }
        }
      }
    }
    return null;
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    
    // Batasi pencarian hanya 30 baris pertama untuk efisiensi
    const limit = Math.min(30, rows.length);
    for (let r = 0; r < limit; r++) {
      const row = rows[r];
      
      // PROTEKSI: Jika baris ini terdeteksi kuat sebagai Judul Tabel Anak, LEWATI!
      if (scoreHeaderRow(row) >= 2) continue;

      if (!metadata.detected_school_name) metadata.detected_school_name = findValueInRow(row, /^(nama sekolah|sekolah)$/i);
      if (!metadata.detected_npsn) metadata.detected_npsn = findValueInRow(row, /^npsn$/i);
      if (!metadata.detected_province) metadata.detected_province = findValueInRow(row, /^provinsi$/i);
      if (!metadata.detected_city) metadata.detected_city = findValueInRow(row, /^(kabupaten\/kota|kabupaten|kota|kab\.?\/kota)$/i);
      if (!metadata.detected_district) metadata.detected_district = findValueInRow(row, /^kecamatan$/i);
      if (!metadata.detected_village) metadata.detected_village = findValueInRow(row, /^(kelurahan|desa|kelurahan\/desa|desa\/kelurahan)$/i);
    }
  }
  
  return metadata;
}

// ─── Helper: Fallback Header Extraction (untuk format satu sheet) ───────────

function extractHeaderInfoFallback(
  allRows: any[][],
  headerRowIndex: number
): any {
  const rawParts: string[] = [];
  for (let r = 0; r < headerRowIndex; r++) {
    for (const cell of allRows[r] ?? []) {
      if (cell !== null && cell !== undefined && String(cell).trim() !== "") {
        rawParts.push(String(cell).trim());
      }
    }
  }
  const rawHeaderText = rawParts.join(" | ");
  
  const extractMatch = (regex: RegExp) => {
    const match = rawHeaderText.match(regex);
    return match ? match[1].trim() : null;
  };

  let schoolName = extractMatch(/(?:nama\s+sekolah|sekolah)[\s:：\|=-]+([^\|]+)/i);
  if (!schoolName) {
    const titleMatch = rawHeaderText.match(/DAFTAR PESERTA DIDIK\s*[-–]\s*([^\(\|]+)/i);
    if (titleMatch) schoolName = titleMatch[1].trim();
  }

  return {
    detected_school_name: schoolName,
    detected_npsn: extractMatch(/npsn[\s:：\|=-]+([a-zA-Z0-9]+)/i), 
    detected_province: null,
    detected_city: null,
    detected_district: null,
    detected_village: null,
    raw_header_text: rawHeaderText,
  };
}

// ─── Fungsi Utama ────────────────────────────────────────────────────────────

export function parseDapodikFile(buffer: ArrayBuffer): DapodikParseResult {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: false });

  if (workbook.SheetNames.length === 0) {
    throw new Error("File tidak memiliki sheet yang bisa dibaca.");
  }

  // 1. Ekstrak Metadata Sekolah dari seluruh workbook secara global
  const globalMetadata = extractGlobalMetadata(workbook);

  // 2. Cari sheet yang berisi data anak
  let bestSheet: { name: string; allRows: any[][]; detection: HeaderDetection } | null = null;

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const detection = detectHeader(allRows);
    if (!detection) continue;

    const isPreferredName = name.toLowerCase().includes("peserta didik") || name.toLowerCase() === "data";

    if (
      !bestSheet ||
      detection.score > bestSheet.detection.score ||
      (detection.score === bestSheet.detection.score && isPreferredName)
    ) {
      bestSheet = { name, allRows, detection };
    }
  }

  if (!bestSheet) {
    throw new Error(
      `File tidak terdeteksi sebagai format Dapodik Peserta Didik. ` +
      `Tidak ditemukan baris header yang mengandung kolom kunci (NISN, NIK, Nama, JK, Rombel) ` +
      `di ${workbook.SheetNames.length} sheet yang diperiksa.`
    );
  }

  const { allRows, detection } = bestSheet;
  const { headerRowIndex, headerRowCount } = detection;

  // 3. Fallback: Ekstrak dari teks di atas tabel
  const fallbackMetadata = extractHeaderInfoFallback(allRows, headerRowIndex);

  // Kombinasikan data, prioritaskan hasil scan global (Dapodik Asli) dibanding fallback
  const finalMetadata = {
    detected_school_name: globalMetadata.detected_school_name || fallbackMetadata.detected_school_name,
    detected_npsn: globalMetadata.detected_npsn || fallbackMetadata.detected_npsn,
    detected_province: globalMetadata.detected_province,
    detected_city: globalMetadata.detected_city,
    detected_district: globalMetadata.detected_district,
    detected_village: globalMetadata.detected_village,
    raw_header_text: fallbackMetadata.raw_header_text,
  };

  const headerRow1: string[] = (allRows[headerRowIndex] ?? []).map((v) => String(v ?? "").trim());
  const headerRow2: string[] = headerRowCount === 2 ? (allRows[headerRowIndex + 1] ?? []).map((v) => String(v ?? "").trim()) : [];

  const maxCols = Math.max(headerRow1.length, headerRow2.length);
  const flatHeaders: string[] = [];
  for (let i = 0; i < maxCols; i++) {
    const h1 = headerRow1[i] ?? "";
    const h2 = headerRow2[i] ?? "";
    flatHeaders.push(h1 && h2 ? `${h1} ${h2}`.trim() : (h1 || h2).trim());
  }

  const dataStartIndex = headerRowIndex + headerRowCount;
  const dataRows = allRows
    .slice(dataStartIndex)
    .filter((row) => row.some((cell: any) => cell !== "" && cell !== null && cell !== undefined));

  const headerIndex: Record<string, number> = {};
  flatHeaders.forEach((h, i) => {
    if (!h) return; 
    const key = h.toLowerCase().replace(/\s+/g, "_");
    headerIndex[key] = i;
  });

  function getCol(row: any[], ...candidates: string[]): any {
    for (const candidate of candidates) {
      const key = candidate.toLowerCase().replace(/\s+/g, "_");
      if (headerIndex[key] !== undefined) return row[headerIndex[key]];
      const found = Object.keys(headerIndex).find((k) => k.includes(key) || key.includes(k));
      if (found !== undefined) return row[headerIndex[found]];
    }
    return null;
  }

  const rows: ParsedDapodikRow[] = [];
  const skipped_rows: DapodikRowIssue[] = [];
  const warnings: DapodikRowIssue[] = [];

  const uniqueClasses = new Set<string>();
  const uniquePendidikan = new Set<string>();
  const uniquePekerjaan = new Set<string>();

  dataRows.forEach((row, idx) => {
    const rowNum = dataStartIndex + idx + 1; 

    const rawName = str(getCol(row, "nama", "nama_siswa", "nama_lengkap"));
    const rawGender = getCol(row, "jk", "jenis_kelamin", "gender", "l/p");
    const gender = normalizeGender(rawGender);

    const skip_reasons: string[] = [];
    if (!rawName) skip_reasons.push("nama kosong");
    if (!gender) skip_reasons.push(`jenis_kelamin tidak valid ("${rawGender ?? ""}")`);

    if (skip_reasons.length > 0) {
      skipped_rows.push({
        row_number: rowNum,
        full_name: rawName,
        field: skip_reasons.map((r) => r.split(" ")[0]).join(", "),
        message: `Baris dilewati — field wajib bermasalah: ${skip_reasons.join("; ")}`,
      });
      return;
    }

    const nisn = str(getCol(row, "nisn"));
    const nipd = str(getCol(row, "nipd", "nomor_induk_peserta_didik"));
    const nik = str(getCol(row, "nik", "nik_siswa"));
    const rombel = str(getCol(row, "rombel_saat_ini", "rombel", "kelas"));
    const agama = str(getCol(row, "agama"));
    const kelurahan = str(getCol(row, "kelurahan", "desa_kelurahan"));
    const kecamatan = str(getCol(row, "kecamatan"));
    const kode_pos = str(getCol(row, "kode_pos", "kodepos"));

    const rawBirthDate = getCol(row, "tanggal_lahir", "tgl_lahir", "tempat_tanggal_lahir");
    const { date: birth_date, error: birth_date_parse_error } = parseBirthDate(rawBirthDate);

    if (birth_date_parse_error) {
      warnings.push({
        row_number: rowNum,
        full_name: rawName,
        field: "tanggal_lahir",
        message: `Tanggal lahir "${rawBirthDate}" tidak dapat di-parse.`,
      });
    }

    const pendidikan_ayah = str(getCol(row, "pendidikan_ayah", "jenjang_pendidikan_ayah"));
    const pekerjaan_ayah = str(getCol(row, "pekerjaan_ayah"));
    const pendidikan_ibu = str(getCol(row, "pendidikan_ibu", "jenjang_pendidikan_ibu"));
    const pekerjaan_ibu = str(getCol(row, "pekerjaan_ibu"));

    const wali_nama = str(getCol(row, "nama_wali", "wali_nama"));
    const wali_nik = str(getCol(row, "nik_wali", "wali_nik"));
    const wali_pendidikan = str(getCol(row, "pendidikan_wali", "wali_pendidikan"));
    const wali_pekerjaan = str(getCol(row, "pekerjaan_wali", "wali_pekerjaan"));

    if (!rombel) {
      warnings.push({
        row_number: rowNum,
        full_name: rawName,
        field: "rombel",
        message: `Rombel kosong — siswa akan diimport tanpa kelas (class_id = null).`,
      });
    }
    
    if (rombel) uniqueClasses.add(rombel);
    [pendidikan_ayah, pendidikan_ibu, wali_pendidikan].filter(Boolean).forEach((v) => uniquePendidikan.add(v!));
    [pekerjaan_ayah, pekerjaan_ibu, wali_pekerjaan].filter(Boolean).forEach((v) => uniquePekerjaan.add(v!));

    const raw_dapodik: Record<string, any> = {};
    flatHeaders.forEach((h, i) => {
      if (h) raw_dapodik[h] = row[i] ?? null;
    });

    rows.push({
      full_name: rawName!,
      gender: gender!,
      nisn, nipd, nik,
      birth_date, birth_date_parse_error,
      birth_date_raw: rawBirthDate != null ? String(rawBirthDate) : null,
      agama, kelurahan, kecamatan, kode_pos, rombel,
      pendidikan_ayah, pekerjaan_ayah, pendidikan_ibu, pekerjaan_ibu,
      wali_nama, wali_nik, wali_pendidikan, wali_pekerjaan,
      raw_dapodik,
    });
  });

  return {
    ...finalMetadata,
    row_count: rows.length,
    skipped_count: skipped_rows.length,
    rows,
    preview_rows: rows.slice(0, 10),
    detected_classes: Array.from(uniqueClasses).sort(),
    detected_ses_values: {
      pendidikan: Array.from(uniquePendidikan).sort(),
      pekerjaan: Array.from(uniquePekerjaan).sort(),
    },
    warnings,
    skipped_rows,
    detected_sheet_name: bestSheet.name,
    detected_header_row_index: headerRowIndex,
    detected_header_row_count: headerRowCount,
  };
}