import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import XLSX from 'xlsx'
import fs from 'fs'

dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Helpers mapping
const normalizeGenderLong = (g) => {
  if (!g) return "L";
  const str = g.toLowerCase();
  return (str === "l" || str === "laki-laki" || str === "laki") ? "L" : "P";
};
const genUsername = (nama_siswa, id_user) => {
  const namePart = (nama_siswa || "").split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const idPart = (id_user || "").toString().replace(/[^0-9]/g, "").slice(-4);
  return `${namePart}${idPart || Math.floor(1000 + Math.random() * 9000)}`;
};
function parseFlexibleDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += year > 50 ? 1900 : 2000;
      let day, month;
      if (p2 > 12 || (p1 <= 12 && p2 <= 12 && p1 > p2)) {
        day = p1; month = p2;
      } else {
        month = p1; day = p2;
      }
      return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    }
  }
  return null;
}
function kolomDataToQuestionCode(kolomData) {
  if (!kolomData) return null;
  const str = String(kolomData).trim().toUpperCase();
  if (str.startsWith("LIT-") || str.startsWith("NUM-")) return str;
  const litMatch = str.match(/^L(\d+)_I(\d+)$/);
  if (litMatch) return `LIT-${litMatch[1]}-${litMatch[2]}`;
  const numMatch = str.match(/^N(\d+)_I(\d+)$/);
  if (numMatch) return `NUM-${numMatch[1]}-${numMatch[2]}`;
  return null;
}
function extractLevelFromKolomData(kolomData) {
  const str = String(kolomData || "").trim().toUpperCase();
  const lit = str.match(/^L(\d+)_/);
  if (lit) return parseInt(lit[1], 10);
  const num = str.match(/^N(\d+)_/);
  if (num) return parseInt(num[1], 10);
  const litNew = str.match(/^LIT-(\d+)-/);
  if (litNew) return parseInt(litNew[1], 10);
  const numNew = str.match(/^NUM-(\d+)-/);
  if (numNew) return parseInt(numNew[1], 10);
  return 0;
}

