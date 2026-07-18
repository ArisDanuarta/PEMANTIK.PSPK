"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button, Badge, useToast, useConfirm } from "@pemantik/ui";
import {
  createClassAction,
  updateClassAction,
  deleteClassAction,
  toggleClassStatusAction,
} from "@/app/actions/classes";

interface ClassRow {
  id: string;
  name: string;
  grade: number;
  academic_year: string | null;
  is_active: boolean;
  users: { id: string; full_name: string } | null;
  students: { count: number }[];
}

interface Teacher {
  id: string;
  full_name: string;
}

interface KelasManagerProps {
  initialClasses: ClassRow[];
  teachers: Teacher[];
  schoolId: string;
}

export default function KelasManager({ initialClasses, teachers, schoolId }: KelasManagerProps) {
  const [classes, setClasses] = useState<ClassRow[]>(initialClasses);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { success: showSuccess, error: showError } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isModalOpen]);

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.users?.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => { setEditingClass(null); setIsModalOpen(true); };
  const handleOpenEdit = (cls: ClassRow) => { setEditingClass(cls); setIsModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("school_id", schoolId);

    startTransition(async () => {
      const res = editingClass
        ? await updateClassAction(editingClass.id, fd)
        : await createClassAction(fd);

      if (res.success) {
        showSuccess("Berhasil", res.message ?? "Data kelas disimpan.");
        setIsModalOpen(false);
        window.location.reload();
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const handleToggleStatus = async (cls: ClassRow) => {
    const action = cls.is_active ? "nonaktifkan" : "aktifkan";
    const ok = await confirm({
      title: `${cls.is_active ? "Nonaktifkan" : "Aktifkan"} Kelas`,
      description: `Apakah Anda yakin ingin ${action} kelas ${cls.name}?`,
      confirmLabel: "Ya, lanjutkan",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await toggleClassStatusAction(cls.id, !cls.is_active);
      if (res.success) {
        showSuccess("Berhasil", res.message ?? "Status kelas diperbarui.");
        setClasses((prev) =>
          prev.map((c) => c.id === cls.id ? { ...c, is_active: !cls.is_active } : c)
        );
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const handleDelete = async (cls: ClassRow) => {
    const studentCount = cls.students?.[0]?.count ?? 0;
    if (studentCount > 0) {
      await confirm({
        title: "Tidak Dapat Menghapus Kelas",
        description: `Kelas "${cls.name}" masih memiliki ${studentCount} siswa. Pindahkan siswa ke kelas lain terlebih dahulu.`,
        confirmLabel: "Mengerti",
        cancelLabel: "",
      });
      return;
    }
    const ok = await confirm({
      title: "Hapus Kelas",
      description: `Apakah Anda yakin ingin menghapus kelas "${cls.name}"? Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: "Ya, Hapus",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteClassAction(cls.id);
      if (res.success) {
        showSuccess("Berhasil", res.message ?? "Kelas dihapus.");
        setClasses((prev) => prev.filter((c) => c.id !== cls.id));
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const currentYear = new Date().getFullYear();
  const academicYearOptions = [
    `${currentYear - 1}/${currentYear}`,
    `${currentYear}/${currentYear + 1}`,
    `${currentYear + 1}/${currentYear + 2}`,
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Controls ── */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Cari nama kelas atau guru..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: "200px", maxWidth: "360px" }}
          />
          <div style={{ marginLeft: "auto" }}>
            <Button onClick={handleOpenAdd} style={{ backgroundColor: "#102e50", color: "white" }}>
              + Tambah Kelas
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats Summary ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {[
          { label: "Total Kelas", value: classes.length, color: "#102e50" },
          { label: "Kelas Aktif", value: classes.filter(c => c.is_active).length, color: "#2d9e5f" },
          { label: "Total Anak", value: classes.reduce((sum, c) => sum + (c.students?.[0]?.count ?? 0), 0), color: "#df632f" },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ textAlign: "center", padding: "1.25rem" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.8rem", color: "#6c757d", marginTop: "0.25rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabel ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="pemantik-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Nama Kelas</th>
              <th>Tingkat</th>
              <th>Guru Pengampu</th>
              <th>Jumlah Anak</th>
              <th>Tahun Ajaran</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "3rem 1rem", color: "#adb5bd" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏫</div>
                  {search ? "Tidak ada kelas yang cocok dengan pencarian." : "Belum ada kelas. Klik \"Tambah Kelas\" untuk mulai."}
                </td>
              </tr>
            ) : filtered.map((cls) => {
              const studentCount = cls.students?.[0]?.count ?? 0;
              return (
                <tr key={cls.id}>
                  <td><div style={{ fontWeight: 600, color: "#102e50" }}>{cls.name}</div></td>
                  <td>
                    <span style={{ padding: "0.2rem 0.6rem", backgroundColor: "#f3f4f6", borderRadius: "0.375rem", fontSize: "0.85rem", fontWeight: 600 }}>
                      Kelas {cls.grade}
                    </span>
                  </td>
                  <td>
                    {cls.users ? (
                      <div style={{ fontSize: "0.875rem" }}>{cls.users.full_name}</div>
                    ) : (
                      <span style={{ color: "#adb5bd", fontSize: "0.8rem", fontStyle: "italic" }}>Belum ditugaskan</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 700, color: "#102e50" }}>{studentCount}</span>
                      <span style={{ fontSize: "0.75rem", color: "#6c757d" }}>anak</span>
                    </div>
                  </td>
                  <td><span style={{ fontSize: "0.85rem", color: "#4b5563" }}>{cls.academic_year ?? "-"}</span></td>
                  <td><Badge variant={cls.is_active ? "success" : "danger"}>{cls.is_active ? "Aktif" : "Nonaktif"}</Badge></td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <Button variant="outline" size="sm" onClick={() => handleOpenEdit(cls)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggleStatus(cls)} style={{ color: cls.is_active ? "#df632f" : "#2d9e5f" }}>
                        {cls.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(cls)} style={{ color: "#dc2626" }}>Hapus</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #f1f3f5", fontSize: "0.8rem", color: "#6c757d" }}>
            Menampilkan <strong>{filtered.length}</strong> dari <strong>{classes.length}</strong> kelas
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {isModalOpen && mounted && createPortal(
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(16,46,80,0.5)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem", overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            className="animate-scale-in"
            style={{ backgroundColor: "white", padding: "2rem", borderRadius: "0.75rem", width: "100%", maxWidth: "540px", margin: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#102e50", marginBottom: "1.5rem" }}>
              {editingClass ? "Edit Kelas" : "Tambah Kelas Baru"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label className="form-label">Nama Kelas <span style={{ color: "#dc2626" }}>*</span></label>
                  <input name="name" className="form-input" defaultValue={editingClass?.name ?? ""} placeholder="Contoh: 5A, Kelas 6 Merpati..." required />
                </div>
                <div>
                  <label className="form-label">Tingkat Kelas <span style={{ color: "#dc2626" }}>*</span></label>
                  <select name="grade" className="form-input" defaultValue={editingClass?.grade ?? 1} required>
                    {[1,2,3,4,5,6].map((g) => <option key={g} value={g}>Kelas {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Guru Pengampu</label>
                  <select name="teacher_id" className="form-input" defaultValue={editingClass?.users?.id ?? ""}>
                    <option value="">- Pilih Guru (opsional) -</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Tahun Ajaran</label>
                  <select name="academic_year" className="form-input" defaultValue={editingClass?.academic_year ?? academicYearOptions[1]}>
                    {academicYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.75rem" }}>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isPending} style={{ backgroundColor: "#102e50", color: "white" }}>
                  {isPending ? <><span className="btn-spinner" /> Menyimpan...</> : (editingClass ? "Simpan Perubahan" : "Tambah Kelas")}
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
