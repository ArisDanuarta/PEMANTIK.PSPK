import * as XLSX from "xlsx";

export const runtime = "nodejs"; // Pastikan Node.js runtime, bukan Edge

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "Tidak ada file yang diupload" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      return Response.json({ error: "Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });

    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    // Ambil headers dari baris pertama
    const rawHeaders = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
    const headers = (rawHeaders || []).map((h: any) => String(h || "").trim()).filter(Boolean);

    // Ambil semua baris sebagai objek
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });

    return Response.json({
      success: true,
      fileName: file.name,
      totalRows: rows.length,
      headers,
      rows,
      sheetNames: wb.SheetNames,
    });
  } catch (err: any) {
    console.error("[parse-excel] Error:", err);
    return Response.json(
      { error: `Gagal membaca file: ${err.message}` },
      { status: 500 }
    );
  }
}
