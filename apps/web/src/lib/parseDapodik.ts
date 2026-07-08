/**
 * parseDapodik.ts
 * =====================================================================================
 * Fungsi pure untuk mem-parsing file Excel Dapodik "Daftar Peserta Didik".
 * TIDAK ada side-effect database — murni transformasi buffer → struktur data.
 *
 * Keputusan desain:
 * - Multi-format date parsing (Q1)
 * - Field wajib: nama + jenis_kelamin. Opsional: sisanya (Q2)
 * - Formula SES wali sebagai fallback slot individual (Q3)
 * - Abaikan kolom index 58-59 (0-based) sesuai spec
 * - Validasi kolom kunci sebelum parsing (D3)
 * =====================================================================================
 */

import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedDapodikRow {
  // Field wajib
  full_name: string;
  gender: "laki-laki" | "perempuan";

  // Field opsional — bisa null
  nisn: string | null;
  nipd: string | null;
  nik: string | null;
  birth_date: string | null;          // ISO: "YYYY-MM-DD" atau null jika gagal parse
  birth_date_parse_error: boolean;
  birth_date_raw: string | null;      // Nilai asli dari file sebelum diparsing
  agama: string | null;

  // Wilayah
  kelurahan: string | null;           // → students.village
  kecamatan: string | null;           // → students.district
  kode_pos: string | null;

  // Kelas
  rombel: string | null;              // Nama rombel dari Dapodik → akan jadi class_id

  // SES — orang tua
  pendidikan_ayah: string | null;
  pekerjaan_ayah: string | null;
  pendidikan_ibu: string | null;
  pekerjaan_ibu: string | null;

  // SES — wali (fallback jika ayah/ibu kosong per Q3)
  wali_nama: string | null;
  wali_nik: string | null;
  wali_pendidikan: string | null;
  wali_pekerjaan: string | null;

  // Arsip mentah seluruh baris (60 kolom, kecuali kolom 59-60 yang diabaikan)
  raw_dapodik: Record<string, any>;
}

export interface DapodikParseResult {
  // Info dari header file (baris 2-3)
  detected_school_name: string | null;
  detected_region_text: string | null;
  raw_header_text: string;

  // Summary
  row_count: number;          // Total baris data valid (sudah di-skip yang wajib kosong)
  skipped_count: number;      // Baris yang di-skip (field wajib kosong)

  // Data siswa yang berhasil diparsing
  rows: ParsedDapodikRow[];

  // Preview untuk form konfirmasi
  preview_rows: ParsedDapodikRow[]; // 10 baris pertama

  // Kelas unik yang terdeteksi dari kolom Rombel
  detected_classes: string[];

  // Nilai SES unik yang ditemukan — untuk cek vs ses_variables di server
  detected_ses_values: {
    pendidikan: string[];
    pekerjaan: string[];
  };

  // Laporan per baris
  warnings: DapodikRowIssue[];   // Field opsional kosong — baris tetap diimport
  skipped_rows: DapodikRowIssue[]; // Field wajib kosong — baris di-skip
}

interface DapodikRowIssue {
  row_number: number;   // Nomor baris di file (1-based, offset dari row data)
  full_name: string | null;
  field: string;
  message: string;
}

// ─── Konstanta ───────────────────────────────────────────────────────────────

/** Kolom kunci minimal yang wajib ada untuk validasi format file Dapodik */
const REQUIRED_HEADER_KEYWORDS = ["NISN", "NIK", "Rombel"];

/** Nama bulan Indonesia untuk parsing tanggal manusiawi */
const BULAN_ID: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4,
  mei: 5, juni: 6, juli: 7, agustus: 8,
  september: 9, oktober: 10, november: 11, desember: 12,
};

// ─── Helper: Date Parsing ────────────────────────────────────────────────────

/**
 * Coba parse tanggal dari berbagai format (Q1).
 * Return format ISO "YYYY-MM-DD" atau null jika semua format gagal.
 */
