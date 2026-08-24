/**
 * /api/migrate-longformat/route.ts
 *
 * Menerima file Excel format LONG (1 baris = 1 jawaban 1 soal) dari platform lama,
 * lalu menjalankan seluruh proses migrasi di server dan melaporkan progres via SSE
 * (Server-Sent Events) agar UI bisa menampilkan progres real-time.
 *
 * Format kolom yang didukung:
 *   id_user, nama_siswa, gender, kelas, tgl_lahir_siswa, asal_provinsi,
 *   asal_kabupaten_kota, asal_kecamatan, asal_kelurahan, pekerjaan_ayah,
 *   pekerjaan_ibu, pendidikan_ayah, pendidikan_ibu, SES, asal_sekolah,
 *   organisasi_user, mapel, kolom_data (L0_I1 → LIT-0-1), benar
 */

import { createClient } from "@supabase/supabase-js";
import { normalizeSesName } from "@/lib/utils/sesMatcher";
import { parseFlexibleDate, normalizeIdentityNumber, normalizeText } from "@/lib/normalizationUtils";
import bcrypt from "bcryptjs";

export const maxDuration = 300; // 5 menit — cukup untuk 3000-5000 siswa
export const runtime = "nodejs";

// ─── Supabase admin client ───────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Konversi kolom_data format lama ke question_code database baru.
 * L0_I1 → LIT-0-1
 * N2_I3 → NUM-2-3
 */
function kolomDataToQuestionCode(kolomData: string): string | null {
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

function extractLevelFromKolomData(kolomData: string): number {
  const str = (kolomData || "").trim().toUpperCase();
  
  // Format baru: LIT-3-1 / NUM-2-1
  const newMatch = str.match(/^(?:LIT|NUM)-(\d+)-/);
  if (newMatch) return parseInt(newMatch[1]);

  // Format lama: L3_I1 / N2_I1
  const oldMatch = str.match(/^[LN](\d+)_/);
  return oldMatch ? parseInt(oldMatch[1]) : 0;
}

function normalizeSubjectArea(mapel: string): "literasi" | "numerasi" {
  const v = (mapel || "").toLowerCase();
  if (v.includes("num")) return "numerasi";
  return "literasi"; // default ke literasi
}

function normalizeGenderLong(val: any): "L" | "P" | null {
  if (!val) return null;
  const v = String(val).trim().toLowerCase();
  if (v === "laki-laki" || v === "l" || v === "laki" || v === "male" || v === "m") return "L";
  if (v === "perempuan" || v === "p" || v === "pr" || v === "female" || v === "f" || v === "w" || v === "wanita") return "P";
  return null;
}

function normalizeSesClassLong(val: any): string | null {
  if (!val) return null;
  const v = String(val).toLowerCase().trim();
  if (v === "bawah") return "bawah";
  if (v === "menengah bawah") return "menengah_bawah";
  if (v === "menengah") return "menengah";
  if (v === "menengah atas") return "menengah_atas";
  if (v === "atas") return "atas";
  return v.replace(/\s+/g, "_");
}

function genCodeFromName(name: string): string {
  const base = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 18);
  return `${base}_${Math.floor(10 + Math.random() * 90)}`;
}

