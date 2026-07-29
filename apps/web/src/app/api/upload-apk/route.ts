import { createServerClient } from "@pemantik/supabase";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Verifikasi user adalah super_admin
  const headersList = await headers();
  const userRole = headersList.get("x-user-role");

  if (userRole !== "super_admin") {
    return NextResponse.json(
      { error: "Hanya Super Admin yang dapat mengunggah rilis." },
      { status: 403 }
    );
  }

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error("FormData parse error:", err);
    return NextResponse.json({ error: "Gagal membaca data form." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const versionName = formData.get("versionName") as string | null;
  const versionCode = parseInt(formData.get("versionCode") as string);
  const releaseNotes = formData.get("releaseNotes") as string | null;
  const isMandatory = formData.get("isMandatory") === "true";

  if (!file || !versionName || isNaN(versionCode)) {
    return NextResponse.json(
      { error: "Data tidak lengkap: file, versionName, versionCode wajib diisi." },
      { status: 400 }
    );
  }

  // 3. Upload ke Supabase Storage dengan service role (bypass RLS)
  const supabase = createServerClient();
  const fileName = `pemantik-${versionName}-${Date.now()}.apk`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("releases")
    .upload(fileName, buffer, {
      contentType: "application/vnd.android.package-archive",
      upsert: true,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 4. Dapatkan public URL
  const { data: publicUrlData } = supabase.storage
    .from("releases")
    .getPublicUrl(uploadData.path);

  // 5. Simpan record ke tabel app_releases
  const { error: dbError } = await supabase.from("app_releases" as any).insert({
    version_name: versionName,
    version_code: versionCode,
    release_notes: releaseNotes || null,
    download_url: publicUrlData.publicUrl,
    is_mandatory: isMandatory,
    is_active: true,
  });

  if (dbError) {
    console.error("DB insert error:", dbError);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    downloadUrl: publicUrlData.publicUrl,
    versionName,
  });
}
