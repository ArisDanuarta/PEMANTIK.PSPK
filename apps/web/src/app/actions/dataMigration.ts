"use server";

import { createServerClient } from "@pemantik/supabase";
import { normalizeSesName } from "@/lib/utils/sesMatcher";
import {
  parseFlexibleDate,
  normalizeIdentityNumber,
  normalizeText,
} from "@/lib/normalizationUtils";
import bcrypt from "bcryptjs";
import type {
  ExcelRow,
  MigrationMaps,
  ValidationResult,
  BatchResult,
  PrepareResult,
} from "./dataMigrationUtils";
import { detectLongFormat, kolomDataToQuestionCode } from "./dataMigrationUtils";

export type {
  ExcelRow,
  MigrationMaps,
  ValidationResult,
  BatchResult,
  PrepareResult,
} from "./dataMigrationUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeGender(val: any): "L" | "P" | null {
  if (!val) return null;
  const v = String(val).trim().toUpperCase();
  if (["L", "LAKI", "LAKI-LAKI", "MALE", "M"].includes(v)) return "L";
  if (["P", "PR", "PEREMPUAN", "FEMALE", "F", "W", "WANITA"].includes(v)) return "P";
  return null;
}

function normalizeSesClass(val: any): string | null {
  if (!val) return null;
  const v = String(val).toLowerCase().trim().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    bawah: "bawah",
    menengah_bawah: "menengah_bawah",
    "menengah bawah": "menengah_bawah",
    menengah: "menengah",
    menengah_atas: "menengah_atas",
    "menengah atas": "menengah_atas",
    atas: "atas",
  };
  return map[v] || v;
}

function genUsername(fullName: string, nisn?: string | null): string {
  const TITLES = new Set([
    "i","ni","ida","aa","anak","agung","dewa","gusti",
    "putu","wayan","gede","made","kadek","nyoman","komang","ketut","luh","ayu",
  ]);
  const words = (fullName || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const valid = words.filter((w) => w.length > 1 && !TITLES.has(w));
  const namePart = (valid[0] || words[0] || "siswa").slice(0, 8);
  const suffix = nisn
    ? nisn.replace(/\D/g, "").slice(-4) || Math.floor(1000 + Math.random() * 9000).toString()
    : Math.floor(1000 + Math.random() * 9000).toString();
  return `${namePart}_${suffix}`;
}

function genCode(name: string): string {
  const base = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 18);
  return `${base}_${Math.floor(10 + Math.random() * 90)}`;
}

function getField(row: ExcelRow, colAlias: string | null | undefined): any {
  if (!colAlias) return null;
  return row[colAlias] ?? null;
}

// ─── Server Action 1: Validate ────────────────────────────────────────────────