function genUsername(fullName: string, idUser?: string): string {
  const words = (fullName || "").split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, "").toLowerCase()).filter(w => w.length > 0);
  const balineseTitles = new Set([
    "i", "ni", "ida", "aa", "anak", "agung", "tjokorda", "cokorda", 
    "dewa", "desak", "gusti", "ngakan", "bagus", "ayu", 
    "putu", "wayan", "gede", "gde", "iluh", "luh",
    "made", "kadek", "nengah", "kdk", "md",
    "nyoman", "komang", "nym", "kmg",
    "ketut", "kt"
  ]);

  let validNames = words.filter(word => !balineseTitles.has(word) && word.length > 1);
  if (validNames.length === 0) validNames = words;
  
  // Only use idUser directly as username if it contains at least one letter (e.g., "qurrahman_3889")
  // Purely numeric idUser (e.g., "325") must NOT be used as-is
  if (idUser && typeof idUser === "string" && idUser.length > 2) {
    const sanitizedId = idUser.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (sanitizedId.length > 2 && /[a-z]/.test(sanitizedId)) return sanitizedId.slice(0, 30);
  }

  let namePart = "siswa";
  if (validNames.length > 0) {
    namePart = validNames[0].slice(0, 10);
  }

  // Use the numeric portion of idUser as a suffix, padded to at least 4 digits for readability
  const numericId = (idUser || "").replace(/[^0-9]/g, "");
  let digits: string;
  if (numericId.length > 0) {
    digits = numericId.padStart(4, "0");
  } else {
    const seed = (fullName || "").length + validNames.length;
    digits = (1000 + (seed % 9000)).toString();
  }

  return `${namePart}_${digits}`;
}

// ─── Data structures ──────────────────────────────────────────────────────────

interface StudentAnswerEntry {
  question_code: string;
  is_correct: boolean;
  level_num: number;
}

/**
 * Represents ONE assessment session from the old platform.
 * Key insight: each unique `id` column value in the Excel = one distinct session.
 * One student (id_user) can have MANY sessions across different levels and categories.
 */
interface StudentSessionData {
  old_session_id: string;    // The `id` column from Excel (old platform session ID)
  subject_area: string;      // 'literasi' or 'numerasi'
  level_num: number;         // The level tested in this specific session (0-8)
  attempt_number: number;    // The attempt number for this session (from 'attempt' column)
  started_at: string;        // From 'waktu_mulai' column
  time_spent_sec: number;    // From 'durasi_detik' column
  answers: Map<string, StudentAnswerEntry>; // kolom_data -> answer entry
}

interface StudentGroupedData {
  id_user: string;
  nama_siswa: string;
  gender: string;
  kelas: string;
  tgl_lahir_siswa: string;
  asal_provinsi: string;
  asal_kabupaten_kota: string;
  asal_kecamatan: string;
  asal_kelurahan: string;
  pekerjaan_ayah: string;
  pekerjaan_ibu: string;
  pendidikan_ayah: string;
  pendidikan_ibu: string;
  ses_class: string;
  asal_sekolah: string;
  organisasi_user: string;
  // Key = old_session_id (the `id` column from Excel)
  // Each entry = one distinct assessment session with its own level, time, and answers
  sessions: Map<string, StudentSessionData>;
}

// ─── Grouping function ────────────────────────────────────────────────────────

/**
 * Groups Excel rows into a student-centric structure.
 *
 * CORRECT LOGIC:
 * - Primary grouping: by `id_user` (student)
 * - Secondary grouping: by `id` column (old platform session ID)
 *   Each unique `id` value = one distinct DB assessment_session record
 *   One student can have many sessions (e.g., Level 0, Level 1, Level 2 each as separate sessions)
 *
 * The `id` column is guaranteed unique per session (verified: no `id` spans multiple id_users).
 */