function parseBirthDate(raw: any): { date: string | null; error: boolean } {
  if (raw === null || raw === undefined || raw === "") {
    return { date: null, error: false }; // Kosong = opsional, bukan parse error
  }

  const rawStr = String(raw).trim();

  // 1. Serial number Excel (angka)
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

  // 2. DD-MM-YYYY atau DD/MM/YYYY
  const dmyMatch = rawStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) {
      return {
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        error: false,
      };
    }
  }

  // 3. YYYY-MM-DD
  const isoMatch = rawStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) {
      return {
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        error: false,
      };
    }
  }

  // 4. String manusiawi: "12 Januari 2010" atau "12 Jan 2010"
  const humanMatch = rawStr.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (humanMatch) {
    const [, d, bulanStr, y] = humanMatch;
    const bulanNum = BULAN_ID[bulanStr.toLowerCase()];
    if (bulanNum) {
      return {
        date: `${y}-${String(bulanNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        error: false,
      };
    }
  }

  // Semua format gagal → flag error, baris tetap diimport
  return { date: null, error: true };
}

// ─── Helper: Normalisasi ────────────────────────────────────────────────────

function normalizeGender(raw: any): "laki-laki" | "perempuan" | null {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === "l" || s === "laki-laki" || s === "laki laki" || s === "pria") return "laki-laki";
  if (s === "p" || s === "perempuan" || s === "wanita") return "perempuan";
  return null;
}

function str(val: any): string | null {
  if (val === null || val === undefined || val === "") return null;
  return String(val).trim() || null;
}

// ─── Helper: Header Parsing ──────────────────────────────────────────────────

/**
 * Baca baris 2-3 file untuk ekstrak nama sekolah & wilayah.
 * Format umum Dapodik: "Nama Sekolah : SDN 01 CONTOH"
 */
function extractHeaderInfo(sheet: XLSX.WorkSheet): {
  detected_school_name: string | null;
  detected_region_text: string | null;
  raw_header_text: string;
} {
  const rawParts: string[] = [];

  // Baca baris 1-4 (0-indexed rows 0-3) untuk mencari info header
  for (let r = 0; r <= 3; r++) {
    for (let c = 0; c <= 5; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddr];
      if (cell?.v) rawParts.push(String(cell.v).trim());
    }
  }

  const rawHeaderText = rawParts.join(" | ");

  // Coba ekstrak nama sekolah
  let detected_school_name: string | null = null;
  const schoolMatch = rawHeaderText.match(
    /(?:nama\s+sekolah|sekolah)\s*[:：]\s*([^\|]+)/i
  );
  if (schoolMatch) {
    detected_school_name = schoolMatch[1].trim() || null;
  }

  // Coba ekstrak teks wilayah (kota/kab/provinsi)
  let detected_region_text: string | null = null;
  const regionMatch = rawHeaderText.match(
    /(?:kab\.?\/kota|kabupaten|kota|provinsi)\s*[:：]\s*([^\|]+)/i
  );
  if (regionMatch) {
    detected_region_text = regionMatch[1].trim() || null;
  }

  return { detected_school_name, detected_region_text, raw_header_text: rawHeaderText };
}

// ─── Fungsi Utama ────────────────────────────────────────────────────────────

/**
 * Parse file Dapodik "Daftar Peserta Didik" dari ArrayBuffer.
 *
 * @throws Error jika file tidak sesuai format Dapodik (D3)
 */
export function parseDapodikFile(buffer: ArrayBuffer): DapodikParseResult {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: false });

  // ── 1. Resolve target sheet ──────────────────────────────────────────────
  let sheetName =
    workbook.SheetNames.find(
      (n) => n.toLowerCase().includes("peserta didik") || n.toLowerCase() === "data"
    ) ?? workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("File tidak memiliki sheet yang bisa dibaca.");
  }

  // ── 2. Validasi format file (D3) ─────────────────────────────────────────
  // Ambil semua nilai teks dari baris 5-6 (0-indexed: 4-5) untuk cek header
  const headerCells: string[] = [];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");

  for (let r = 4; r <= Math.min(6, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell?.v) headerCells.push(String(cell.v).trim().toLowerCase());
    }
  }

  const headerStr = headerCells.join(" ");
  const missingKeywords = REQUIRED_HEADER_KEYWORDS.filter(
    (kw) => !headerStr.includes(kw.toLowerCase())
  );

  if (missingKeywords.length > 0) {
    throw new Error(
      `File tidak terdeteksi sebagai format Dapodik Peserta Didik. ` +
      `Kolom kunci tidak ditemukan: ${missingKeywords.join(", ")}. ` +
      `Pastikan file menggunakan sheet "Daftar Peserta Didik" dengan format resmi Dapodik.`
    );
  }

  // ── 3. Ekstrak info header (baris 2-3) ────────────────────────────────────
  const headerInfo = extractHeaderInfo(sheet);

  // ── 4. Baca data sebagai array of arrays (rawRows), mulai baris 5+ ───────
  // XLSX.utils.sheet_to_json dengan header:1 memberikan array of arrays
  // Kita perlu merge dua baris header (baris 5-6 di file = index 4-5)
  const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // Baris 5 (index 4) dan 6 (index 5) adalah header dua baris
  // Gabung jadi satu header flat
  const headerRow1: string[] = (allRows[4] ?? []).map((v: any) => String(v ?? "").trim());
  const headerRow2: string[] = (allRows[5] ?? []).map((v: any) => String(v ?? "").trim());

  const flatHeaders: string[] = headerRow1.map((h1, i) => {
    const h2 = headerRow2[i] ?? "";
    if (h1 && h2) return `${h1} ${h2}`.trim();
    return (h1 || h2).trim();
  });

  // Data dimulai dari baris index 6 (baris ke-7 di file)
  const dataRows = allRows.slice(6).filter((row) =>
    row.some((cell: any) => cell !== "" && cell !== null && cell !== undefined)
  );

  // ── 5. Mapping kolom ke nama yang bisa dikenali ──────────────────────────
  // Buat map dari nama header (lowercase) ke index kolom
  const headerIndex: Record<string, number> = {};
  flatHeaders.forEach((h, i) => {
    if (i >= 58) return; // Abaikan kolom 59-60 (index 58-59)
    const key = h.toLowerCase().replace(/\s+/g, "_");
    headerIndex[key] = i;
  });

  // Helper: ambil nilai kolom berdasarkan nama header (fuzzy match)
  function getCol(row: any[], ...candidates: string[]): any {
    for (const candidate of candidates) {
      const key = candidate.toLowerCase().replace(/\s+/g, "_");
      // Exact match dulu
      if (headerIndex[key] !== undefined) return row[headerIndex[key]];
      // Partial match
      const found = Object.keys(headerIndex).find(
        (k) => k.includes(key) || key.includes(k)
      );
      if (found !== undefined) return row[headerIndex[found]];
    }
    return null;
  }

  // ── 6. Parse setiap baris data ───────────────────────────────────────────
  const rows: ParsedDapodikRow[] = [];
  const skipped_rows: DapodikRowIssue[] = [];
  const warnings: DapodikRowIssue[] = [];

  const uniqueClasses = new Set<string>();
  const uniquePendidikan = new Set<string>();
  const uniquePekerjaan = new Set<string>();

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 7; // Nomor baris di file (1-based, data mulai baris 7)

    const rawName = str(getCol(row, "nama", "nama_siswa", "nama lengkap"));
    const rawGender = getCol(row, "jk", "jenis_kelamin", "gender", "l/p");
    const gender = normalizeGender(rawGender);

    // ── Validasi field wajib (Q2) ──
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

    // ── Field opsional ──
    const nisn = str(getCol(row, "nisn"));
    const nipd = str(getCol(row, "nipd", "nomor_induk_peserta_didik"));
    const nik = str(getCol(row, "nik", "nik_siswa"));
    const rombel = str(getCol(row, "rombel_saat_ini", "rombel", "kelas"));
    const agama = str(getCol(row, "agama"));
    const kelurahan = str(getCol(row, "kelurahan", "desa_kelurahan"));
    const kecamatan = str(getCol(row, "kecamatan"));
    const kode_pos = str(getCol(row, "kode_pos", "kodepos"));

    // ── Tanggal lahir ──
    const rawBirthDate = getCol(row, "tanggal_lahir", "tgl_lahir", "tempat_tanggal_lahir");
    const { date: birth_date, error: birth_date_parse_error } = parseBirthDate(rawBirthDate);

    if (birth_date_parse_error) {
      warnings.push({
        row_number: rowNum,
        full_name: rawName,
        field: "tanggal_lahir",
        message: `Tanggal lahir "${rawBirthDate}" tidak dapat di-parse — akan disimpan null.`,
      });
    }

    // ── SES data ──
    const pendidikan_ayah = str(getCol(row, "pendidikan_ayah", "jenjang_pendidikan_ayah"));
    const pekerjaan_ayah = str(getCol(row, "pekerjaan_ayah"));
    const pendidikan_ibu = str(getCol(row, "pendidikan_ibu", "jenjang_pendidikan_ibu"));
    const pekerjaan_ibu = str(getCol(row, "pekerjaan_ibu"));

    // Wali
    const wali_nama = str(getCol(row, "nama_wali", "wali_nama"));
    const wali_nik = str(getCol(row, "nik_wali", "wali_nik"));
    const wali_pendidikan = str(getCol(row, "pendidikan_wali", "wali_pendidikan"));
    const wali_pekerjaan = str(getCol(row, "pekerjaan_wali", "wali_pekerjaan"));

    // ── Warning field opsional kosong ──
    if (!rombel) {
      warnings.push({
        row_number: rowNum,
        full_name: rawName,
        field: "rombel",
        message: `Rombel kosong — siswa akan diimport tanpa kelas (class_id = null).`,
      });
    }
    if (!nisn && !nipd) {
      warnings.push({
        row_number: rowNum,
        full_name: rawName,
        field: "nisn/nipd",
        message: `NISN dan NIPD keduanya kosong — tidak bisa cek duplikat, baris akan selalu di-INSERT.`,
      });
    }

    // ── Kumpulkan nilai unik untuk SES & kelas ──
    if (rombel) uniqueClasses.add(rombel);
    [pendidikan_ayah, pendidikan_ibu, wali_pendidikan]
      .filter(Boolean)
      .forEach((v) => uniquePendidikan.add(v!));
    [pekerjaan_ayah, pekerjaan_ibu, wali_pekerjaan]
      .filter(Boolean)
      .forEach((v) => uniquePekerjaan.add(v!));

    // ── Raw arsip (60 kolom kecuali 59-60) ──
    const raw_dapodik: Record<string, any> = {};
    flatHeaders.forEach((h, i) => {
      if (i < 58 && h) raw_dapodik[h] = row[i] ?? null;
    });

    rows.push({
      full_name: rawName!,
      gender: gender!,
      nisn,
      nipd,
      nik,
      birth_date,
      birth_date_parse_error,
      birth_date_raw: rawBirthDate != null ? String(rawBirthDate) : null,
      agama,
      kelurahan,
      kecamatan,
      kode_pos,
      rombel,
      pendidikan_ayah,
      pekerjaan_ayah,
      pendidikan_ibu,
      pekerjaan_ibu,
      wali_nama,
      wali_nik,
      wali_pendidikan,
      wali_pekerjaan,
      raw_dapodik,
    });
  });

  // ── 7. Return hasil ──────────────────────────────────────────────────────
  return {
    ...headerInfo,
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
  };
}
