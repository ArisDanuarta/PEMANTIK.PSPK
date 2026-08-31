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
  nip?: string | null,
  birthDate?: string | null,
): TeacherCredentials {
  const nameSeg = randomNameSegment(fullName, 10);
  const nipDigits = (nip || "").replace(/[^0-9]/g, "");
  const userDigits = nipDigits.length >= 3 ? nipDigits.slice(-3) : randomDigits(3);
  const username = `${nameSeg}${userDigits}`;

  const segs = getValidNameSegments(fullName);
  const passSeg = segs.length > 0
    ? segs[Math.floor(Math.random() * segs.length)].slice(0, 4)
    : nameSeg.slice(0, 4);
  const passNamePart = passSeg.charAt(0).toUpperCase() + passSeg.slice(1);

  let yearPart = randomDigits(2);
  if (birthDate) {
    const yearMatch = birthDate.match(/(\d{4})/);
    if (yearMatch) yearPart = yearMatch[1].slice(-2);
  }

  const symbol = randomSymbol();
  const randPart = randomDigits(2);
  return { username, password: `${passNamePart}${yearPart}${symbol}${randPart}` };
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
  const nameWithoutNegeri = name.replace(/\bnegeri\b/gi, "");
  const schoolNamePart = alphanumLower(nameWithoutNegeri);
  const npsnDigits = (npsn || "").replace(/[^0-9]/g, "");
  const npsnPart = npsnDigits.length >= 4 ? npsnDigits.slice(-4) : randomDigits(4);
  const username = `${schoolNamePart}${npsnPart}`;

  const nameAbbr = abbreviate(name, 4);
  const passNamePart = nameAbbr.charAt(0).toUpperCase() + nameAbbr.slice(1);

  const districtPart = district ? alphaOnly(district).slice(0, 4) : randomDigits(4);
  const passDistrictPart = districtPart.charAt(0).toUpperCase() + districtPart.slice(1);

  const passDigits = npsnDigits.length >= 3 ? npsnDigits.slice(-3) : randomDigits(3);
  const symbol = randomSymbol();

  return {
    username,
    password: `${passNamePart}${passDistrictPart}${symbol}${passDigits}`,
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

  const passNameAbbr = abbreviate(name, 4);
  const passNamePart = passNameAbbr.charAt(0).toUpperCase() + passNameAbbr.slice(1);

  const regencyPart = regency ? alphaOnly(regency).slice(0, 4) : randomDigits(4);
  const passRegencyPart = regencyPart.charAt(0).toUpperCase() + regencyPart.slice(1);

  const symbol = randomSymbol();
  const randDigitsPass = randomDigits(3);

  return {
    username,
    password: `${passNamePart}${passRegencyPart}${symbol}${randDigitsPass}`,
  };
}
