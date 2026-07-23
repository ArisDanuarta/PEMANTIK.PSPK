"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button, Badge, useToast, useConfirm } from "@pemantik/ui";
import * as XLSX from "xlsx";
import {
  createTeacherAction,
  updateTeacherAction,
  deleteTeacherAction,
  bulkCreateTeachersAction,
  bulkDeleteTeachersAction,
} from "@/app/actions/teachers";
import BulkUploadModal from "@/components/shared/BulkUploadModal";

interface TeacherRow {
  id: string;
  full_name: string;
  username: string;
  email?: string;
  nip: string | null;
  gender: string | null;
  is_active: boolean;
  created_at: string;
  birth_date?: string | null;
  village?: string | null;
  district?: string | null;
  city?: string | null;
  province?: string | null;
  classes: { id: string; name: string; grade: number }[];
}

interface ClassOption { id: string; name: string; grade: number; }

interface Props {
  initialTeachers: TeacherRow[];
  classes: ClassOption[];
  schoolId: string;
}

const EXCEL_COLUMNS = [
  "nama_guru", "email", "jenis_kelamin", "tanggal_lahir", "npsn",
  "nama_sekolah", "kelas", "nip", "kelurahan", "kecamatan", "kabupaten", "provinsi",
];

export default function TeachersManagerSekolah({ initialTeachers, classes, schoolId }: Props) {
  const [teachers, setTeachers] = useState<TeacherRow[]>(initialTeachers);
  const [search, setSearch] = useState("");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { success: showSuccess, error: showError } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    document.body.style.overflow = isManualModalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isManualModalOpen]);

  const filtered = teachers.filter((t) => {
    const matchSearch =
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.username ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.nip ?? "").toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const handleOpenAdd = () => { setEditingTeacher(null); setIsManualModalOpen(true); };
  const handleOpenEdit = (t: TeacherRow) => { setEditingTeacher(t); setIsManualModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("school_id", schoolId);

    startTransition(async () => {
      const res = editingTeacher
        ? await updateTeacherAction(editingTeacher.id, fd)
        : await createTeacherAction(fd);

      if (res.success) {
        showSuccess("Berhasil", res.message ?? "Data guru berhasil disimpan.");
        setIsManualModalOpen(false);
        window.location.reload();
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const handleDelete = async (t: TeacherRow) => {
    const ok = await confirm({
      title: "Hapus Guru",
      description: `Apakah Anda yakin ingin menghapus guru "${t.full_name}"? Akun guru akan dihapus permanen.`,
      confirmLabel: "Ya, Hapus",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteTeacherAction(t.id);
      if (res.success) {
        showSuccess("Berhasil", res.message ?? "Guru dihapus.");
        setTeachers((prev) => prev.filter((x) => x.id !== t.id));
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const handleBulkUpload = async (rows: any[]) => {
    const enrichedRows = rows.map((row) => ({ ...row, school_id: schoolId }));
    const res = await bulkCreateTeachersAction(enrichedRows);
    return res;
  };

  const handleRollback = async (ids: string[]) => {
    await bulkDeleteTeachersAction(ids);
  };

  const handleDownloadTemplate = () => {
    const headers = ["nama_guru", "nip", "email_guru", "jenis_kelamin", "tanggal_lahir", "nama_sekolah", "kelas", "kelurahan_desa", "kecamatan", "kabupaten", "provinsi"];
    const wsData = [
      headers,
      ["Budi Santoso", "198001012005011003", "budi@sekolah.com", "L", "1980-01-01", "Sekolah Contoh", "5A", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Petunjuk Sheet
    const petunjukData = [
      ["Kolom", "Wajib?", "Keterangan / Contoh"],
      ["nama_guru", "Ya", "Nama lengkap guru."],
      ["nip", "Tidak", "Nomor Induk Pegawai."],
      ["email_guru", "Tidak", "Email aktif guru."],
      ["jenis_kelamin", "Ya", "L untuk Laki-laki, P untuk Perempuan."],
      ["tanggal_lahir", "Ya", "Format YYYY-MM-DD (Misal: 1980-01-01)."],
      ["nama_sekolah", "Ya", "Pastikan ejaan nama sekolah persis sama dengan yang terdaftar."],
      ["kelas", "Tidak", "Daftar kelas yang diajar. Pisahkan dengan koma jika lebih dari satu (Misal: 5A, 6B)."],
      ["kelurahan_desa", "Ya", "Kelurahan / Desa domisili/sekolah."],
      ["kecamatan", "Ya", "Kecamatan domisili/sekolah."],
      ["kabupaten", "Ya", "Kabupaten / Kota."],
      ["provinsi", "Ya", "Provinsi."]
    ];
    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk Pengisian");
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    
    const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
    ws['!cols'] = colWidths;
    wsPetunjuk['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 50 }];

    XLSX.writeFile(wb, "Template_Guru_Sekolah.xlsx");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Controls ── */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text" className="form-input"
            placeholder="Cari nama, email, atau NIP..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: "200px", maxWidth: "320px" }}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto", flexWrap: "wrap" }}>
            <Button variant="outline" onClick={handleDownloadTemplate} style={{ color: "#0874aa", borderColor: "#0874aa" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.35rem" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download Template
            </Button>
            <Button variant="outline" onClick={() => setIsBulkModalOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.35rem" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import Excel
            </Button>
            <Button onClick={handleOpenAdd} style={{ backgroundColor: "#102e50", color: "white" }}>+ Tambah Guru</Button>
          </div>
        </div>
      </div>

      {/* ── Tabel ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="pemantik-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Nama Guru</th><th>Akun Akses</th><th>Kelas Diajar</th>
              <th>Gender</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "3rem 1rem", color: "#adb5bd" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👨‍🏫</div>
                {search ? "Tidak ada guru yang cocok." : "Belum ada guru terdaftar di sekolah ini."}
              </td></tr>
            ) : filtered.map((t) => (
              <tr key={t.id}>
                <td><div style={{ fontWeight: 600, color: "#102e50" }}>{t.full_name}</div></td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                    <div><span style={{ color: "#6c757d" }}>User:</span> <strong>{t.username}</strong></div>
                    <div><span style={{ color: "#6c757d" }}>Pass:</span> <code style={{ color: "#a8281c" }}>Password123!</code></div>
                  </div>
                  {t.nip && <div style={{ fontSize: "0.78rem", color: "#6c757d", marginTop: "0.25rem" }}>NIP: {t.nip}</div>}
                </td>
                <td>
                  {t.classes && t.classes.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                      {t.classes.map((c: any) => (
                        <span key={c.id} style={{ padding: "0.15rem 0.4rem", backgroundColor: "#eff6ff", color: "#1d4ed8", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: 500 }}>{c.name}</span>
                      ))}
                    </div>
                  ) : <span style={{ color: "#adb5bd", fontSize: "0.8rem" }}>-</span>}
                </td>
                <td style={{ fontSize: "0.85rem" }}>{t.gender === "L" ? "Laki-laki" : t.gender === "P" ? "Perempuan" : "-"}</td>
                <td><Badge variant={t.is_active ? "success" : "danger"}>{t.is_active ? "Aktif" : "Nonaktif"}</Badge></td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(t)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(t)} style={{ color: "#dc2626" }}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #f1f3f5", fontSize: "0.8rem", color: "#6c757d" }}>
            Menampilkan <strong>{filtered.length}</strong> dari <strong>{teachers.length}</strong> guru
          </div>
        )}
      </div>

      {/* ── Bulk Upload ── */}
      {isBulkModalOpen && mounted && (
        <BulkUploadModal
          onClose={() => setIsBulkModalOpen(false)}
          onUpload={handleBulkUpload}
          onRollback={handleRollback}
          templateHeaders={EXCEL_COLUMNS}
          title="Import Guru via Excel"
          templateFileName="template_guru_sekolah.xlsx"
        />
      )}

      {/* ── Manual Modal ── */}
      {isManualModalOpen && mounted && createPortal(
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(16,46,80,0.5)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem", overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsManualModalOpen(false); }}
        >
          <div
            className="animate-scale-in"
            style={{ backgroundColor: "white", padding: "2rem", borderRadius: "0.75rem", width: "100%", maxWidth: "580px", margin: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#102e50", marginBottom: "1.5rem" }}>
              {editingTeacher ? "Edit Guru" : "Tambah Guru Baru"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Daftar Kelas *</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "150px", overflowY: "auto", border: "1px solid #e5e7eb", padding: "0.75rem", borderRadius: "0.375rem" }}>
                    {classes.length > 0 ? (
                      classes.map((c) => {
                        const isChecked = editingTeacher?.classes?.some((ec: any) => ec.name === c.name);
                        return (
                          <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                            <input type="checkbox" name="class_ids" value={c.id} defaultChecked={isChecked} />
                            Kelas {c.grade} - {c.name}
                          </label>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>Belum ada kelas di sekolah ini.</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Nama Lengkap *</label>
                  <input type="text" name="full_name" required defaultValue={editingTeacher?.full_name} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Email (Opsional)</label>
                  <input type="email" name="email" defaultValue={editingTeacher?.email ?? ""} className="form-input" style={{ width: "100%" }} disabled={!!editingTeacher} />
                  {editingTeacher && <p style={{ fontSize: "0.75rem", color: "#6c757d", marginTop: "0.25rem" }}>Email tidak bisa diubah.</p>}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Tanggal Lahir *</label>
                  <input type="date" name="birth_date" required defaultValue={editingTeacher?.birth_date as any} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Gender *</label>
                  <select name="gender" required defaultValue={editingTeacher?.gender ?? ""} className="form-input" style={{ width: "100%" }}>
                    <option value="">-- Pilih --</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>NIP (Opsional)</label>
                  <input type="text" name="nip" defaultValue={editingTeacher?.nip ?? ""} className="form-input" style={{ width: "100%" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kelurahan / Desa *</label>
                  <input type="text" name="village" required defaultValue={(editingTeacher as any)?.village ?? ""} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kecamatan *</label>
                  <input type="text" name="district" required defaultValue={(editingTeacher as any)?.district ?? ""} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kabupaten / Kota *</label>
                  <input type="text" name="regency" required defaultValue={(editingTeacher as any)?.city ?? ""} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Provinsi *</label>
                  <input type="text" name="province" required defaultValue={(editingTeacher as any)?.province ?? ""} className="form-input" style={{ width: "100%" }} />
                </div>
              </div>

              {!editingTeacher && (
                <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "1.5rem" }}>
                  * Password default untuk guru baru adalah <b>Password123!</b>
                </div>
              )}
              
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isPending} style={{ backgroundColor: "#102e50", color: "white" }}>
                  {isPending ? <><span className="btn-spinner" /> Menyimpan...</> : (editingTeacher ? "Simpan Perubahan" : "Tambah Guru")}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
