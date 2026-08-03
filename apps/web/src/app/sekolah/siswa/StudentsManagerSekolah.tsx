"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button, Badge, useToast, useConfirm } from "@pemantik/ui";
import * as XLSX from "xlsx";
import {
  createStudentAction,
  updateStudentAction,
  deleteStudentAction,
  resetStudentPasswordAction,
  bulkCreateStudentsAction,
  bulkDeleteStudentsAction,
} from "@/app/actions/students";
import { 
  requestRetakeAction, 
  bulkRequestRetakeAction, 
  getSchoolAvailableAssessmentsAction,
  getCategoryLevelsAction
} from "@/app/actions/retake-requests";
import BulkUploadModal from "@/components/shared/BulkUploadModal";
import Pagination from "@/components/shared/Pagination";
import { usePagination } from "@/lib/usePagination";

interface StudentRow {
  id: string;
  full_name: string;
  nisn: string | null;
  gender: string | null;
  birth_date: string | null;
  username: string | null;
  is_active: boolean;
  ses_class: string | null;
  classes: { id: string; name: string; grade: number } | null;
  village?: string;
  district?: string;
  city?: string;
  province?: string;
  father_education_id?: string;
  mother_education_id?: string;
  father_occupation_id?: string;
  mother_occupation_id?: string;
  schools?: { npsn: string | null; name: string | null };
}

interface ClassOption { id: string; name: string; grade: number; }

interface Props {
  initialStudents: StudentRow[];
  classes: ClassOption[];
  schoolId: string;
  sesVariables: any[];
}

const EXCEL_COLUMNS = ["nama_siswa", "nisn", "npsn", "jenis_kelamin", "tanggal_lahir", "nama_sekolah", "kelas", "pekerjaan_ibu", "pekerjaan_ayah", "pendidikan_ibu", "pendidikan_ayah", "kelurahan_desa", "kecamatan", "kabupaten", "provinsi"];

