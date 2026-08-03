"use client";

import React, { useState, useTransition } from "react";
import { Button, Modal, useToast } from "@pemantik/ui";
import { generateSandboxSchoolAction } from "@/app/actions/sandbox";
import PemantikLogoProgress from "@/components/shared/Unitprogressbar";
import * as XLSX from "xlsx";

interface Category {
  id: string;
  name: string;
  subject_area: string;
}

interface GeneratingState {
  isGenerating: boolean;
  step: number;
  totalSteps: number;
  label: string;
}

export default function GenerateSekolahTrialModal({
  communityId,
  categories,
}: {
  communityId: string;
  categories: Category[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState<GeneratingState>({
    isGenerating: false,
    step: 0,
    totalSteps: 1,
    label: "Mempersiapkan...",
  });
  const { success, error } = useToast();

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const categoryIds = formData.getAll("category_ids");
    if (categoryIds.length === 0) {
      error("Gagal", "Pilih minimal 1 paket soal.");
      return;
    }
    formData.append("community_id", communityId);

    const numTeachers = parseInt(formData.get("num_teachers") as string, 10) || 2;
    const numStudents = parseInt(formData.get("num_students") as string, 10) || 10;

    // Total langkah: 1 admin + numTeachers guru + (numTeachers * numStudents) siswa + 1 simpan DB
    const totalSteps = 1 + numTeachers + numTeachers * numStudents + 1;

    // Mulai animasi loading SEGERA saat tombol diklik
    setGenerating({ isGenerating: true, step: 0, totalSteps, label: "Membuat akun Admin Sekolah..." });

    // Simulasikan progres animasi selama request berjalan
    let simulatedStep = 0;
    const interval = setInterval(() => {
      simulatedStep += 1;
      if (simulatedStep <= numTeachers) {
        setGenerating((g) => ({
          ...g,
          step: simulatedStep,
          label: `Membuat akun Guru ${simulatedStep} & Kelas...`,
        }));
      } else if (simulatedStep <= numTeachers + numTeachers * numStudents) {
        const teacherIdx = Math.ceil((simulatedStep - numTeachers) / numStudents);
        const studentIdx = (simulatedStep - numTeachers) % numStudents || numStudents;
        setGenerating((g) => ({
          ...g,
          step: simulatedStep,
          label: `Membuat Siswa ${studentIdx} di Kelas ${teacherIdx}...`,
        }));
      } else {
        setGenerating((g) => ({
          ...g,
          step: Math.min(totalSteps - 1, simulatedStep),
          label: "Menyimpan ke database & mengatur akses ujian...",
        }));
        clearInterval(interval);
      }
    }, 400);

    startTransition(async () => {
      const res = await generateSandboxSchoolAction(formData);
      clearInterval(interval);

      if (res.success && res.data) {
        // Selesaikan progres ke 100%
        setGenerating((g) => ({ ...g, step: totalSteps, label: "Selesai! Mengunduh kredensial..." }));

        setTimeout(() => {
          setGenerating({ isGenerating: false, step: 0, totalSteps: 1, label: "" });
          setIsOpen(false);
          success("Berhasil!", "Sekolah uji coba berhasil dibuat. File Excel sedang diunduh.");

          // ── Generate Excel ────────────────────────────────────────
          const wb = XLSX.utils.book_new();

          // Tab 1: Admin Sekolah
          const wsAdmin = XLSX.utils.aoa_to_sheet([
            ["Nama Sekolah", "URL Dashboard", "Username Admin", "Password"],
            [
              res.data.school.name,
              typeof window !== "undefined" ? `${window.location.origin}/login` : "",
              res.data.school.admin_username,
              res.data.school.admin_password,
            ],
          ]);
          XLSX.utils.book_append_sheet(wb, wsAdmin, "Admin Sekolah");

          // Tab 2: Guru
          const teacherRows = [["Nama Kelas", "Username Guru", "Password"]];
          res.data.teachers.forEach((t: any) => {
            teacherRows.push([t.className || "-", t.username, t.password || "pspk123"]);
          });
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(teacherRows), "Akun Guru");

          // Tab 3: Siswa
          const studentRows = [["Nama Kelas", "Username Siswa", "PIN"]];
          res.data.students.forEach((s: any) => {
            studentRows.push([s.className || "-", s.username, s.pin || "123456"]);
          });
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(studentRows), "Akun Siswa");

          XLSX.writeFile(wb, `Kredensial_Trial_${res.data.school.name}.xlsx`);
          setTimeout(() => window.location.reload(), 1500);
        }, 800);
      } else {
        setGenerating({ isGenerating: false, step: 0, totalSteps: 1, label: "" });
        error("Gagal", res.error || "Gagal meng-generate sekolah trial.");
      }
    });
  };

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        + Generate Sekolah Uji Coba
      </Button>

      <Modal
        open={isOpen}
        onClose={() => {
          if (!isPending) setIsOpen(false);
        }}
        title="Generate Sekolah Uji Coba"
        size="md"
      >
        {/* ── Tampilan Loading dengan Logo Pemantik ── */}
        {generating.isGenerating ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
              padding: "2.5rem 1rem",
              textAlign: "center",
            }}
          >
            <PemantikLogoProgress
              value={generating.step}
              max={generating.totalSteps}
              size={140}
              durationMs={400}
              showLabel={false}
            />

            {/* Label status */}
            <div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "#102e50",
                  margin: "0 0 0.25rem 0",
                }}
              >
                Sedang Membuat Akun Trial...
              </p>
              <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                {generating.label}
              </p>
            </div>

            {/* Progress bar teks */}
            <div
              style={{
                width: "100%",
                maxWidth: "320px",
                backgroundColor: "#f1f5f9",
                borderRadius: "999px",
                height: "8px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (generating.step / generating.totalSteps) * 100)}%`,
                  backgroundColor: "#f2af3e",
                  borderRadius: "999px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
              {generating.step} / {generating.totalSteps} langkah selesai
            </p>
          </div>
        ) : (
          /* ── Tampilan Form ── */
          <form
            onSubmit={handleFormSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div className="form-group">
              <label className="form-label">Nama Sekolah / Mitra</label>
              <input
                type="text"
                name="school_name"
                className="form-input"
                required
                placeholder="Contoh: SD Merdeka (Trial)"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Jumlah Guru (1 Kelas/Guru)</label>
                <input
                  type="number"
                  name="num_teachers"
                  className="form-input"
                  required
                  min="1"
                  max="10"
                  defaultValue="2"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Jumlah Siswa per Kelas</label>
                <input
                  type="number"
                  name="num_students"
                  className="form-input"
                  required
                  min="1"
                  max="50"
                  defaultValue="10"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Pilih Akses Ujian (Paket Soal)</label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  maxHeight: "150px",
                  overflowY: "auto",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.375rem",
                  padding: "0.75rem",
                  backgroundColor: "#fff",
                }}
              >
                {categories.length === 0 && <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Belum ada paket soal</span>}
                {categories.map((c) => (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                    <input type="checkbox" name="category_ids" value={c.id} style={{ width: "16px", height: "16px" }} />
                    {c.name} ({c.subject_area})
                  </label>
                ))}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fef3c7",
                padding: "1rem",
                borderRadius: "0.5rem",
                borderLeft: "4px solid #f59e0b",
                fontSize: "0.85rem",
                color: "#92400e",
              }}
            >
              <strong>Penting:</strong> Sistem akan membuatkan 1 Sekolah, Akun Admin, Akun Guru,
              Entitas Kelas, beserta Siswa-siswanya. Hak akses ujian akan langsung dibypass tanpa
              perlu Pengajuan Fase. Semua kredensial akan otomatis diunduh dalam format Excel.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" loading={isPending}>
                Generate & Download Excel
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
