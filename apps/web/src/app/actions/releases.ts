"use server";

import { createServerClient } from "@pemantik/supabase/client";

export async function uploadApkRelease(formData: FormData) {
  const supabase = createServerClient(); // service role - bypass RLS

  const file = formData.get("file") as File;
  const versionName = formData.get("versionName") as string;
  const versionCode = parseInt(formData.get("versionCode") as string);
  const releaseNotes = formData.get("releaseNotes") as string;
  const isMandatory = formData.get("isMandatory") === "true";

  if (!file || !versionName || !versionCode) {
    return { error: "Data tidak lengkap" };
  }

  // 1. Upload file ke bucket 'releases'
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
    console.error("Upload error:", uploadError);
    return { error: uploadError.message };
  }

  // 2. Dapatkan public URL
  const { data: publicUrlData } = supabase.storage
    .from("releases")
    .getPublicUrl(uploadData.path);

  // 3. Simpan ke database
  const { error: dbError } = await supabase.from("app_releases" as any).insert({
    version_name: versionName,
    version_code: versionCode,
    release_notes: releaseNotes || null,
    download_url: publicUrlData.publicUrl,
    is_mandatory: isMandatory,
    is_active: true,
  });

  if (dbError) {
    console.error("DB error:", dbError);
    return { error: dbError.message };
  }

  return { success: true, downloadUrl: publicUrlData.publicUrl };
}

export async function createExternalRelease(data: {
  versionName: string;
  versionCode: number;
  releaseNotes: string;
  isMandatory: boolean;
  downloadUrl: string;
}) {
  const supabase = createServerClient();

  const { error: dbError } = await supabase.from("app_releases" as any).insert({
    version_name: data.versionName,
    version_code: data.versionCode,
    release_notes: data.releaseNotes || null,
    download_url: data.downloadUrl,
    is_mandatory: data.isMandatory,
    is_active: true,
  });

  if (dbError) {
    console.error("DB error:", dbError);
    return { error: dbError.message };
  }

  return { success: true };
}

export async function updateRelease(id: string, data: any) {
  const supabase = createServerClient();
  const { error } = await supabase.from("app_releases" as any).update(data).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteRelease(id: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("app_releases" as any).delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}