export async function validateMigrationData(
  rows: ExcelRow[],
  columnMap: Record<string, string | null>,
  answerColumns: string[]
): Promise<ValidationResult> {
  const supabase = createServerClient();

  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  // Load reference data
  const [{ data: questions }, { data: sesVars }] = await Promise.all([
    supabase.from("questions").select("id, question_code"),
    supabase.from("ses_variables").select("id, name, type"),
  ]);

  const questionCodeSet = new Set(
    (questions || []).map((q: any) => (q.question_code || "").toUpperCase())
  );
  const sesVarNames = new Set(
    (sesVars || []).map((s: any) => s.name.toUpperCase())
  );

  // Validate answer columns
  const invalidAnswerCols = answerColumns.filter(
    (col) => !questionCodeSet.has(col.toUpperCase())
  );
  for (const code of invalidAnswerCols) {
    warnings.push({
      row: 0,
      field: code,
      message: `Kolom jawaban '${code}' tidak ditemukan di bank soal — akan dilewati`,
    });
  }

  // Per-row validation
  const uniqueCommunities = new Set<string>();
  const uniqueSchools = new Map<string, { name: string; npsn?: string }>();
  const unknownSES = new Set<string>();
  let validRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row
    let rowValid = true;

    // Required: nama_siswa
    const nama = normalizeText(getField(row, columnMap.nama_siswa));
    if (!nama) {
      errors.push({ row: rowNum, field: "nama_siswa", message: `Baris ${rowNum}: Nama siswa kosong` });
      rowValid = false;
    }

    // Required: nama_sekolah
    const namaSekolah = normalizeText(getField(row, columnMap.nama_sekolah));
    if (!namaSekolah) {
      errors.push({ row: rowNum, field: "nama_sekolah", message: `Baris ${rowNum}: Nama sekolah kosong` });
      rowValid = false;
    } else {
      const npsn = normalizeIdentityNumber(getField(row, columnMap.npsn));
      uniqueSchools.set(namaSekolah, { name: namaSekolah, npsn: npsn || undefined });
    }

    // Community
    const komName = normalizeText(getField(row, columnMap.nama_komunitas));
    if (komName) uniqueCommunities.add(komName);

    // SES validation
    const sesFields = [
      { col: columnMap.pendidikan_ayah, type: "education" as const, label: "Pendidikan Ayah" },
      { col: columnMap.pekerjaan_ayah, type: "occupation" as const, label: "Pekerjaan Ayah" },
      { col: columnMap.pendidikan_ibu, type: "education" as const, label: "Pendidikan Ibu" },
      { col: columnMap.pekerjaan_ibu, type: "occupation" as const, label: "Pekerjaan Ibu" },
    ];

    for (const { col, type, label } of sesFields) {
      const rawVal = getField(row, col);
      if (!rawVal) continue;
      const normalized = normalizeSesName(String(rawVal), type).toUpperCase();
      if (!sesVarNames.has(normalized)) {
        const key = `${type}:${normalized}`;
        if (!unknownSES.has(key)) {
          unknownSES.add(key);
          warnings.push({
            row: rowNum,
            field: col || label,
            message: `${label} '${rawVal}' → '${normalized}' belum ada di database SES (akan dilewati)`,
          });
        }
      }
    }

    if (rowValid) validRows++;
  }

  // --- Calculate Long Format Stats ---
  let longFormatStats = undefined;
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  if (detectLongFormat(headers)) {
    let validAnswers = 0;
    const uniqueQuestionCodes = new Set<string>();
    const uniqueStudents = new Set<string>();

    for (const row of rows) {
      const idUser = String(row.id_user || "").trim();
      if (idUser) uniqueStudents.add(idUser);

      const rawKolomData = String(row.kolom_data || "").trim();
      const questionCode = kolomDataToQuestionCode(rawKolomData);
      
      if (questionCode && questionCodeSet.has(questionCode)) {
        validAnswers++;
        uniqueQuestionCodes.add(questionCode);
      } else if (questionCode && !invalidAnswerCols.includes(questionCode)) {
        invalidAnswerCols.push(questionCode);
        warnings.push({
          row: 0,
          field: "kolom_data",
          message: `Kode soal '${questionCode}' tidak ditemukan di bank soal (akan dilewati)`,
        });
      }
    }
    longFormatStats = {
      validAnswers,
      uniqueQuestionCodes: Array.from(uniqueQuestionCodes),
      totalStudents: uniqueStudents.size,
    };
  }

  return {
    totalRows: rows.length,
    validRows,
    errors,
    warnings,
    detectedColumns: columnMap,
    answerColumns,
    summary: {
      uniqueCommunities: Array.from(uniqueCommunities),
      uniqueSchools: Array.from(uniqueSchools.values()),
      unknownSES: Array.from(unknownSES),
      totalAnswerCols: answerColumns.length,
      invalidAnswerCols,
      longFormatStats,
    },
  };
}

// ─── Server Action 2: Prepare Migration ──────────────────────────────────────

