export function normalizeSesName(rawName: string, type: "education" | "occupation"): string {
  if (!rawName) return "";

  // 1. Ubah jadi uppercase dan hapus whitespace ekstra
  let name = rawName.toString().toUpperCase().trim();

  // 2. Jika pendidikan, bersihkan variasi-variasi umum
  if (type === "education") {
    // Hapus kata-kata sederejat / tamat dsb
    name = name.replace(/\/SEDERAJAT/g, "");
    name = name.replace(/\/MI/g, "");
    name = name.replace(/\/MTS/g, "");
    name = name.replace(/\/SMK\/MA/g, "");
    name = name.replace(/\/SMK/g, "");
    name = name.replace(/\/MA/g, "");
    
    // Alias SD
    if (name === "SD" || name === "MI" || name === "SEKOLAH DASAR") return "SD";
    
    // Alias SMP
    if (name === "SMP" || name === "MTS" || name === "SLTP" || name === "SEKOLAH MENENGAH PERTAMA") return "SMP";
    
    // Alias SMA
    if (name === "SMA" || name === "SMK" || name === "MA" || name === "SLTA" || name === "SEKOLAH MENENGAH ATAS") return "SMA";
    
    // Alias Tidak Sekolah
    if (name === "TIDAK BERSEKOLAH" || name === "TIDAK TAMAT SD" || name === "BELUM SEKOLAH" || name === "TIDAK SEKOLAH") return "TIDAK SEKOLAH";

    // Alias Diploma
    if (name.includes("DIPLOMA")) {
      if (name.includes("1")) return "D1";
      if (name.includes("2")) return "D2";
      if (name.includes("3")) return "D3";
      if (name.includes("4")) return "D4";
      return "D3"; // Default jika hanya tertulis "Diploma"
    }

    // Alias format D-X atau D X atau D.X
    name = name.replace(/^D\s*[-\.]?\s*([1-4])$/, "D$1");

    // Alias Sarjana/Pascasarjana
    if (name === "SARJANA") return "S1";
    if (name === "MAGISTER") return "S2";
    if (name === "DOKTOR") return "S3";
  }

  // 3. Jika pekerjaan, bersihkan variasi-variasi umum
  if (type === "occupation") {
    if (name === "PEGAWAI SWASTA" || name === "KARYAWATI" || name === "PEGAWAI BUMN") return "KARYAWAN SWASTA";
    if (name === "TIDAK BEKERJA" || name === "MENGURUS RUMAH TANGGA" || name === "URUSAN RUMAH TANGGA") return "IBU RUMAH TANGGA";
    if (name === "PNS/TNI/POLRI" || name === "PNS" || name === "TNI" || name === "POLRI" || name === "PEGAWAI NEGERI SIPIL") return "ASN";
    if (name === "WIRASWASTA" || name === "WIRAUSAHA" || name === "PEDAGANG" || name === "PENGUSAHA") return "WIRASWASTA"; // Group jadi 1 atau tetap 2? Kita arahkan ke WIRASWASTA
    if (name === "PETANI/PETERNAK" || name === "PETERNAK" || name === "PERKEBUNAN") return "PETANI";
    if (name === "BURUH" || name === "BURUH TANI" || name === "BURUH HARIAN LEPAS") return "BURUH";
    if (name === "SUPIR" || name === "SOPIR") return "SUPIR";
    if (name === "LAINNYA" || name === "LAIN - LAIN") return "LAINNYA";
  }

  return name.trim();
}
