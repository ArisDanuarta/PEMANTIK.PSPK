"use client";

import React, { useState } from "react";
import { Button, useToast } from "@pemantik/ui";
import { useRouter } from "next/navigation";
import PemantikLogoProgress from "@/components/shared/Unitprogressbar";
import { createExternalRelease } from "@/app/actions/releases";

export default function RilisFormClient() {
  const { success, error } = useToast();
  const router = useRouter();

  const [uploadType, setUploadType] = useState<"file" | "link">("file");
  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [uploadedMB, setUploadedMB] = useState(0);
  const [totalMB, setTotalMB] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!versionName || !versionCode) {
      return error("Validasi Error", "Pastikan versi dan kode sudah diisi.");
    }

    if (uploadType === "file" && !file) {
      return error("Validasi Error", "Pastikan file APK sudah dipilih.");
    }

    if (uploadType === "file" && file && !file.name.endsWith(".apk")) {
      return error("Format Salah", "File yang diunggah harus berformat .apk");
    }

    if (uploadType === "link" && !externalUrl) {
      return error("Validasi Error", "Pastikan link eksternal sudah diisi.");
    }

    setLoading(true);

    try {
      if (uploadType === "link") {
        // Handle eksternal link dengan Server Action
        const result = await createExternalRelease({
          versionName,
          versionCode: parseInt(versionCode),
          releaseNotes,
          isMandatory,
          downloadUrl: externalUrl,
        });

        if (result.error) throw new Error(result.error);
        
      } else {
        // Handle upload file dengan XHR
        const sizeMB = file!.size / (1024 * 1024);
        setTotalMB(sizeMB);
        setUploadedMB(0);

        const formData = new FormData();
        formData.append("file", file!);
        formData.append("versionName", versionName);
        formData.append("versionCode", versionCode);
        formData.append("releaseNotes", releaseNotes);
        formData.append("isMandatory", String(isMandatory));

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload-apk");

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const uploadedMegabytes = event.loaded / (1024 * 1024);
              setUploadedMB(Math.min(uploadedMegabytes, sizeMB * 0.95));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              try {
                const body = JSON.parse(xhr.responseText);
                reject(new Error(body.error || "Gagal mengunggah."));
              } catch {
                reject(new Error(`Server error: ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Koneksi gagal. Periksa jaringan Anda.")));
          xhr.addEventListener("abort", () => reject(new Error("Upload dibatalkan.")));

          xhr.send(formData);
        });

        setUploadedMB(sizeMB * 0.95);
        await new Promise(resolve => setTimeout(resolve, 300));
        setUploadedMB(sizeMB);
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      success("Rilis Berhasil", `Versi ${versionName} berhasil diunggah.`);
      router.refresh();

      // Reset form
      setVersionName("");
      setVersionCode("");
      setReleaseNotes("");
      setIsMandatory(false);
      setFile(null);
      setExternalUrl("");

    } catch (err: any) {
      console.error(err);
      error("Gagal", err.message || "Gagal mengunggah rilis baru.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && uploadType === "file") {
    return (
      <div className="card" style={{ maxWidth: 600, padding: "3rem", textAlign: "center" }}>
        <h3 style={{ marginBottom: "2rem", color: "#102e50" }}>Sedang Mengunggah APK...</h3>
        <PemantikLogoProgress
          value={uploadedMB}
          max={totalMB || 1}
          size={150}
          durationMs={600}
          showLabel={false}
        />
        <div style={{ marginTop: "1.5rem", fontSize: "1.1rem", fontWeight: 600, color: "#e97e0e" }}>
          {uploadedMB.toFixed(1)} MB / {totalMB.toFixed(1)} MB
        </div>
        <div style={{
          marginTop: "0.75rem",
          background: "#f0f0f0",
          borderRadius: "9999px",
          height: "8px",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            background: "linear-gradient(90deg, #e97e0e, #f5a623)",
            borderRadius: "9999px",
            width: `${totalMB > 0 ? Math.min((uploadedMB / totalMB) * 100, 100) : 0}%`,
            transition: "width 0.5s ease",
          }} />
        </div>
        <p style={{ marginTop: "0.75rem", color: "#6b7280", fontSize: "0.85rem" }}>
          {totalMB > 0 ? `${Math.min(Math.round((uploadedMB / totalMB) * 100), 100)}%` : "0%"} — Mohon tunggu, jangan menutup halaman ini.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <h2 style={{ marginBottom: "1rem" }}>Unggah Rilis Baru</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        
        {/* Pilihan Tipe Upload */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input 
              type="radio" 
              name="uploadType" 
              value="file" 
              checked={uploadType === "file"} 
              onChange={() => setUploadType("file")} 
            />
            Unggah File APK
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input 
              type="radio" 
              name="uploadType" 
              value="link" 
              checked={uploadType === "link"} 
              onChange={() => setUploadType("link")} 
            />
            Gunakan Link Eksternal (Google Drive, dll)
          </label>
        </div>

        <div>
          <label className="form-label">Versi Aplikasi (Contoh: 1.0.1)</label>
          <input
            type="text"
            className="form-input"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="1.0.1"
            required
          />
        </div>
        <div>
          <label className="form-label">Version Code (Contoh: 2)</label>
          <input
            type="number"
            className="form-input"
            value={versionCode}
            onChange={(e) => setVersionCode(e.target.value)}
            placeholder="Harus angka bulat yang terus naik"
            required
          />
        </div>
        
        {/* Render input yang sesuai dengan tipe */}
        {uploadType === "file" ? (
          <div key="file-input-group">
            <label className="form-label">File APK</label>
            <input
              key="file-input"
              type="file"
              accept=".apk"
              className="form-input"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required={uploadType === "file"}
            />
            {file && (
              <p style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#6b7280" }}>
                {file.name} — {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
          </div>
        ) : (
          <div key="link-input-group">
            <label className="form-label">Link Eksternal APK</label>
            <input
              key="link-input"
              type="url"
              className="form-input"
              value={externalUrl || ""}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              required={uploadType === "link"}
            />
            <p style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#6b7280" }}>
              Pastikan link ini bisa diakses publik secara langsung.
            </p>
          </div>
        )}

        <div>
          <label className="form-label">Catatan Rilis (Release Notes)</label>
          <textarea
            className="form-input"
            rows={3}
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            placeholder="Fitur baru atau perbaikan bug..."
          />
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            id="isMandatory"
            checked={isMandatory}
            onChange={(e) => setIsMandatory(e.target.checked)}
          />
          <label htmlFor="isMandatory">Wajib Diperbarui (Mandatory Update)</label>
        </div>
        
        <div style={{ marginTop: "1rem" }}>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading && uploadType === "link" ? "Menyimpan..." : "Simpan & Rilis"}
          </Button>
        </div>
      </form>
    </div>
  );
}
