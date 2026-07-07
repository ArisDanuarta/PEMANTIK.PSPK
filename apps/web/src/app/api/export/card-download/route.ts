import { GET as detailedResultsGet } from "../detailed-results/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/card-download
 *
 * Mengalihkan/meneruskan unduhan kartu ringkasan (Phase, Level, Sekolah, Kelas)
 * agar menghasilkan file Excel lengkap 5 Sheet yang sama seperti ekspor utama.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const categoryId = searchParams.get("category_id");
  const filterValue = searchParams.get("filter_value");
  const scopeType = searchParams.get("scope_type");
  const scopeId = searchParams.get("scope_id");

  if (!type || !categoryId || !filterValue || !scopeType || !scopeId) {
    return NextResponse.json(
      { error: "Parameter type, category_id, filter_value, scope_type, scope_id wajib diisi." },
      { status: 400 }
    );
  }

  // Bangun URL baru untuk detailed-results
  const newUrl = new URL(request.url);
  newUrl.pathname = "/api/export/detailed-results";
  newUrl.searchParams.set("category_id", categoryId);

  // Set target_type & target_id sesuai scope
  if (type === "school") {
    newUrl.searchParams.set("target_type", "school");
    newUrl.searchParams.set("target_id", filterValue);
  } else {
    newUrl.searchParams.set("target_type", scopeType);
    newUrl.searchParams.set("target_id", scopeId);

    if (type === "phase") {
      newUrl.searchParams.set("phase", filterValue);
    } else if (type === "class") {
      newUrl.searchParams.set("class_id", filterValue);
    } else if (type === "level") {
      newUrl.searchParams.set("level", filterValue);
    }
  }

  // Buat Request baru dengan headers dan parameter yang sudah diterjemahkan
  const newReq = new Request(newUrl.toString(), {
    method: request.method,
    headers: request.headers,
  });

  return detailedResultsGet(newReq);
}
