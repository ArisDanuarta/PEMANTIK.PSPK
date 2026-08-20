/**
 * dataMigrationUtils.ts
 *
 * Fungsi utilitas SINKRON untuk fitur migrasi data.
 * File ini TIDAK memiliki "use server" sehingga bisa diimpor dari komponen klien.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExcelRow {
  [key: string]: any;
}

export interface MigrationMaps {
  communityMap: Record<string, string>;
  schoolMap: Record<string, string>;
  classMap: Record<string, string>;
  questionCodeMap: Record<string, { id: string; level_id: string; subject_area: string }>;
  sesVarMap: Record<string, string>;
  categoryMap: Record<string, string>;
}

export interface ValidationResult {
  totalRows: number;
  validRows: number;
  errors: Array<{ row: number; field: string; message: string }>;
  warnings: Array<{ row: number; field: string; message: string }>;
  detectedColumns: Record<string, string | null>;
  answerColumns: string[];
  summary: {
    uniqueCommunities: string[];
    uniqueSchools: Array<{ name: string; npsn?: string }>;
    unknownSES: string[];
    totalAnswerCols: number;
    invalidAnswerCols: string[];
    longFormatStats?: {
      validAnswers: number;
      uniqueQuestionCodes: string[];
      totalStudents: number;
    };
  };
}

export interface BatchResult {
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  sessionIds: string[];
}

export interface PrepareResult {
  success: boolean;
  maps?: MigrationMaps;
  credentials?: Array<{ type: string; name: string; username: string; password: string }>;
  error?: string;
}

// ─── Column Alias Map ─────────────────────────────────────────────────────────

const COLUMN_ALIASES: Record<string, string[]> = {
  nama_siswa: ["nama_siswa", "nama siswa", "nama lengkap", "nama", "student_name", "Nama Siswa"],
  nisn: ["nisn", "NISN", "no_nisn", "no nisn"],
  tanggal_lahir: ["tanggal_lahir", "tgl_lahir", "tgl_lahir_siswa", "tanggal lahir", "birth_date", "tgl lahir"],
  jenis_kelamin: ["jenis_kelamin", "jk", "gender", "kelamin", "sex"],
  nama_sekolah: ["nama_sekolah", "nama sekolah", "sekolah", "school_name", "asal_sekolah", "asal sekolah"],

  npsn: ["npsn", "NPSN", "kode_sekolah"],
  kelas: ["kelas", "nama_kelas", "class", "kelas_name"],
  nama_komunitas: ["nama_komunitas", "komunitas", "community", "mitra", "lembaga", "organisasi_user"],
  pendidikan_ayah: ["pendidikan_ayah", "pend_ayah", "pendidikan ayah", "educ_father"],
  pekerjaan_ayah: ["pekerjaan_ayah", "pek_ayah", "pekerjaan ayah", "occ_father"],
  pendidikan_ibu: ["pendidikan_ibu", "pend_ibu", "pendidikan ibu", "educ_mother"],
  pekerjaan_ibu: ["pekerjaan_ibu", "pek_ibu", "pekerjaan ibu", "occ_mother"],
  ses_class: ["ses_class", "ses", "SES", "kelas_ses", "kelas ses"],
  province: ["province", "provinsi", "prov", "asal_provinsi"],
  city: ["city", "kota", "kabupaten", "kab", "asal_kabupaten_kota"],
  district: ["district", "kecamatan", "asal_kecamatan"],
  village: ["village", "desa", "kelurahan", "asal_kelurahan"],
};

// ─── detectColumnMap ──────────────────────────────────────────────────────────

export function detectColumnMap(headers: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const found = headers.find((h) =>
      aliases.some((a) => a.toLowerCase() === (h || "").toLowerCase().trim())
    );
    result[field] = found || null;
  }
  return result;
}

// ─── detectAnswerColumns (wide format: LIT-0-1, NUM-1-2) ─────────────────────

export function detectAnswerColumns(headers: string[]): string[] {
  return headers.filter((h) => /^(LIT|NUM)-\d+-\d+$/i.test((h || "").trim()));
}

// ─── detectLongFormat ─────────────────────────────────────────────────────────

/**
 * Deteksi apakah Excel format LONG (1 baris = 1 jawaban) atau WIDE (1 baris = 1 siswa).
 * Format LONG: ada kolom kolom_data, atau ada id_user + benar + mapel.
 */
export function detectLongFormat(headers: string[]): boolean {
  const lower = headers.map((h) => (h || "").toLowerCase().trim());
  return (
    lower.includes("kolom_data") ||
    (lower.includes("id_user") && lower.includes("benar") && lower.includes("mapel"))
  );
}

/**
 * Konversi kolom_data format lama ke question_code database baru.
 * L0_I1 → LIT-0-1
 * N2_I3 → NUM-2-3
 */
export function kolomDataToQuestionCode(kolomData: string): string | null {
  if (!kolomData) return null;
  const str = kolomData.trim().toUpperCase();
  
  // Format baru: langsung pakai jika sudah valid (misal: LIT-0-1, NUM-2-3)
  if (str.startsWith("LIT-") || str.startsWith("NUM-")) return str;

  // Format lama: L{level}_I{item} → LIT-{level}-{item}
  const litMatch = str.match(/^L(\d+)_I(\d+)$/);
  if (litMatch) return `LIT-${litMatch[1]}-${litMatch[2]}`;
  
  // Format lama: N{level}_I{item} → NUM-{level}-{item}
  const numMatch = str.match(/^N(\d+)_I(\d+)$/);
  if (numMatch) return `NUM-${numMatch[1]}-${numMatch[2]}`;
  
  return null;
}