function groupLongFormatRows(rows: any[]): {
  students: Map<string, StudentGroupedData>;
  uniqueCommunities: Set<string>;
  uniqueSchools: Map<string, string>; // school_name -> community_name
} {
  const students = new Map<string, StudentGroupedData>();
  const uniqueCommunities = new Set<string>();
  const uniqueSchools = new Map<string, string>();

  for (const row of rows) {
    const idUser = String(row.id_user || "").trim();
    if (!idUser) continue;

    const oldSessionId = String(row.id || "").trim();
    if (!oldSessionId) continue; // skip rows without old session id

    const kolomData = String(row.kolom_data || "").trim();
    const questionCode = kolomDataToQuestionCode(kolomData);
    if (!questionCode) continue; // skip rows without a valid question code

    const mapel = String(row.mapel || row.category || "").trim();
    const subjectArea = normalizeSubjectArea(mapel);
    const isCorrect = Number(row.benar || 0) === 1;
    const levelNum = extractLevelFromKolomData(kolomData);
    const attemptNumber = parseInt(String(row.attempt || "1"), 10) || 1;
    const startedAt = String(row.waktu_mulai || "").trim() || new Date().toISOString();
    const timeSpentSec = parseInt(String(row.durasi_detik || "0"), 10) || 0;

    // Initialize student record if not present
    if (!students.has(idUser)) {
      const community = normalizeText(row.organisasi_user) || "";
      const school = normalizeText(row.asal_sekolah) || "";
      if (community) {
        uniqueCommunities.add(community);
        if (school) uniqueSchools.set(school, community);
      }

      students.set(idUser, {
        id_user: idUser,
        nama_siswa: normalizeText(row.nama_siswa) || "",
        gender: normalizeText(row.gender) || "",
        kelas: normalizeText(row.kelas) || "",
        tgl_lahir_siswa: String(row.tgl_lahir_siswa || ""),
        asal_provinsi: normalizeText(row.asal_provinsi) || "",
        asal_kabupaten_kota: normalizeText(row.asal_kabupaten_kota) || "",
        asal_kecamatan: normalizeText(row.asal_kecamatan) || "",
        asal_kelurahan: normalizeText(row.asal_kelurahan) || "",
        pekerjaan_ayah: normalizeText(row.pekerjaan_ayah) || "",
        pekerjaan_ibu: normalizeText(row.pekerjaan_ibu) || "",
        pendidikan_ayah: normalizeText(row.pendidikan_ayah) || "",
        pendidikan_ibu: normalizeText(row.pendidikan_ibu) || "",
        ses_class: normalizeSesClassLong(row.SES) || normalizeSesClassLong(row.ses_class) || "",
        asal_sekolah: school,
        organisasi_user: community,
        sessions: new Map(),
      });
    }

    const student = students.get(idUser)!;

    // Initialize session record if not present for this old_session_id
    if (!student.sessions.has(oldSessionId)) {
      student.sessions.set(oldSessionId, {
        old_session_id: oldSessionId,
        subject_area: subjectArea,
        level_num: levelNum,
        attempt_number: attemptNumber,
        started_at: startedAt,
        time_spent_sec: timeSpentSec,
        answers: new Map(),
      });
    }

    const session = student.sessions.get(oldSessionId)!;

    // Store the answer. kolom_data is unique within a session (L0_I1, L0_I2, etc.)
    // If the same kolom_data appears twice within the same session_id, keep the last value.
    session.answers.set(kolomData, { question_code: questionCode, is_correct: isCorrect, level_num: levelNum });
  }

  return { students, uniqueCommunities, uniqueSchools };
}

// ─── SSE stream POST handler ──────────────────────────────────────────────────