async function runFastBackfill() {
  console.log("🚀 Memulai Fast Backfill...");
  
  // 1. Fetch bulk data
  console.log("⏳ Mengambil data referensi dari database...");
  const { data: dbCategories } = await supabase.from('question_categories').select('id, subject_area');
  const { data: dbQuestions } = await supabase.from('questions').select('id, question_code');
  const { data: dbLevels } = await supabase.from('question_levels').select('id, category_id, level_number');
  const { data: dbSchools } = await supabase.from('schools').select('id, name');
  const { data: dbClasses } = await supabase.from('classes').select('id, name, school_id');
  const { data: dbSes } = await supabase.from('ses_variables').select('id, name, type');
  const { data: dbCommunities } = await supabase.from('communities').select('id, name');
  
  const categoryMap = new Map(dbCategories.map(c => [c.subject_area, c.id]));
  const qCodeMap = new Map(dbQuestions.map(q => [q.question_code.toUpperCase(), q]));
  const levelKeyMap = new Map();
  for (const l of dbLevels) {
    const cat = dbCategories.find(c => c.id === l.category_id);
    if (cat) levelKeyMap.set(`${cat.subject_area}:${l.level_number}`, l.id);
  }
  const schoolMap = new Map(dbSchools.map(s => [s.name, s.id]));
  const classMap = new Map(dbClasses.map(c => [`${c.school_id}_${c.name}`, c.id]));
  
  const resolveSes = (raw, type) => {
    if (!raw) return null;
    const match = dbSes.find(s => s.type === type && s.name.toUpperCase() === raw.toString().toUpperCase());
    return match ? match.id : null;
  };

  // 2. Fetch existing students and sessions
  console.log("⏳ Memuat existing students & sessions...");
  const { data: existingStudents } = await supabase.from('students').select('id, username');
  const { data: existingSessions } = await supabase.from('assessment_sessions').select('id, student_id, category_id, score');
  
  const studentMap = new Map(existingStudents.map(s => [s.username, s.id]));
  
  // A session is considered "fully processed" if it exists AND score is not null
  const processedSessions = new Set();
  existingSessions.forEach(sess => {
    if (sess.score !== null) {
      processedSessions.add(`${sess.student_id}_${sess.category_id}`);
    }
  });
  console.log(`✅ Ditemukan ${existingStudents.length} siswa & ${processedSessions.size} sesi selesai di database.`);

  // 3. Read Excel
  console.log("⏳ Membaca Excel...");
  const wb = XLSX.readFile("src/app/data_asesmen_hasil_export.xlsx");
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  
  // Group by student
  const students = new Map();
  for (const row of rows) {
    const idUser = String(row.id_user || "").trim();
    const namaSiswa = String(row.nama_siswa || "").trim();
    if (!idUser || !namaSiswa) continue;
    
    const sKey = `${idUser}_${namaSiswa}`;
    if (!students.has(sKey)) {
      students.set(sKey, {
        ...row,
        sessions: new Map()
      });
    }
    
    const sData = students.get(sKey);
    const mapel = row.mapel || row.sheet || row.category || "";
    const subjectArea = mapel.toLowerCase().includes("numerasi") ? "Numerasi" : "Literasi";
    
    if (!sData.sessions.has(subjectArea)) {
      sData.sessions.set(subjectArea, { answers: new Map(), max_level: -1 });
    }
    
    const sess = sData.sessions.get(subjectArea);
    const qCode = kolomDataToQuestionCode(row.kolom_data);
    if (qCode && row.benar !== null) {
      sess.answers.set(qCode, {
        question_code: qCode,
        is_correct: row.benar == 1 || String(row.benar).toLowerCase() === "true",
        level_num: extractLevelFromKolomData(row.kolom_data)
      });
      if (sess.answers.get(qCode).level_num > sess.max_level) {
        sess.max_level = sess.answers.get(qCode).level_num;
      }
    }
  }
  
  console.log(`✅ Ada ${students.size} siswa di Excel.`);

  // 4. Process only missing data
  console.log("🚀 Menyuntikkan sisa data...");
  let insertCount = 0;
  let skipCount = 0;
  
  for (const sData of students.values()) {
    const schoolId = schoolMap.get(sData.asal_sekolah);
    if (!schoolId) continue;
    const username = genUsername(sData.nama_siswa, sData.id_user);
    
    // Check if student exists
    let studentId = studentMap.get(username);
    if (!studentId) {
      // Create student
      const { data: newStud, error: errStud } = await supabase.from('students').insert({
        username,
        full_name: sData.nama_siswa,
        gender: normalizeGenderLong(sData.gender),
        birth_date: parseFlexibleDate(sData.tgl_lahir_siswa),
        pin_hash: "$2b$10$wTf3X/t2o/Nq3u/QeO2iTu.bH1P9q5e9f5R.z.z.z.z.z.z.z",
        school_id: schoolId,
        class_id: classMap.get(`${schoolId}_${sData.kelas}`) || null,
        father_education_id: resolveSes(sData.pendidikan_ayah, "education"),
        father_occupation_id: resolveSes(sData.pekerjaan_ayah, "occupation"),
        mother_education_id: resolveSes(sData.pendidikan_ibu, "education"),
        mother_occupation_id: resolveSes(sData.pekerjaan_ibu, "occupation"),
        ses_class: sData.ses_class,
        province: sData.asal_provinsi,
        city: sData.asal_kabupaten_kota,
        district: sData.asal_kecamatan,
        village: sData.asal_kelurahan,
      }).select('id').single();
      if (newStud) {
        studentId = newStud.id;
        studentMap.set(username, studentId);
      } else {
        continue;
      }
    }
    
    // Check sessions
    for (const [subjectArea, sessData] of sData.sessions) {
      const categoryId = categoryMap.get(subjectArea);
      if (!categoryId || sessData.answers.size === 0) continue;
      
      const sessKey = `${studentId}_${categoryId}`;
      if (processedSessions.has(sessKey)) {
        skipCount++;
        continue;
      }
      
      // INSERT SESSION
      const { data: existSess } = await supabase.from('assessment_sessions')
        .select('id').eq('student_id', studentId).eq('category_id', categoryId).maybeSingle();
        
      let sessionId = existSess?.id;
      if (!sessionId) {
        const { data: newSess } = await supabase.from('assessment_sessions').insert({
          student_id: studentId, school_id: schoolId, category_id: categoryId,
          phase: "fase_1", is_void: false, status: "completed",
          started_at: new Date().toISOString(), completed_at: new Date().toISOString()
        }).select('id').single();
        if (!newSess) continue;
        sessionId = newSess.id;
      }
      
      // INSERT ANSWERS
      const answersPayload = [];
      for (const entry of sessData.answers.values()) {
        const qInfo = qCodeMap.get(entry.question_code.toUpperCase());
        if (!qInfo) continue;
        answersPayload.push({
          session_id: sessionId,
          question_id: qInfo.id,
          is_correct: entry.is_correct,
          score: entry.is_correct ? 1 : 0,
          answer_data: { migrated: true, from_level: entry.level_num }
        });
      }
      
      for (let j = 0; j < answersPayload.length; j += 100) {
        await supabase.from('student_answers').upsert(answersPayload.slice(j, j + 100), { onConflict: "session_id,question_id", ignoreDuplicates: true });
      }
      
      let totalCorrect = 0;
      answersPayload.forEach(a => { if (a.is_correct) totalCorrect++; });
      const finalScore = answersPayload.length > 0 ? Math.round((totalCorrect / answersPayload.length) * 100) : 0;
      
      const currentLevelId = levelKeyMap.get(`${subjectArea}:${sessData.max_level}`);
      const updatePayload = { score: finalScore };
      if (currentLevelId) updatePayload.current_level_id = currentLevelId;
      
      await supabase.from('assessment_sessions').update(updatePayload).eq('id', sessionId);
      
      processedSessions.add(sessKey);
      insertCount++;
      if (insertCount % 100 === 0) console.log(`👉 Berhasil menyuntikkan ${insertCount} sesi yang hilang...`);
    }
  }
  
  console.log(`\n🎉 SELESAI! Berhasil menyuntikkan ${insertCount} sesi baru. Melewati ${skipCount} sesi yang sudah ada.`);
}

runFastBackfill().catch(console.error);
