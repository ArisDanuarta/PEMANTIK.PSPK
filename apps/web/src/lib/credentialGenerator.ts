/**
 * credentialGenerator.ts
 *
 * Pustaka terpusat untuk menghasilkan username dan password/PIN
 * secara cerdas dan kontekstual untuk setiap role.
 */

const SYMBOLS = ["!", "@", "#", "$", "&"];
const BALINESE_TITLES = new Set([
  "i", "ni", "ida", "aa", "anak", "agung", "tjokorda", "cokorda",
  "dewa", "desak", "gusti", "ngakan", "bagus", "ayu",
  "putu", "wayan", "gede", "gde", "iluh", "luh",
  "made", "kadek", "nengah", "kdk", "md",
  "nyoman", "komang", "nym", "kmg",
  "ketut", "kt",
]);

function randomDigits(n: number): string {
  let result = "";
  for (let i = 0; i < n; i++) result += Math.floor(Math.random() * 10).toString();
  return result;
}

function randomSymbol(): string {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function alphanumLower(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function alphaOnly(s: string): string {
  return s.replace(/[^a-zA-Z]/g, "").toLowerCase();
}

function getValidNameSegments(fullName: string): string[] {
  const words = fullName
    .split(/\s+/)
    .map((w) => alphaOnly(w))
    .filter((w) => w.length > 0);
  const valid = words.filter((w) => !BALINESE_TITLES.has(w) && w.length > 1);
  return valid.length > 0 ? valid : words;
}

function randomNameSegment(fullName: string, maxLen = 10): string {
  const segs = getValidNameSegments(fullName);
  if (segs.length === 0) return "user";
  return segs[Math.floor(Math.random() * segs.length)].slice(0, maxLen);
}

function abbreviate(name: string, maxChars: number): string {
  const stopwords = new Set([
    "komunitas","sekolah","dasar","menengah","atas","pertama",
    "negeri","swasta","sdn","smp","sma","smk","mts","ma",
    "madrasah","ibtidaiyah","tsanawiyah","aliyah",
    "kabupaten","kota","kab","provinsi","kec","desa",
    "the","of","and",
  ]);
  const words = name.split(/\s+/).map((w) => alphanumLower(w)).filter((w) => w.length > 0 && !stopwords.has(w));
  const src = words.length > 0 ? words : name.split(/\s+/).map((w) => alphanumLower(w)).filter(Boolean);
  let abbr = "";
  for (const w of src) {
    if (abbr.length >= maxChars) break;
    const remaining = maxChars - abbr.length;
    abbr += w.slice(0, Math.min(4, remaining));
  }
  return abbr.slice(0, maxChars) || "org";
}

// ─── SISWA ────────────────────────────────────────────────────────────────────

export interface StudentCredentials {
  username: string;
  pin: string;
}

export function generateStudentCredentials(
  fullName: string,
  nisn?: string | null,
  npsn?: string | null,
): StudentCredentials {
  const namePart = randomNameSegment(fullName, 10);
  const identifier = (nisn || npsn || "").replace(/[^0-9]/g, "");
  const digits = identifier.length >= 3 ? identifier.slice(-3) : randomDigits(3);
  return { username: `${namePart}${digits}`, pin: "123456" };
}

// ─── GURU ─────────────────────────────────────────────────────────────────────

export interface TeacherCredentials {
  username: string;
  password: string;
}

export function generateTeacherCredentials(
  fullName: string,
  schoolName: string,
  nip?: string | null,
  birthDate?: string | null,
): TeacherCredentials {
  const nameSeg = randomNameSegment(fullName, 10);
  const nipDigits = (nip || "").replace(/[^0-9]/g, "");
  const userDigits = nipDigits.length >= 3 ? nipDigits.slice(-3) : randomDigits(3);
  const username = `${nameSeg}${userDigits}`;

  // Nama sekolah (kata pertama tanpa negeri)
  const words = (schoolName || "").replace(/\bnegeri\b/gi, "").split(/\s+/).filter(w => w.length > 2);
  const oneWordSchool = words.length > 0 ? alphanumLower(words[0]) : "sekolah";

  // Ekstrak Tahun Lahir
  let birthYear = "";
  if (birthDate) {
    const d = new Date(birthDate);
    if (!isNaN(d.getTime())) {
      birthYear = d.getFullYear().toString();
    }
  }
  if (!birthYear) {
    birthYear = "1234"; // Fallback
  }

  // Password Guru: Opsi 3 (Nama Depan + Kata Sekolah + Tahun Lahir)
  const password = `${nameSeg}${oneWordSchool}${birthYear}`;
  
  return { username, password };
}

// ─── SEKOLAH ──────────────────────────────────────────────────────────────────

export interface SchoolCredentials {
  username: string;
  password: string;
}

export function generateSchoolCredentials(
  name: string,
  npsn?: string | null,
  district?: string | null,
): SchoolCredentials {
  // Username: "admin_" + 1 kata nama sekolah + 4 digit angka acak
  const words = name.replace(/\bnegeri\b/gi, "").split(/\s+/).filter(w => w.length > 2);
  const oneWord = words.length > 0 ? alphanumLower(words[0]) : "sekolah";
  const username = `admin_${oneWord}${randomDigits(4)}`;

  // Password: 8 karakter acak (huruf besar, kecil, angka)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return {
    username,
    password,
  };
}

// ─── KOMUNITAS ────────────────────────────────────────────────────────────────

export interface CommunityCredentials {
  username: string;
  password: string;
}

export function generateCommunityCredentials(
  name: string,
  regency?: string | null,
): CommunityCredentials {
  const nameAbbr = abbreviate(name, 10);
  const randDigitsUser = randomDigits(3);
  const username = `${nameAbbr}${randDigitsUser}`;

  // Password: 8-10 karakter acak yang kuat (huruf, angka, simbol)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$&*";
  const len = Math.floor(Math.random() * 3) + 8; // 8 to 10
  let password = "";
  for (let i = 0; i < len; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return {
    username,
    password,
  };
}

// ─── ADMIN / PENELITI ─────────────────────────────────────────────────────────

export interface AdminCredentials {
  username: string;
  password: string;
}

export function generateAdminCredentials(
  fullName: string,
): AdminCredentials {
  const nameSeg = randomNameSegment(fullName, 10);
  const username = `${nameSeg}${randomDigits(3)}`;

  // Password: 8-10 karakter acak yang kuat (huruf, angka, simbol)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$&*";
  const len = Math.floor(Math.random() * 3) + 8; // 8 to 10
  let password = "";
  for (let i = 0; i < len; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return { username, password };
}