const STUDENT_BATCH = 50; // Siswa per batch insert
const ANSWER_CHUNK = 200; // Jawaban per insert chunk
const DEFAULT_PASSWORD = "Password123!";
const DEFAULT_PIN = "123456";

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      const send = (data: object) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* ignore write errors when stream is closed */ }
      };

      const log = (level: "info" | "success" | "warning" | "error", message: string) => {
        send({ type: "log", level, message, time: new Date().toLocaleTimeString("id-ID") });
      };

      try {
        const supabase = getSupabase();

        // ── Parse FormData ─────────────────────────────────────────────────────
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const targetCommunityId = (formData.get("targetCommunityId") as string) || null;
        const mode = (formData.get("mode") as string) || "production";
        const phaseName = (formData.get("phaseName") as string) || "fase_1";

        if (!file) {
          send({ type: "error", message: "Tidak ada file yang dikirim" });
          controller.close();
          return;
        }

        // ── Parse Excel ────────────────────────────────────────────────────────
        log("info", `Membaca file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);
        const XLSX = require("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
        log("success", `${rawRows.length.toLocaleString("id-ID")} baris dibaca dari Excel`);

        // ── Group rows by student ──────────────────────────────────────────────
        log("info", "Mengelompokkan data per siswa...");
        const { students, uniqueCommunities, uniqueSchools } = groupLongFormatRows(rawRows);
        const totalStudents = students.size;
        log("success", `${totalStudents} siswa unik | ${uniqueCommunities.size} komunitas | ${uniqueSchools.size} sekolah`);
        send({ type: "meta", totalStudents, totalCommunities: uniqueCommunities.size, totalSchools: uniqueSchools.size });

        // ── Load reference data ────────────────────────────────────────────────
        log("info", "Memuat referensi soal & SES dari database...");
        const [{ data: questions }, { data: sesVars }, { data: categories }] = await Promise.all([
          supabase.from("questions").select("id, question_code, question_levels(id, level_number, question_categories(id, subject_area))"),
          supabase.from("ses_variables").select("id, name, type"),
          supabase.from("question_categories").select("id, subject_area"),
        ]);

        // question_code → { id, level_id }
        const qCodeMap = new Map<string, { id: string; level_id: string }>();
        for (const q of questions || []) {
          if (!q.question_code) continue;
          const ql: any = Array.isArray(q.question_levels) ? q.question_levels[0] : q.question_levels;
          qCodeMap.set(q.question_code.toUpperCase(), { id: q.id, level_id: ql?.id || "" });
        }

        // level_number + subject_area → level_id (for current_level_id lookup)
        // We build a map: "literasi:0" → level_id
        const levelKeyMap = new Map<string, string>(); // "subject:levelNum" → levelId
        for (const q of questions || []) {
          const ql: any = Array.isArray(q.question_levels) ? q.question_levels[0] : q.question_levels;
          const qc: any = ql ? (Array.isArray(ql.question_categories) ? ql.question_categories[0] : ql.question_categories) : null;
          if (!ql || !qc) continue;
          const key = `${qc.subject_area}:${ql.level_number}`;
          if (!levelKeyMap.has(key)) levelKeyMap.set(key, ql.id);
        }

        // ses_variables
        const sesVarMap = new Map<string, string>(); // "type:UPPER_NAME" → id
        for (const s of sesVars || []) sesVarMap.set(`${s.type}:${s.name.toUpperCase()}`, s.id);

        // categories
        const categoryMap = new Map<string, string>(); // subject_area → category_id
        for (const c of categories || []) categoryMap.set(c.subject_area, c.id);

        log("success", `${qCodeMap.size} soal | ${sesVarMap.size} variabel SES | ${categoryMap.size} kategori dimuat`);

        // ── Hash PIN sekali ────────────────────────────────────────────────────
        const hashedPin = bcrypt.hashSync(DEFAULT_PIN, 10);

        // ── Process communities ────────────────────────────────────────────────
        log("info", "Tahap 1/5: Memproses komunitas...");
        const communityMap = new Map<string, string>(); // name → id
        const credentials: any[] = [];

        if (targetCommunityId && targetCommunityId !== "auto") {
          const { data: comm } = await supabase.from("communities").select("id, name").eq("id", targetCommunityId).single();
          if (comm) {
            communityMap.set(comm.name, comm.id);
            communityMap.set("__default__", comm.id);
          }
        } else {
          for (const commName of uniqueCommunities) {
            const { data: existing } = await supabase.from("communities").select("id").ilike("name", commName).maybeSingle();
            if (existing) {
              communityMap.set(commName, existing.id);
              continue;
            }
            // Auto-create
            const code = genCodeFromName(commName);
            const namePart = commName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
            const randomDigits = Math.floor(100 + Math.random() * 900).toString();
            const adminUsername = `${namePart}${randomDigits}`;
            const adminEmail = `${adminUsername}@pemantik.local`;

            const { data: authUser } = await supabase.auth.admin.createUser({
              email: adminEmail, password: DEFAULT_PASSWORD, email_confirm: true,
              user_metadata: { full_name: `Admin ${commName}`, role: "community" },
            });
            if (!authUser?.user) { log("warning", `Gagal buat auth untuk komunitas: ${commName}`); continue; }

            const { data: newComm } = await (supabase as any).from("communities").insert({
              name: commName, code, is_active: true, is_sandbox: mode === "sandbox",
            }).select("id").single();
            if (!newComm) { await supabase.auth.admin.deleteUser(authUser.user.id); continue; }

            await (supabase as any).from("users").insert({
              id: authUser.user.id, username: adminUsername, full_name: `Admin ${commName}`,
              role: "community", community_id: newComm.id,
            });
            communityMap.set(commName, newComm.id);
            credentials.push({ type: "Komunitas", name: commName, username: adminUsername, password: DEFAULT_PASSWORD });
          }
        }
        log("success", `${communityMap.size} komunitas siap`);

        // ── Process schools ────────────────────────────────────────────────────
        log("info", "Tahap 2/5: Memproses sekolah...");
        const schoolMap = new Map<string, string>(); // school_name → id

        for (const [schoolName, commName] of uniqueSchools) {
          const commId = communityMap.get(commName) || communityMap.get("__default__") || [...communityMap.values()][0];

          let { data: existing } = await supabase.from("schools").select("id").ilike("name", schoolName).maybeSingle();
          if (existing) { schoolMap.set(schoolName, existing.id); continue; }

          // Auto-create
          const code = genCodeFromName(schoolName);
          const nameWithoutNegeri = schoolName.replace(/\bnegeri\b/gi, "");
          const namePart = nameWithoutNegeri.toLowerCase().replace(/[^a-z0-9]/g, "");
          const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
          const adminUsername = `${namePart}${randomDigits}`;
          const adminEmail = `${adminUsername}@pemantik.local`;

          const { data: authUser } = await supabase.auth.admin.createUser({
            email: adminEmail, password: DEFAULT_PASSWORD, email_confirm: true,
            user_metadata: { full_name: `Admin ${schoolName}`, role: "school" },
          });
          if (!authUser?.user) { log("warning", `Gagal buat auth untuk sekolah: ${schoolName}`); continue; }

          const { data: newSchool, error: schoolErr } = await (supabase as any).from("schools").insert({
            name: schoolName, community_id: commId || null, is_active: true
          }).select("id").single();
          if (schoolErr || !newSchool) { 
            log("error", `Gagal buat sekolah ${schoolName}: ${schoolErr?.message || "Unknown error"}`);
            await supabase.auth.admin.deleteUser(authUser.user.id); 
            continue; 
          }

          await (supabase as any).from("users").insert({
            id: authUser.user.id, username: adminUsername, full_name: `Admin ${schoolName}`,
            role: "school", school_id: newSchool.id, community_id: commId || null,
          });
          // Set stage ke 'selesai' karena ini data historis
          await (supabase as any).from("school_assessment_stages").insert({
            school_id: newSchool.id, community_id: commId || null, phase: phaseName, current_stage: "selesai",
          }).then(() => {});

          schoolMap.set(schoolName, newSchool.id);
          credentials.push({ type: "Sekolah", name: schoolName, username: adminUsername, password: DEFAULT_PASSWORD });
        }
        log("success", `${schoolMap.size} sekolah siap`);

        // ── Process classes ────────────────────────────────────────────────────
        log("info", "Tahap 3/5: Memproses kelas...");
        const classMap = new Map<string, string>(); // `${schoolId}_${className}` → id

        // Kumpulkan kelas unik
        const uniqueClasses = new Map<string, string>(); // `${schoolId}_${className}` → schoolId
        for (const student of students.values()) {
          const schoolId = schoolMap.get(student.asal_sekolah);
          if (!schoolId || !student.kelas) continue;
          const key = `${schoolId}_${student.kelas}`;
          if (!uniqueClasses.has(key)) uniqueClasses.set(key, schoolId);
        }

        for (const [key, schoolId] of uniqueClasses) {
          const className = key.slice(schoolId.length + 1);
          const { data: existing } = await supabase.from("classes").select("id").eq("school_id", schoolId).ilike("name", className).maybeSingle();
          if (existing) { classMap.set(key, existing.id); continue; }

          const currentYear = new Date().getFullYear();
          const { data: newClass } = await supabase.from("classes").insert({
            name: className, school_id: schoolId, grade: 1,
            academic_year: `${currentYear}/${currentYear + 1}`, is_active: true,
          }).select("id").single();
          if (newClass) classMap.set(key, newClass.id);
        }
        log("success", `${classMap.size} kelas siap`);

        // ── Insert students + sessions + answers ──────────────────────────────
        log("info", "Tahap 4/5: Memasukkan data siswa, sesi, dan jawaban...");

        let completedStudents = 0;
        let totalInserted = 0;
        let totalSkipped = 0;
        const allSessionIds: string[] = [];

        const studentArray = Array.from(students.values());

        for (let batchStart = 0; batchStart < studentArray.length; batchStart += STUDENT_BATCH) {
          const batch = studentArray.slice(batchStart, batchStart + STUDENT_BATCH);

          for (const sData of batch) {
            try {
              const schoolId = schoolMap.get(sData.asal_sekolah);
              if (!schoolId) { totalSkipped++; continue; }

              const commId = communityMap.get(sData.organisasi_user) ||
                communityMap.get("__default__") ||
                [...communityMap.values()][0] || null;
              const classKey = `${schoolId}_${sData.kelas}`;
              const classId = classMap.get(classKey) || null;

              // Resolve SES
              const resolveSes = (raw: string, type: "education" | "occupation") => {
                if (!raw) return null;
                const norm = normalizeSesName(raw, type).toUpperCase();
                return sesVarMap.get(`${type}:${norm}`) || null;
              };

              const username = genUsername(sData.nama_siswa, sData.id_user);

              const { data: student, error: studentErr } = await (supabase as any).from("students").upsert({
                username,
                full_name: sData.nama_siswa,
                gender: normalizeGenderLong(sData.gender),
                birth_date: parseFlexibleDate(sData.tgl_lahir_siswa),
                pin_hash: hashedPin,
                school_id: schoolId,
                class_id: classId,
                father_education_id: resolveSes(sData.pendidikan_ayah, "education"),
                father_occupation_id: resolveSes(sData.pekerjaan_ayah, "occupation"),
                mother_education_id: resolveSes(sData.pendidikan_ibu, "education"),
                mother_occupation_id: resolveSes(sData.pekerjaan_ibu, "occupation"),
                ses_class: sData.ses_class || null,
                province: sData.asal_provinsi || null,
                city: sData.asal_kabupaten_kota || null,
                district: sData.asal_kecamatan || null,
                village: sData.asal_kelurahan || null,
              }, { onConflict: "username" }).select("id").single();

              if (studentErr || !student) {
                log("warning", `Gagal insert siswa '${sData.nama_siswa}': ${studentErr?.message}`);
                totalSkipped++;
                continue;
              }

              // Insert sessions & answers
              // CORRECT: iterate by old_session_id, each old platform session = one DB assessment_session
              for (const [oldSessId, sessData] of sData.sessions) {
                const categoryId = categoryMap.get(sessData.subject_area);
                if (!categoryId || sessData.answers.size === 0) continue;

                // Resolve level_id for this specific session level
                const sessionLevelKey = `${sessData.subject_area}:${sessData.level_num}`;
                const sessionLevelId = levelKeyMap.get(sessionLevelKey) || null;

                // Idempotent check: find existing session tagged with this old platform session id
                // stored in device_info->migrated_session_id to safely detect re-migrations
                let sessionId: string;
                const { data: existSess } = await (supabase as any).from("assessment_sessions")
                  .select("id")
                  .eq("student_id", student.id)
                  .eq("category_id", categoryId)
                  .filter("device_info->>migrated_session_id", "eq", oldSessId)
                  .maybeSingle();

                if (existSess) {
                  sessionId = existSess.id;
                } else {
                  // Normalize started_at to ISO format
                  let startedAtIso: string;
                  try { startedAtIso = new Date(sessData.started_at).toISOString(); }
                  catch { startedAtIso = new Date().toISOString(); }

                  const { data: newSess, error: sessErr } = await (supabase as any).from("assessment_sessions").insert({
                    student_id: student.id,
                    school_id: schoolId,
                    category_id: categoryId,
                    phase: phaseName,
                    is_void: false,
                    status: "completed",
                    sync_status: "synced",
                    attempt_number: sessData.attempt_number,
                    started_at: startedAtIso,
                    completed_at: startedAtIso,
                    time_spent_sec: sessData.time_spent_sec,
                    level_id: sessionLevelId,
                    current_level_id: sessionLevelId,
                    device_info: { migrated: true, migrated_session_id: oldSessId },
                  }).select("id").single();

                  if (sessErr || !newSess) {
                    log("warning", `Gagal insert sesi (old_id ${oldSessId}) untuk siswa ${student.id}: ${sessErr?.message}`);
                    continue;
                  }
                  sessionId = newSess.id;
                }

                allSessionIds.push(sessionId);

                // Build answers payload
                const answersPayload: any[] = [];
                for (const entry of sessData.answers.values()) {
                  const qInfo = qCodeMap.get(entry.question_code.toUpperCase());
                  if (!qInfo) continue;
                  answersPayload.push({
                    session_id: sessionId,
                    question_id: qInfo.id,
                    is_correct: entry.is_correct,
                    score: entry.is_correct ? 1 : 0,
                    status: "answered",
                    answer_data: {
                      migrated: true,
                      migrated_session_id: oldSessId,
                      from_level: entry.level_num,
                    },
                  });
                }

                // Insert answers in chunks (upsert to be idempotent on re-run)
                for (let j = 0; j < answersPayload.length; j += ANSWER_CHUNK) {
                  const chunk = answersPayload.slice(j, j + ANSWER_CHUNK);
                  const { error: ansErr } = await (supabase as any).from("student_answers")
                    .upsert(chunk, { onConflict: "session_id,question_id", ignoreDuplicates: true });
                  if (ansErr) {
                    log("warning", `Gagal insert jawaban (sesi ${sessionId}): ${ansErr.message}`);
                  }
                }

                // Calculate and update session score
                let totalCorrect = 0;
                answersPayload.forEach(a => { if (a.is_correct) totalCorrect++; });
                const finalScore = answersPayload.length > 0 ? Math.round((totalCorrect / answersPayload.length) * 100) : 0;

                await (supabase as any).from("assessment_sessions")
                  .update({ score: finalScore }).eq("id", sessionId);
              }

              // Add a small delay to prevent fetch failed / socket hang up
              await new Promise(resolve => setTimeout(resolve, 50));

              totalInserted++;
            } catch (err: any) {
              log("warning", `Error pada siswa (id_user ${sData.id_user}): ${err.message}`);
              totalSkipped++;
            }

            completedStudents++;
          }

          // Kirim progress setelah setiap batch
          send({
            type: "progress",
            completedStudents,
            totalStudents,
            insertedStudents: totalInserted,
            skippedStudents: totalSkipped,
          });
        }

        // ── Finalize ───────────────────────────────────────────────────────────
        log("info", `Tahap 5/5: Selesai — ${allSessionIds.length} sesi diproses`);
        log("success", "═══════════════════════════════");
        log("success", `MIGRASI SELESAI ✓`);
        log("success", `${totalInserted} siswa berhasil | ${totalSkipped} dilewati`);

        send({
          type: "done",
          result: {
            totalStudents,
            insertedStudents: totalInserted,
            skippedStudents: totalSkipped,
            totalSessions: allSessionIds.length,
            credentials,
          },
        });

      } catch (err: any) {
        console.error("[migrate-longformat] Fatal error:", err);
        send({ type: "error", message: err.message || "Unknown error" });
      } finally {
        isClosed = true;
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
