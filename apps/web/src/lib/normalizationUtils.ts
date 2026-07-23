/**
 * Utilitas untuk menormalisasi data dari input bebas (seperti Excel)
 * agar menjadi format baku dan mencegah error saat import ke database.
 */

/**
 * Menormalisasi Nomor Identitas (NIK, NISN, NIP, No HP).
 * Menghapus spasi, strip, karakter non-angka, dan menangani format scientific (1.98E+17).
 */
export function normalizeIdentityNumber(val: any): string | null {
  if (val === null || val === undefined || val === "") return null;
  
  let str = String(val).trim();

  // Tangani Scientific Notation dari Excel (misal: 1.98302E+17)
  if (typeof val === "number" || /^\d+\.\d+e\+\d+$/i.test(str)) {
    // Gunakan BigInt untuk menghindari kehilangan presisi pada angka > 15 digit (seperti NIP/NIK)
    try {
      str = BigInt(Math.round(Number(val))).toString();
    } catch {
      str = Number(val).toLocaleString('fullwide', { useGrouping: false });
    }
  }

  // Hapus semua karakter non-angka (seperti spasi, tanda hubung, titik)
  str = str.replace(/\D/g, "");

  // Perbaikan khusus untuk Nomor Telepon (jika diawali dengan 8, tambahkan 0 di depannya)
  if (str.length >= 9 && str.length <= 14 && str.startsWith("8")) {
    str = "0" + str;
  }

  return str || null;
}

/**
 * Menormalisasi String (terutama untuk pencarian Foreign Key seperti Nama Sekolah / Kelas).
 * - Menghapus spasi di awal & akhir (trim)
 * - Menggabungkan spasi ganda di tengah menjadi spasi tunggal
 * - Mengubah menjadi lowercase untuk pencocokan yang aman
 */
export function normalizeSearchString(val: any): string {
  if (!val) return "";
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " "); // Ubah spasi ganda/lebih menjadi spasi tunggal
}

/**
 * Menormalisasi Teks Umum (Nama Lengkap, Alamat).
 * Sama seperti di atas namun mempertahankan besar-kecil (capitalization) huruf aslinya.
 */
export function normalizeText(val: any): string | null {
  if (!val) return null;
  return String(val)
    .trim()
    .replace(/\s+/g, " "); // Ubah spasi ganda/lebih menjadi spasi tunggal
}

/**
 * Alias map untuk variabel SES (Pendidikan)
 */
export function normalizeEducation(val: any): string | null {
  if (!val) return null;
  const str = normalizeSearchString(val).replace(/[-.]/g, ""); // hilangkan titik dan strip (S.1 -> s1)
  
  if (str.includes("sarjana") || str === "s1" || str.includes("diploma 4") || str === "d4") return "s1";
  if (str === "s2" || str === "magister") return "s2";
  if (str === "s3" || str === "doktor") return "s3";
  if (str.includes("sma") || str.includes("smk") || str.includes("stm") || str.includes("slta") || str.includes("smu")) return "sma";
  if (str.includes("smp") || str.includes("mts") || str.includes("sltp")) return "smp";
  if (str.includes("sd") || str.includes("mi") || str.includes("sekolah dasar")) return "sd";
  if (str.includes("d1") || str.includes("d2") || str.includes("d3") || str.includes("diploma")) return "d1-d3";
  if (str.includes("tidak sekolah") || str.includes("tidak tamat")) return "tidak sekolah";
  
  return String(val).trim(); // kembalikan aslinya jika tidak cocok dengan alias utama
}

/**
 * Alias map untuk variabel SES (Pekerjaan)
 */
export function normalizeOccupation(val: any): string | null {
  if (!val) return null;
  const str = normalizeSearchString(val);

  if (str.includes("pns") || str.includes("pegawai negeri") || str.includes("asn")) return "pns";
  if (str.includes("tni") || str.includes("polri") || str.includes("polisi") || str.includes("tentara")) return "tni/polri";
  if (str.includes("swasta") || str.includes("karyawan")) return "karyawan swasta";
  if (str.includes("wiraswasta") || str.includes("pedagang") || str.includes("pengusaha") || str.includes("dagang")) return "wiraswasta";
  if (str.includes("petani") || str.includes("buruh tani") || str.includes("pekebun")) return "petani";
  if (str.includes("nelayan")) return "nelayan";
  if (str.includes("buruh")) return "buruh";
  if (str.includes("ibu rumah tangga") || str === "irt" || str.includes("mengurus rumah")) return "ibu rumah tangga";
  if (str.includes("tidak bekerja") || str.includes("pengangguran")) return "tidak bekerja";

  return String(val).trim(); // kembalikan aslinya jika tidak cocok
}

/**
 * Menormalisasi Tanggal Lahir dari berbagai format input (Excel number, string date, dsb).
 * Output akan selalu berupa format YYYY-MM-DD (ISO 8601) yang diterima database PostgreSQL.
 */
export function parseFlexibleDate(dateInput: any): string | null {
  if (!dateInput) return null;

  // Handle Excel Number Format (days since Jan 1, 1900)
  if (typeof dateInput === "number") {
    // 25569 is the number of days between Jan 1, 1900 and Jan 1, 1970
    const jsDate = new Date(Math.round((dateInput - 25569) * 86400 * 1000));
    return jsDate.toISOString().split("T")[0];
  }

  let str = String(dateInput).trim();
  if (!str) return null;

  // 1. Check if it's already ISO format (YYYY-MM-DD or YYYY/MM/DD)
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. Check for Indonesian format (DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY)
  const idMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (idMatch) {
    const day = idMatch[1].padStart(2, '0');
    const month = idMatch[2].padStart(2, '0');
    const year = idMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Try handling text based months (e.g., "12 Oktober 1990", "12 Oct 1990")
  const monthMap: Record<string, string> = {
    'januari': '01', 'jan': '01', 'january': '01',
    'februari': '02', 'feb': '02', 'february': '02',
    'maret': '03', 'mar': '03', 'march': '03',
    'april': '04', 'apr': '04',
    'mei': '05', 'may': '05',
    'juni': '06', 'jun': '06', 'june': '06',
    'juli': '07', 'jul': '07', 'july': '07',
    'agustus': '08', 'agu': '08', 'aug': '08', 'august': '08',
    'september': '09', 'sep': '09', 'sept': '09',
    'oktober': '10', 'okt': '10', 'oct': '10', 'october': '10',
    'november': '11', 'nov': '11',
    'desember': '12', 'des': '12', 'dec': '12', 'december': '12'
  };

  const textMatch = str.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthStr = textMatch[2];
    const year = textMatch[3];
    
    if (monthMap[monthStr]) {
      return `${year}-${monthMap[monthStr]}-${day}`;
    }
  }

  // 4. Fallback: try parsing with native Date constructor
  const fallbackDate = new Date(str);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate.toISOString().split("T")[0];
  }

  return null;
}
