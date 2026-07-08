import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";

/**
 * GET /api/dapodik-import/[batchId]
 *
 * Polling endpoint untuk status import Dapodik.
 * Frontend memanggil ini tiap 2 detik hingga status final.
 * Hanya bisa diakses oleh super_admin.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;

    if (!batchId) {
      return NextResponse.json({ error: "batch ID diperlukan." }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verifikasi user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "super_admin") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    // Ambil status batch
    const { data: batch, error } = await (supabase as any)
      .from("dapodik_import_batches")
      .select(
        "id, status, total_rows, success_count, fail_count, errors, warnings, new_ses_variables, created_at, completed_at, school_id"
      )
      .eq("id", batchId)
      .single();

    if (error || !batch) {
      return NextResponse.json({ error: "Batch tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      batch_id: batch.id,
      status: batch.status,                            // queued | processing | completed | completed_with_errors | failed
      total_rows: batch.total_rows,
      success_count: batch.success_count,
      fail_count: batch.fail_count,
      errors: batch.errors ?? [],
      warnings: batch.warnings ?? [],
      new_ses_variables: batch.new_ses_variables ?? [],
      school_id: batch.school_id,
      created_at: batch.created_at,
      completed_at: batch.completed_at,
      is_done: ["completed", "completed_with_errors", "failed"].includes(batch.status),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Terjadi kesalahan server: " + err.message },
      { status: 500 }
    );
  }
}
