/**
 * lib/buildEntities.js
 * -----------------------------------------------------------------------
 * Ambil array `sessions` (hasil parseOldExportFile) dan susun jadi
 * entity-entity ternormalisasi: communities, schools, classes, students.
 *
 * Dedup siswa: kunci utama (organisasiUser, oldIdUser) -- ini paling
 * reliable karena id_user konsisten dipakai berulang untuk siswa yang
 * sama di semua sheet/level pada 1 file yang sama.
 *
 * Sebagai pengaman tambahan, kita JUGA hitung fingerprint
 * (nama+sekolah+kelas) dan kasih WARNING kalau ada 2 oldIdUser berbeda
 * dengan fingerprint identik (kemungkinan orang yang sama, gagal ke-
 * dedup) -- ini yang perlu direview manual, BUKAN di-auto-merge.
 * -----------------------------------------------------------------------
 */

function slugUsername(name, suffix) {
  const base = (name || 'siswa')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16);
  return `${base}${suffix}`;
}

function buildEntities(allSessions) {
  const communities = new Map(); // key: organisasiUser -> {name}
  const schools = new Map();     // key: organisasiUser||asalSekolah -> {name, communityKey}
  const classes = new Map();     // key: organisasiUser||asalSekolah||kelasRaw -> {name, grade, schoolKey}
  const students = new Map();    // key: organisasiUser||oldIdUser -> student record
  const fingerprintIndex = new Map(); // key: organisasiUser||asalSekolah||nama||kelas -> [studentKeys]
  const dedupWarnings = [];

  let usernameCounter = 1;

  for (const s of allSessions) {
    if (!s.organisasiUser || !s.asalSekolah) continue;

    const communityKey = s.organisasiUser;
    if (!communities.has(communityKey)) {
      communities.set(communityKey, { name: s.organisasiUser });
    }

    const schoolKey = `${communityKey}||${s.asalSekolah}`;
    if (!schools.has(schoolKey)) {
      schools.set(schoolKey, { name: s.asalSekolah, communityKey });
    }

    const classKey = `${schoolKey}||${s.kelasRaw}`;
    if (!classes.has(classKey) && s.kelasRaw) {
      classes.set(classKey, { name: s.kelasRaw, grade: s.grade, schoolKey });
    }

    const studentKey = `${communityKey}||${s.oldIdUser}`;
    if (!students.has(studentKey)) {
      const suffix = usernameCounter++;
      students.set(studentKey, {
        oldIdUser: s.oldIdUser,
        namaSiswa: s.namaSiswa,
        gender: s.gender,
        tglLahirSiswa: s.tglLahirSiswa,
        umurSiswa: s.umurSiswa,
        asalProvinsi: s.asalProvinsi,
        asalKabupatenKota: s.asalKabupatenKota,
        asalKecamatan: s.asalKecamatan,
        asalKelurahan: s.asalKelurahan,
        pekerjaanAyah: s.pekerjaanAyah,
        pekerjaanIbu: s.pekerjaanIbu,
        pendidikanAyah: s.pendidikanAyah,
        pendidikanIbu: s.pendidikanIbu,
        ses: s.ses,
        schoolKey,
        classKey,
        username: slugUsername(s.namaSiswa, suffix),
        sessionKeys: [],
      });

      const fp = `${schoolKey}||${s.namaSiswa}||${s.kelasRaw}`;
      if (!fingerprintIndex.has(fp)) fingerprintIndex.set(fp, []);
      fingerprintIndex.get(fp).push(studentKey);
    }

    students.get(studentKey).sessionKeys.push(s);
  }

  // Cari fingerprint yang punya >1 oldIdUser berbeda -> flag review
  for (const [fp, keys] of fingerprintIndex.entries()) {
    const uniqueKeys = [...new Set(keys)];
    if (uniqueKeys.length > 1) {
      dedupWarnings.push(
        `Kemungkinan duplikat: "${fp}" punya ${uniqueKeys.length} oldIdUser berbeda (${uniqueKeys
          .map((k) => k.split('||')[1])
          .join(', ')}). Cek manual sebelum import.`
      );
    }
  }

  return { communities, schools, classes, students, dedupWarnings };
}

module.exports = { buildEntities, slugUsername };