export default function StudentsManagerSekolah({ initialStudents, classes, schoolId, sesVariables }: Props) {
  const [students, setStudents] = useState<StudentRow[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [retakeModalOpen, setRetakeModalOpen] = useState(false);
  const [retakeStudent, setRetakeStudent] = useState<StudentRow | null>(null);
  const [retakeReason, setRetakeReason] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkRetakeModalOpen, setIsBulkRetakeModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  
  // States for Retake dropdowns
  const [schoolAssessments, setSchoolAssessments] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("");
  const [selectedLevelName, setSelectedLevelName] = useState("");
  const [isFetchingData, setIsFetchingData] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { success: showSuccess, error: showError } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    document.body.style.overflow = isManualModalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isManualModalOpen]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.nisn ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.username ?? "").toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === "all" || s.classes?.id === classFilter;
      const matchGender = genderFilter === "all" || s.gender === genderFilter;
      return matchSearch && matchClass && matchGender;
    });
  }, [students, search, classFilter, genderFilter]);

  const {
    paginatedData: paginatedStudents,
    currentPage,
    totalPages,
    totalItems,
    setCurrentPage,
    startIndex,
    endIndex,
  } = usePagination(filtered, 20);

  const handleOpenAdd = () => { setEditingStudent(null); setIsManualModalOpen(true); };
  const handleOpenEdit = (s: StudentRow) => { setEditingStudent(s); setIsManualModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("school_id", schoolId);

    startTransition(async () => {
      const res = editingStudent
        ? await updateStudentAction(editingStudent.id, fd)
        : await createStudentAction(fd);

      if (res.success) {
        showSuccess("Berhasil", res.message ?? "Data anak berhasil disimpan.");
        setIsManualModalOpen(false);
        window.location.reload();
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const handleDelete = async (s: StudentRow) => {
    const ok = await confirm({
      title: "Hapus Anak",
      description: `Hapus siswa "${s.full_name}"? Semua data ujian yang terkait juga akan terpengaruh.`,
      confirmLabel: "Ya, Hapus",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteStudentAction(s.id);
      if (res.success) {
        showSuccess("Berhasil", res.message ?? "Anak dihapus.");
        setStudents((prev) => prev.filter((x) => x.id !== s.id));
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const handleResetPassword = async (s: StudentRow) => {
    const ok = await confirm({
      title: "Reset PIN Anak",
      description: `PIN akses "${s.full_name}" akan direset ke default. Lanjutkan?`,
      confirmLabel: "Ya, Reset",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await resetStudentPasswordAction(s.id);
      if (res.success) {
        showSuccess("Berhasil", res.message ?? "PIN direset.");
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const handleBulkUpload = async (rows: any[]) => {
    const enriched = rows.map((r) => ({ ...r, school_id: schoolId }));
    const res = await bulkCreateStudentsAction(enriched);
    return res;
  };

  const handleRollback = async (ids: string[]) => {
    await bulkDeleteStudentsAction(ids);
  };

  const handleOpenRetake = async (s: StudentRow) => {
    setRetakeStudent(s);
    setRetakeReason("");
    setSelectedCategoryId("");
    setSelectedPhase("");
    setSelectedLevelName("");
    setLevels([]);
    setRetakeModalOpen(true);
    
    if (schoolAssessments.length === 0) {
      setIsFetchingData(true);
      const res = await getSchoolAvailableAssessmentsAction(schoolId);
      if (res.success) {
        setSchoolAssessments(res.data || []);
      }
      setIsFetchingData(false);
    }
  };

  const handleCategoryChange = async (val: string) => {
    const [cat, ph] = val.split('|');
    setSelectedCategoryId(cat || "");
    setSelectedPhase(ph || "");
    setSelectedLevelName("");
    setLevels([]);
    
    if (cat) {
      setIsFetchingData(true);
      const res = await getCategoryLevelsAction(cat);
      if (res.success) setLevels(res.data || []);
      setIsFetchingData(false);
    }
  };

  const handleRequestRetake = async () => {
    if (!retakeStudent || !retakeReason.trim() || !selectedCategoryId || !selectedPhase) return;
    startTransition(async () => {
      const res = await requestRetakeAction({
        schoolId,
        studentId: retakeStudent.id,
        reason: retakeReason,
        categoryId: selectedCategoryId,
        phase: selectedPhase,
        levelName: selectedLevelName,
      });
      if (res.success) {
        showSuccess("Berhasil", res.message ?? "Permintaan dikirim.");
        setRetakeModalOpen(false);
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const handleOpenBulkRetake = async () => {
    setRetakeReason("");
    setSelectedCategoryId("");
    setSelectedPhase("");
    setSelectedLevelName("");
    setLevels([]);
    setIsBulkRetakeModalOpen(true);
    
    if (schoolAssessments.length === 0) {
      setIsFetchingData(true);
      const res = await getSchoolAvailableAssessmentsAction(schoolId);
      if (res.success) {
        setSchoolAssessments(res.data || []);
      }
      setIsFetchingData(false);
    }
  };

  const handleBulkRequestRetake = async () => {
    if (selectedStudentIds.length === 0 || !retakeReason.trim() || !selectedCategoryId || !selectedPhase) return;
    startTransition(async () => {
      const res = await bulkRequestRetakeAction({
        schoolId,
        studentIds: selectedStudentIds,
        reason: retakeReason,
        categoryId: selectedCategoryId,
        phase: selectedPhase,
        levelName: selectedLevelName,
      });
      if (res.success) {
        showSuccess("Berhasil", res.message ?? "Permintaan ujian ulang masal dikirim.");
        setIsBulkRetakeModalOpen(false);
        setSelectedStudentIds([]);
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: "Hapus Siswa Terpilih",
      description: `Anda yakin ingin menghapus ${selectedStudentIds.length} siswa terpilih? Semua data ujian terkait juga akan terhapus secara permanen.`,
      confirmLabel: "Ya, Hapus",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await bulkDeleteStudentsAction(selectedStudentIds);
      if (res.success) {
        showSuccess("Berhasil", "Siswa terpilih berhasil dihapus.");
        setStudents((prev) => prev.filter((x) => !selectedStudentIds.includes(x.id)));
        setSelectedStudentIds([]);
      } else {
        showError("Gagal", res.error ?? "Terjadi kesalahan saat menghapus data.");
      }
    });
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(filtered.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDownloadTemplate = () => {
    const headers = ["nama_siswa", "nisn", "npsn", "jenis_kelamin", "tanggal_lahir", "nama_sekolah", "kelas", "pekerjaan_ibu", "pekerjaan_ayah", "pendidikan_ibu", "pendidikan_ayah", "kelurahan_desa", "kecamatan", "kabupaten", "provinsi"];
    const wsData = [
      headers,
      ["Ahmad Fikri", "10203040", "", "L", "2015-05-12", "SDN 1 Menteng", classes[0]?.name || "5A", "Petani", "Guru", "SD", "S1", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Petunjuk Sheet
    const petunjukData = [
      ["Kolom", "Wajib?", "Keterangan / Contoh"],
      ["nama_siswa", "Ya", "Nama lengkap siswa."],
      ["nisn", "Tidak", "NISN siswa. Opsional."],
      ["npsn", "Tidak", "NPSN Sekolah. Opsional."],
      ["jenis_kelamin", "Ya", "L untuk Laki-laki, P untuk Perempuan."],
      ["tanggal_lahir", "Ya", "Format YYYY-MM-DD (Misal: 2010-12-05)."],
      ["nama_sekolah", "Ya", "Nama sekolah asal."],
      ["kelas", "Ya", "Nama atau kode kelas. (Misal: 5A, 6B). Harus sama dengan kelas yang ada di sistem."],
      ["pekerjaan_ibu", "Ya", "Pekerjaan ibu. Contoh: Guru, Petani, Wiraswasta."],
      ["pekerjaan_ayah", "Ya", "Pekerjaan ayah. Contoh: Guru, Petani, Wiraswasta."],
      ["pendidikan_ibu", "Ya", "Pendidikan ibu. Contoh: SD, SMP, SMA, S1."],
      ["pendidikan_ayah", "Ya", "Pendidikan ayah. Contoh: SD, SMP, SMA, S1."],
      ["kelurahan_desa", "Ya", "Kelurahan / Desa."],
      ["kecamatan", "Ya", "Kecamatan."],
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

    XLSX.writeFile(wb, "Template_Siswa_Sekolah.xlsx");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Controls ── */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flex: "1 1 100%" }}>
            <input type="text" className="form-input" placeholder="Cari nama, NISN, atau username..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: "1 1 200px" }} />
            <select className="form-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ flex: "1 1 120px" }}>
              <option value="all">Semua Kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>Kelas {c.grade} - {c.name}</option>)}
            </select>
            <select className="form-input" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={{ flex: "1 1 120px" }}>
              <option value="all">Semua Gender</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
            <Button onClick={handleOpenAdd} style={{ backgroundColor: "#102e50", color: "white" }}>+ Tambah Anak</Button>
          </div>
        </div>
      </div>

      {/* ── Modal Request Ujian Ulang ── */}
      {retakeModalOpen && retakeStudent && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(2px)" }} onClick={() => setRetakeModalOpen(false)} />
          <div style={{ position: "relative", backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", width: "100%", maxWidth: "28rem", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 600 }}>Request Ujian Ulang</h3>
            <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#475569" }}>
              Ajukan permintaan ke Superadmin untuk me-reset sesi ujian terakhir <strong>{retakeStudent.full_name}</strong>.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1e293b" }}>Kategori & Fase Ujian <span style={{ color: "red" }}>*</span></label>
              <select 
                className="form-input" 
                value={`${selectedCategoryId}|${selectedPhase}`}
                onChange={e => handleCategoryChange(e.target.value)}
                disabled={isPending || isFetchingData}
              >
                <option value="|">- Pilih Kategori -</option>
                {schoolAssessments.map((sa: any, idx) => (
                  <option key={idx} value={`${sa.category_id}|${sa.phase}`}>
                    {sa.question_categories?.name} - {sa.phase}
                  </option>
                ))}
              </select>
              {isFetchingData && <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Memuat data akses...</span>}
            </div>

            {selectedCategoryId && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1e293b" }}>Level Bermasalah (Opsional)</label>
                <select 
                  className="form-input" 
                  value={selectedLevelName}
                  onChange={e => setSelectedLevelName(e.target.value)}
                  disabled={isPending || isFetchingData}
                >
                  <option value="">- Tidak Spesifik / Bebas -</option>
                  {levels.map((lvl: any) => (
                    <option key={lvl.id} value={`Level ${lvl.level_number}`}>Level {lvl.level_number}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1e293b" }}>Alasan Request <span style={{ color: "red" }}>*</span></label>
              <textarea 
                className="form-input" 
                rows={3}
                placeholder="Misal: Perangkat mati saat ujian, tidak sengaja kepencet selesai..."
                value={retakeReason}
                onChange={e => setRetakeReason(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button type="button" variant="outline" onClick={() => setRetakeModalOpen(false)} disabled={isPending}>Batal</Button>
              <Button type="button" onClick={handleRequestRetake} disabled={isPending || !retakeReason.trim() || !selectedCategoryId || !selectedPhase} style={{ backgroundColor: "#ca8a04", color: "white" }}>
                {isPending ? "Mengirim..." : "Kirim Request"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Bulk Request Ujian Ulang ── */}
      {isBulkRetakeModalOpen && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(2px)" }} onClick={() => setIsBulkRetakeModalOpen(false)} />
          <div style={{ position: "relative", backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", width: "100%", maxWidth: "28rem", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 600 }}>Request Ujian Ulang ({selectedStudentIds.length} Anak)</h3>
            <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#475569" }}>
              Ajukan permintaan ke Superadmin untuk me-reset sesi ujian terakhir <strong>{selectedStudentIds.length} anak</strong>. Alasan ini akan berlaku untuk semuanya.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1e293b" }}>Kategori & Fase Ujian <span style={{ color: "red" }}>*</span></label>
              <select 
                className="form-input" 
                value={`${selectedCategoryId}|${selectedPhase}`}
                onChange={e => handleCategoryChange(e.target.value)}
                disabled={isPending || isFetchingData}
              >
                <option value="|">- Pilih Kategori -</option>
                {schoolAssessments.map((sa: any, idx) => (
                  <option key={idx} value={`${sa.category_id}|${sa.phase}`}>
                    {sa.question_categories?.name} - {sa.phase}
                  </option>
                ))}
              </select>
              {isFetchingData && <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Memuat data akses...</span>}
            </div>

            {selectedCategoryId && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1e293b" }}>Level Bermasalah (Opsional)</label>
                <select 
                  className="form-input" 
                  value={selectedLevelName}
                  onChange={e => setSelectedLevelName(e.target.value)}
                  disabled={isPending || isFetchingData}
                >
                  <option value="">- Tidak Spesifik / Bebas -</option>
                  {levels.map((lvl: any) => (
                    <option key={lvl.id} value={`Level ${lvl.level_number}`}>Level {lvl.level_number}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1e293b" }}>Alasan Request Masal <span style={{ color: "red" }}>*</span></label>
              <textarea 
                className="form-input" 
                rows={3}
                placeholder="Misal: Perangkat mati saat ujian, gangguan teknis bersamaan..."
                value={retakeReason}
                onChange={e => setRetakeReason(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button type="button" variant="outline" onClick={() => setIsBulkRetakeModalOpen(false)} disabled={isPending}>Batal</Button>
              <Button type="button" onClick={handleBulkRequestRetake} disabled={isPending || !retakeReason.trim() || !selectedCategoryId || !selectedPhase} style={{ backgroundColor: "#ca8a04", color: "white" }}>
                {isPending ? "Mengirim..." : "Kirim Request"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Floating Action Bar untuk Bulk Selection ── */}
      {selectedStudentIds.length > 0 && (
        <div style={{ backgroundColor: "#fefce8", border: "1px solid #fef08a", borderRadius: "0.5rem", padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "0.95rem", color: "#854d0e", fontWeight: 500 }}>
            <span style={{ marginRight: "0.5rem" }}>☑️</span>
            {selectedStudentIds.length} anak terpilih
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Button size="sm" variant="outline" onClick={handleBulkDelete} style={{ color: "#dc2626", borderColor: "#fca5a5" }}>
              Hapus Terpilih
            </Button>
            <Button size="sm" onClick={handleOpenBulkRetake} style={{ backgroundColor: "#ca8a04", color: "white" }}>
              Request Ujian Ulang Terpilih
            </Button>
          </div>
        </div>
      )}

      {/* ── Tabel ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="pemantik-table" style={{ width: "100%", minWidth: "900px" }}>
          <thead>
            <tr>
              <th style={{ width: "40px", textAlign: "center" }}>
                <input 
                  type="checkbox" 
                  checked={filtered.length > 0 && selectedStudentIds.length === filtered.length}
                  onChange={toggleSelectAll}
                  style={{ cursor: "pointer" }}
                />
              </th>
              <th>Nama Anak</th><th>Akun Akses</th><th>Kelas</th><th>Gender</th><th>SES</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem 1rem", color: "black" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🧑‍🎓</div>
                {search || classFilter !== "all" || genderFilter !== "all" ? "Tidak ada anak yang cocok dengan filter." : "Belum ada anak terdaftar."}
              </td></tr>
            ) : paginatedStudents.map((s) => (
              <tr key={s.id} style={{ backgroundColor: selectedStudentIds.includes(s.id) ? "#f8fafc" : "" }}>
                <td style={{ textAlign: "center" }}>
                  <input 
                    type="checkbox"
                    checked={selectedStudentIds.includes(s.id)}
                    onChange={() => toggleSelectStudent(s.id)}
                    style={{ cursor: "pointer" }}
                  />
                </td>
                <td><div style={{ fontWeight: 600, color: "#102e50" }}>{s.full_name}</div></td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                    <div><span style={{ color: "black" }}>User:</span> <strong>{s.username}</strong></div>
                    <div><span style={{ color: "black" }}>PIN:</span> <code style={{ color: "#a8281c" }}>123456</code></div>
                  </div>
                  {s.nisn && <div style={{ fontSize: "0.78rem", color: "black", marginTop: "0.25rem" }}>NISN: {s.nisn}</div>}
                </td>
                <td>
                  {s.classes ? (
                    <span style={{ padding: "0.15rem 0.5rem", backgroundColor: "#eff6ff", color: "#1d4ed8", borderRadius: "0.375rem", fontSize: "0.8rem", fontWeight: 500 }}>
                      Kelas {s.classes.grade} - {s.classes.name}
                    </span>
                  ) : <span style={{ color: "black", fontSize: "0.8rem" }}>-</span>}
                </td>
                <td style={{ fontSize: "0.85rem" }}>{s.gender === "L" ? "Laki-laki" : s.gender === "P" ? "Perempuan" : "-"}</td>
                <td>
                  {s.ses_class ? <span style={{ padding: "0.15rem 0.5rem", backgroundColor: "#f3f4f6", borderRadius: "0.375rem", fontSize: "0.8rem", fontWeight: 600 }}>SES {s.ses_class}</span> : "-"}
                </td>
                <td><Badge variant={s.is_active ? "success" : "danger"}>{s.is_active ? "Aktif" : "Nonaktif"}</Badge></td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(s)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => handleResetPassword(s)}>Reset PIN</Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenRetake(s)} style={{ color: "#ca8a04", borderColor: "#ca8a04" }}>Request Ujian Ulang</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(s)} style={{ color: "#dc2626" }}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          className="px-4 pb-4"
        />
      </div>

      {/* ── Bulk Upload ── */}
      {isBulkModalOpen && mounted && (
        <BulkUploadModal
          onClose={() => setIsBulkModalOpen(false)}
          onUpload={handleBulkUpload}
          onRollback={handleRollback}
          templateHeaders={EXCEL_COLUMNS}
          title="Import Anak via Excel"
          templateFileName="template_siswa_sekolah.xlsx"
          description="Download template, isi data anak, dan upload kembali. Sistem akan men-generate username, PIN, dan nilai SES secara otomatis."
          templateData={[
            ["Ahmad Fikri", "10203040", "L", "2015-05-12", classes[0]?.name || "5A", "Petani", "Guru", "SD", "S1", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta"]
          ]}
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
              {editingStudent ? "Edit Anak" : "Tambah Anak Baru"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label className="form-label">Nama Lengkap <span style={{ color: "#dc2626" }}>*</span></label>
                <input name="full_name" className="form-input" defaultValue={editingStudent?.full_name ?? ""} required style={{ width: "100%" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label className="form-label">NISN (Opsional)</label>
                  <input name="nisn" className="form-input" defaultValue={editingStudent?.nisn ?? ""} />
                </div>
                <div>
                  <label className="form-label">NPSN Sekolah (Opsional)</label>
                  <input name="npsn" className="form-input" defaultValue={editingStudent?.schools?.npsn ?? ""} />
                </div>
                <div>
                  <label className="form-label">Jenis Kelamin <span style={{ color: "#dc2626" }}>*</span></label>
                  <select name="gender" className="form-input" defaultValue={editingStudent?.gender ?? ""} required>
                    <option value="">- Pilih -</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div style={{ marginBottom: "1rem", gridColumn: "1/-1" }}>
                  <label className="form-label">Tanggal Lahir <span style={{ color: "#dc2626" }}>*</span></label>
                  <input name="birth_date" type="date" className="form-input" defaultValue={editingStudent?.birth_date ?? ""} required />
                </div>
                <div>
                  <label className="form-label">Kelas <span style={{ color: "#dc2626" }}>*</span></label>
                  <select name="class_id" className="form-input" defaultValue={editingStudent?.classes?.id ?? ""} required>
                    <option value="">- Pilih Kelas -</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>Kelas {c.grade} - {c.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label className="form-label">Kelurahan / Desa <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" name="village" required defaultValue={editingStudent?.village} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label className="form-label">Kecamatan <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" name="district" required defaultValue={editingStudent?.district} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label className="form-label">Kabupaten / Kota <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" name="city" required defaultValue={editingStudent?.city} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label className="form-label">Provinsi <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" name="province" required defaultValue={editingStudent?.province} className="form-input" style={{ width: "100%" }} />
                </div>
              </div>

              <div style={{ marginBottom: "1rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem", color: "#102e50" }}>Data Pekerjaan & Pendidikan Orang Tua (SES)</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Pendidikan Ayah <span style={{ color: "#dc2626" }}>*</span></label>
                    <select name="father_education_id" required defaultValue={editingStudent?.father_education_id} className="form-input" style={{ width: "100%" }}>
                      <option value="">-- Pilih --</option>
                      {sesVariables.filter(v => v.type === 'education').map(v => (
                        <option key={`fe-${v.id}`} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Pekerjaan Ayah <span style={{ color: "#dc2626" }}>*</span></label>
                    <select name="father_occupation_id" required defaultValue={editingStudent?.father_occupation_id} className="form-input" style={{ width: "100%" }}>
                      <option value="">-- Pilih --</option>
                      {sesVariables.filter(v => v.type === 'occupation').map(v => (
                        <option key={`fj-${v.id}`} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Pendidikan Ibu <span style={{ color: "#dc2626" }}>*</span></label>
                    <select name="mother_education_id" required defaultValue={editingStudent?.mother_education_id} className="form-input" style={{ width: "100%" }}>
                      <option value="">-- Pilih --</option>
                      {sesVariables.filter(v => v.type === 'education').map(v => (
                        <option key={`me-${v.id}`} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Pekerjaan Ibu <span style={{ color: "#dc2626" }}>*</span></label>
                    <select name="mother_occupation_id" required defaultValue={editingStudent?.mother_occupation_id} className="form-input" style={{ width: "100%" }}>
                      <option value="">-- Pilih --</option>
                      {sesVariables.filter(v => v.type === 'occupation').map(v => (
                        <option key={`mj-${v.id}`} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>Sistem akan menghitung status SES otomatis berdasarkan input di atas.</p>
              </div>

              {!editingStudent && (
                <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "1.5rem", backgroundColor: "#f3f4f6", padding: "0.75rem", borderRadius: "0.5rem" }}>
                  Sistem akan secara otomatis membuat <b>Username</b> unik dan PIN default <b>123456</b> untuk anak login ke mobile app.
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isPending} style={{ backgroundColor: "#102e50", color: "white" }}>
                  {isPending ? <><span className="btn-spinner" /> Menyimpan...</> : (editingStudent ? "Simpan Perubahan" : "Tambah Anak")}
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