export async function prepareMigration(
  rows: ExcelRow[],
  columnMap: Record<string, string | null>,
  targetCommunityId: string | null,
  mode: "sandbox" | "production"
): Promise<PrepareResult> {
  const supabase = createServerClient();
  const credentials: PrepareResult["credentials"] = [];
  const DEFAULT_PASSWORD = "Pspk2025!";

  try {
    // ── Load questions → questionCodeMap ─────────────────────────────────────
    const { data: questions } = await supabase
      .from("questions")
      .select(`
        id, question_code,
        question_levels ( id, level_number, category_id,
          question_categories ( id, subject_area )
        )
      `);

    const questionCodeMap: MigrationMaps["questionCodeMap"] = {};
    for (const q of questions || []) {
      if (!q.question_code) continue;
      const ql: any = Array.isArray(q.question_levels) ? q.question_levels[0] : q.question_levels;
      const qc: any = ql ? (Array.isArray(ql.question_categories) ? ql.question_categories[0] : ql.question_categories) : null;
      const subject = qc?.subject_area || (q.question_code.toUpperCase().startsWith("LIT") ? "literasi" : "numerasi");
      questionCodeMap[q.question_code.toUpperCase()] = {
        id: q.id,
        level_id: ql?.id || "",
        subject_area: subject,
      };
    }

    // ── Load categories → categoryMap ────────────────────────────────────────
    const { data: categories } = await supabase
      .from("question_categories")
      .select("id, subject_area");

    const categoryMap: MigrationMaps["categoryMap"] = {};
    for (const c of categories || []) {
      categoryMap[c.subject_area] = c.id;
    }

    // ── Load SES variables → sesVarMap ───────────────────────────────────────
    const { data: sesVars } = await supabase.from("ses_variables").select("id, name, type");
    const sesVarMap: MigrationMaps["sesVarMap"] = {};
    for (const s of sesVars || []) {
      sesVarMap[`${s.type}:${s.name.toUpperCase()}`] = s.id;
    }

    // ── Process Communities ──────────────────────────────────────────────────
    const communityMap: MigrationMaps["communityMap"] = {};

    if (targetCommunityId) {
      const { data: comm } = await supabase
        .from("communities")
        .select("id, name")
        .eq("id", targetCommunityId)
        .single();
      if (comm) {
        communityMap[comm.name] = comm.id;
        communityMap["__default__"] = comm.id;
      }
    } else {
      // Extract unique communities from Excel
      const komCol = columnMap.nama_komunitas;
      const uniqueComms = new Set<string>();
      if (komCol) {
        for (const row of rows) {
          const name = normalizeText(row[komCol]);
          if (name) uniqueComms.add(name);
        }
      }

      for (const commName of uniqueComms) {
        // Try find existing
        const { data: existing } = await supabase
          .from("communities")
          .select("id")
          .ilike("name", commName)
          .maybeSingle();

        if (existing) {
          communityMap[commName] = existing.id;
          continue;
        }

        // Auto-create community
        const commCode = genCode(commName);
        const adminUsername = `adm_${commCode.slice(0, 14)}`;
        const adminEmail = `${adminUsername}@pemantik.local`;

        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email: adminEmail,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: `Admin ${commName}`, role: "community" },
        });

        if (authErr || !authUser.user) {
          console.warn(`[prepareMigration] Failed to create auth for community ${commName}:`, authErr?.message);
          continue;
        }

        const { data: newComm, error: commErr } = await supabase
          .from("communities")
          .insert({
            name: commName,
            code: commCode,
            is_active: true,
            is_sandbox: mode === "sandbox",
          })
          .select("id")
          .single();

        if (commErr || !newComm) {
          console.warn(`[prepareMigration] Failed to create community ${commName}:`, commErr?.message);
          await supabase.auth.admin.deleteUser(authUser.user.id);
          continue;
        }

        await (supabase as any).from("users").insert({
          id: authUser.user.id,
          username: adminUsername,
          full_name: `Admin ${commName}`,
          role: "community",
          community_id: newComm.id,
        });

        communityMap[commName] = newComm.id;
        credentials!.push({
          type: "Komunitas",
          name: commName,
          username: adminUsername,
          password: DEFAULT_PASSWORD,
        });
      }
    }

    // ── Process Schools ──────────────────────────────────────────────────────
    const schoolMap: MigrationMaps["schoolMap"] = {};

    const uniqueSchools = new Map<string, { name: string; npsn?: string; communityId: string }>();
    for (const row of rows) {
      const schoolName = normalizeText(getField(row, columnMap.nama_sekolah));
      if (!schoolName) continue;
      const npsn = normalizeIdentityNumber(getField(row, columnMap.npsn));

      let commId =
        communityMap["__default__"] || Object.values(communityMap)[0] || "";
      if (columnMap.nama_komunitas) {
        const komName = normalizeText(row[columnMap.nama_komunitas]);
        if (komName && communityMap[komName]) commId = communityMap[komName];
      }

      if (!uniqueSchools.has(schoolName)) {
        uniqueSchools.set(schoolName, {
          name: schoolName,
          npsn: npsn || undefined,
          communityId: commId,
        });
      }
    }

    for (const [schoolName, info] of uniqueSchools) {
      // Find existing by NPSN first, then name
      let existingId: string | null = null;

      if (info.npsn) {
        const { data } = await supabase
          .from("schools")
          .select("id")
          .eq("npsn", info.npsn)
          .maybeSingle();
        if (data) existingId = data.id;
      }

      if (!existingId) {
        const { data } = await supabase
          .from("schools")
          .select("id")
          .ilike("name", schoolName)
          .maybeSingle();
        if (data) existingId = data.id;
      }

      if (existingId) {
        schoolMap[schoolName] = existingId;
        if (info.npsn) schoolMap[info.npsn] = existingId;
        continue;
      }

      // Auto-create school + admin account
      const schoolCode = info.npsn || genCode(schoolName);
      const adminUsername = `sch_${schoolCode.slice(0, 12)}`;
      const adminEmail = `${adminUsername}@pemantik.local`;

      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: `Admin ${schoolName}`, role: "school" },
      });

      if (authErr || !authUser.user) {
        console.warn(`[prepareMigration] Failed to create auth for school ${schoolName}:`, authErr?.message);
        continue;
      }

      const { data: newSchool, error: schoolErr } = await (supabase as any)
        .from("schools")
        .insert({
          name: schoolName,
          npsn: info.npsn || null,
          community_id: info.communityId || null,
          is_active: true,
        })
        .select("id")
        .single();

      if (schoolErr || !newSchool) {
        console.warn(`[prepareMigration] Failed to create school ${schoolName}:`, schoolErr?.message);
        await supabase.auth.admin.deleteUser(authUser.user.id);
        continue;
      }

      // Insert school admin user profile
      await (supabase as any).from("users").insert({
        id: authUser.user.id,
        username: adminUsername,
        full_name: `Admin ${schoolName}`,
        role: "school",
        school_id: newSchool.id,
        community_id: info.communityId || null,
      });

      // Create school assessment stage = 'selesai' (data lama sudah selesai)
      await (supabase as any).from("school_assessment_stages").insert({
        school_id: newSchool.id,
        community_id: info.communityId || null,
        phase: "fase_1",
        current_stage: "selesai",
      }).then(() => {});

      schoolMap[schoolName] = newSchool.id;
      if (info.npsn) schoolMap[info.npsn] = newSchool.id;
      credentials!.push({
        type: "Sekolah",
        name: schoolName,
        username: adminUsername,
        password: DEFAULT_PASSWORD,
      });
    }

    // ── Process Classes ──────────────────────────────────────────────────────
    const classMap: MigrationMaps["classMap"] = {};

    const uniqueClasses = new Map<string, { schoolId: string; className: string }>();
    for (const row of rows) {
      const schoolName = normalizeText(getField(row, columnMap.nama_sekolah));
      const schoolId = schoolName ? schoolMap[schoolName] : null;
      if (!schoolId) continue;

      const className = normalizeText(getField(row, columnMap.kelas)) || "Kelas Data Lama";
      const key = `${schoolId}_${className}`;
      if (!uniqueClasses.has(key)) {
        uniqueClasses.set(key, { schoolId, className });
      }
    }

    for (const [key, { schoolId, className }] of uniqueClasses) {
      const { data: existing } = await supabase
        .from("classes")
        .select("id")
        .eq("school_id", schoolId)
        .ilike("name", className)
        .maybeSingle();

      if (existing) {
        classMap[key] = existing.id;
      } else {
        const currentYear = new Date().getFullYear();
        const { data: newClass } = await supabase
          .from("classes")
          .insert({
            name: className,
            school_id: schoolId,
            grade: 1,
            academic_year: `${currentYear}/${currentYear + 1}`,
            is_active: true,
          })
          .select("id")
          .single();
        if (newClass) classMap[key] = newClass.id;
      }
    }

    return {
      success: true,
      maps: { communityMap, schoolMap, classMap, questionCodeMap, sesVarMap, categoryMap },
      credentials,
    };
  } catch (err: any) {
    console.error("[prepareMigration] Fatal error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Server Action 3: Insert Student Batch ────────────────────────────────────

export async function insertStudentBatch(
  rows: ExcelRow[],
  columnMap: Record<string, string | null>,
  answerColumns: string[],
  maps: MigrationMaps,
  phaseName: string,
  startRowIndex: number
): Promise<BatchResult> {
  const supabase = createServerClient();
  const hashedPin = bcrypt.hashSync("123456", 10);

  const result: BatchResult = {
    inserted: 0,
    skipped: 0,
    errors: [],
    sessionIds: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = startRowIndex + i + 2;

    try {
      // ── Resolve school ──────────────────────────────────────────────────────
      const schoolName = normalizeText(getField(row, columnMap.nama_sekolah));
      const schoolId = schoolName ? maps.schoolMap[schoolName] : null;
      if (!schoolId) {
        result.errors.push({ row: rowNum, message: `Sekolah '${schoolName}' tidak ditemukan` });
        result.skipped++;
        continue;
      }

      // ── Resolve class ───────────────────────────────────────────────────────
      const className = normalizeText(getField(row, columnMap.kelas)) || "Kelas Data Lama";
      const classKey = `${schoolId}_${className}`;
      const classId = maps.classMap[classKey] || null;

      // ── Resolve community ───────────────────────────────────────────────────
      const komName = normalizeText(getField(row, columnMap.nama_komunitas));
      const communityId =
        (komName && maps.communityMap[komName]) ||
        maps.communityMap["__default__"] ||
        Object.values(maps.communityMap)[0] ||
        null;

      // ── Resolve SES ─────────────────────────────────────────────────────────
      const resolveSes = (col: string | null, type: "education" | "occupation"): string | null => {
        const raw = getField(row, col);
        if (!raw) return null;
        const normalized = normalizeSesName(String(raw), type).toUpperCase();
        return maps.sesVarMap[`${type}:${normalized}`] || null;
      };

      const fatherEducId = resolveSes(columnMap.pendidikan_ayah, "education");
      const fatherOccId = resolveSes(columnMap.pekerjaan_ayah, "occupation");
      const motherEducId = resolveSes(columnMap.pendidikan_ibu, "education");
      const motherOccId = resolveSes(columnMap.pekerjaan_ibu, "occupation");

      // ── Build student ────────────────────────────────────────────────────────
      const fullName = normalizeText(getField(row, columnMap.nama_siswa));
      if (!fullName) { result.skipped++; continue; }

      const nisn = normalizeIdentityNumber(getField(row, columnMap.nisn));
      const username = genUsername(fullName, nisn);

      const { data: student, error: studentErr } = await (supabase as any)
        .from("students")
        .upsert(
          {
            username,
            full_name: fullName,
            nisn: nisn || null,
            birth_date: parseFlexibleDate(getField(row, columnMap.tanggal_lahir)),
            gender: normalizeGender(getField(row, columnMap.jenis_kelamin)),
            pin_hash: hashedPin,
            school_id: schoolId,
            class_id: classId,
            father_education_id: fatherEducId,
            father_occupation_id: fatherOccId,
            mother_education_id: motherEducId,
            mother_occupation_id: motherOccId,
            ses_class: normalizeSesClass(getField(row, columnMap.ses_class)),
            province: normalizeText(getField(row, columnMap.province)),
            city: normalizeText(getField(row, columnMap.city)),
            district: normalizeText(getField(row, columnMap.district)),
            village: normalizeText(getField(row, columnMap.village)),
          },
          { onConflict: "username" }
        )
        .select("id")
        .single();

      if (studentErr || !student) {
        result.errors.push({ row: rowNum, message: `Gagal insert siswa '${fullName}': ${studentErr?.message}` });
        result.skipped++;
        continue;
      }

      // ── Create sessions & answers per category ────────────────────────────
      const litCols = answerColumns.filter((c) => /^LIT/i.test(c) && maps.questionCodeMap[c.toUpperCase()]);
      const numCols = answerColumns.filter((c) => /^NUM/i.test(c) && maps.questionCodeMap[c.toUpperCase()]);

      const subjects: Array<{ subject_area: string; cols: string[] }> = [];
      if (litCols.length > 0) subjects.push({ subject_area: "literasi", cols: litCols });
      if (numCols.length > 0) subjects.push({ subject_area: "numerasi", cols: numCols });

      for (const { subject_area, cols } of subjects) {
        const categoryId = maps.categoryMap[subject_area];
        if (!categoryId) continue;

        // Check if this student has any answers for this subject
        const hasAnswers = cols.some((col) => {
          const v = row[col];
          return v !== null && v !== undefined && v !== "";
        });
        if (!hasAnswers) continue;

        // Find or create assessment_session
        let sessionId: string;
        const { data: existingSession } = await (supabase as any)
          .from("assessment_sessions")
          .select("id")
          .eq("student_id", student.id)
          .eq("category_id", categoryId)
          .eq("phase", phaseName)
          .maybeSingle();

        if (existingSession) {
          sessionId = existingSession.id;
        } else {
          const { data: newSession, error: sessErr } = await (supabase as any)
            .from("assessment_sessions")
            .insert({
              student_id: student.id,
              school_id: schoolId,
              category_id: categoryId,
              phase: phaseName,
              is_void: false,
              is_completed: true,
            })
            .select("id")
            .single();

          if (sessErr || !newSession) {
            console.warn(`Failed to create session for student ${student.id}:`, sessErr?.message);
            continue;
          }
          sessionId = newSession.id;
        }

        result.sessionIds.push(sessionId);

        // Build answers payload
        const answersPayload: any[] = [];
        for (const col of cols) {
          const qInfo = maps.questionCodeMap[col.toUpperCase()];
          if (!qInfo) continue;
          const rawVal = row[col];
          if (rawVal === null || rawVal === undefined || rawVal === "") continue;

          const isCorrect = Number(rawVal) === 1;
          answersPayload.push({
            session_id: sessionId,
            question_id: qInfo.id,
            is_correct: isCorrect,
            score: isCorrect ? 1 : 0,
            answer_data: { migrated: true, raw_value: String(rawVal) },
          });
        }

        // Insert answers in chunks of 100
        for (let j = 0; j < answersPayload.length; j += 100) {
          const chunk = answersPayload.slice(j, j + 100);
          const { error: ansErr } = await (supabase as any)
            .from("student_answers")
            .upsert(chunk, { onConflict: "session_id,question_id", ignoreDuplicates: true });
          if (ansErr) console.warn(`Answer upsert error (non-fatal):`, ansErr.message);
        }
      }

      result.inserted++;
    } catch (err: any) {
      result.errors.push({ row: rowNum, message: err.message || "Unknown error" });
      result.skipped++;
    }
  }

  return result;
}

// ─── Server Action 4: Finalize — Update current_level_id ─────────────────────

export async function finalizeMigration(
  sessionIds: string[]
): Promise<{ success: boolean; updated: number; error?: string }> {
  if (!sessionIds || sessionIds.length === 0) return { success: true, updated: 0 };

  const supabase = createServerClient();
  let updated = 0;

  // Process in chunks of 100 to avoid URL too long
  for (let i = 0; i < sessionIds.length; i += 100) {
    const chunk = sessionIds.slice(i, i + 100);

    const { data: answers } = await (supabase as any)
      .from("student_answers")
      .select(`
        session_id,
        questions (
          level_id,
          question_levels ( id, level_number )
        )
      `)
      .in("session_id", chunk);

    if (!answers) continue;

    // Map sessionId → max level
    const sessionMaxLevel = new Map<string, { levelId: string; levelNumber: number }>();

    for (const ans of answers) {
      const q: any = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions;
      const ql: any = q ? (Array.isArray(q.question_levels) ? q.question_levels[0] : q.question_levels) : null;
      if (!ql?.id || ql.level_number == null) continue;

      const existing = sessionMaxLevel.get(ans.session_id);
      if (!existing || ql.level_number > existing.levelNumber) {
        sessionMaxLevel.set(ans.session_id, { levelId: ql.id, levelNumber: ql.level_number });
      }
    }

    // Update each session
    for (const [sessionId, { levelId }] of sessionMaxLevel) {
      const { error } = await (supabase as any)
        .from("assessment_sessions")
        .update({ current_level_id: levelId })
        .eq("id", sessionId);
      if (!error) updated++;
    }
  }

  return { success: true, updated };
}
