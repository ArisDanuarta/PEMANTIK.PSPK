"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { Badge, Button, useToast, useConfirm, Modal } from "@pemantik/ui";
import BulkUploadModal from "@/components/shared/BulkUploadModal";
import { parseDapodikAction, importDapodikAction } from "../../../actions/schools";
import { createTeacherAction, updateTeacherAction, deleteTeacherAction, bulkCreateTeachersAction } from "../../../actions/teachers";
import { createStudentAction, updateStudentAction, deleteStudentAction, bulkCreateStudentsAction } from "../../../actions/students";
import { createClassAction, updateClassAction, deleteClassAction } from "../../../actions/classes";
import type { SchoolAssessmentStageRow } from "@/app/actions/stages";
import { useRouter } from "next/navigation";
import Pagination from "@/components/shared/Pagination";
import { usePagination } from "@/lib/usePagination";

interface SchoolDetailKomunitasProps {
  school: any;
  teachers: any[];
  students: any[];
  classes?: any[];
  stages: SchoolAssessmentStageRow[];
  sessions: any[];
  sesVariables: any[];
}

export default function SchoolDetailKomunitas({
  school,
  teachers,
  students,
  classes: propsClasses,
  stages,
  sessions,
  sesVariables,
}: SchoolDetailKomunitasProps) {
  const [activeTab, setActiveTab] = useState<"info" | "teachers" | "students" | "classes" | "ekspor">("info");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSiswa, setSearchSiswa] = useState("");
  const [filterKelas, setFilterKelas] = useState("all");
  const [isDapodikModalOpen, setIsDapodikModalOpen] = useState(false);
  
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isTeacherBulkModalOpen, setIsTeacherBulkModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isStudentBulkModalOpen, setIsStudentBulkModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);

  const router = useRouter();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { confirm } = useConfirm();
  const [isPending, startTransition] = useTransition();
  const classes = propsClasses || [];

  const sesColorMap: Record<string, string> = {
    Atas: "#22c55e",
    "Menengah Atas": "#3b82f6",
    "Menengah Bawah": "#f59e0b",
    Bawah: "#ef4444",
  };

  const studentsByClass = students.reduce((acc: Record<string, number>, s: any) => {
    const cid = s.class_id || s.classes?.id;
    if (cid) acc[cid] = (acc[cid] || 0) + 1;
    return acc;
  }, {});

  // Map class_id → daftar nama guru yang terhubung ke kelas itu
  const teachersByClass: Record<string, string[]> = {};
  (teachers as any[]).forEach((t) => {
    if (t.classes && t.classes.length > 0) {
      t.classes.forEach((cls: any) => {
        if (!teachersByClass[cls.id]) teachersByClass[cls.id] = [];
        teachersByClass[cls.id].push(t.full_name);
      });
    }
  });

  // ─── CRUD Guru ────────────────────────────────────────────────────────────
  const handleTeacherSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("school_id", school.id);
    
    startTransition(async () => {
      const result = editingTeacher 
        ? await updateTeacherAction(editingTeacher.id, formData)
        : await createTeacherAction(formData);
        
      if (result.success) {
        showSuccessToast("Berhasil", result.message || `Guru berhasil ${editingTeacher ? "diperbarui" : "ditambahkan"}.`);
        setIsTeacherModalOpen(false);
        setEditingTeacher(null);
        router.refresh();
      } else {
        showErrorToast("Gagal", result.error || "Terjadi kesalahan.");
      }
    });
  };

  const handleDeleteTeacher = async (row: any) => {
    const isConfirmed = await confirm({ title: "Hapus Guru", description: `Hapus guru ${row.full_name}?`, confirmLabel: "Hapus", variant: "danger", cancelLabel: "Batal" });
    if (!isConfirmed) return;
    startTransition(async () => {
      const res = await deleteTeacherAction(row.id);
      if (res.success) {
        showSuccessToast("Berhasil", "Guru dihapus.");
        router.refresh();
      } else {
        showErrorToast("Gagal", res.error || "Gagal menghapus.");
      }
    });
  };

  const handleDownloadGuruTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Template
      const templateData = [{
        nama_guru: "",
        nip: "",
        email_guru: "",
        jenis_kelamin: "L",
        tanggal_lahir: "YYYY-MM-DD",
        nama_sekolah: school.name,
        kelas: "",
        kelurahan_desa: "",
        kecamatan: "",
        kabupaten: "",
        provinsi: ""
      }];
      
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws["!cols"] = [
        { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
        { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Template_Guru");

      // Sheet 2: Petunjuk Pengisian
      const instructions = [
        { Kolom: "nama_guru", Keterangan: "Wajib. Nama lengkap guru." },
        { Kolom: "nip", Keterangan: "Opsional. Nomor Induk Pegawai." },
        { Kolom: "email_guru", Keterangan: "Opsional. Email guru." },
        { Kolom: "jenis_kelamin", Keterangan: "Wajib. Isi dengan 'L', 'P', 'Laki-laki', atau 'Perempuan'." },
        { Kolom: "tanggal_lahir", Keterangan: "Wajib. Format YYYY-MM-DD (contoh: 1990-01-25)." },
        { Kolom: "nama_sekolah", Keterangan: `Wajib. Pastikan sama persis: "${school.name}"` },
        { Kolom: "kelas", Keterangan: "Opsional. Nama kelas jika menjadi wali kelas (harus sama dengan nama kelas di sistem)." },
        { Kolom: "kelurahan_desa", Keterangan: "Wajib. Alamat domisili guru." },
        { Kolom: "kecamatan", Keterangan: "Wajib. Alamat domisili guru." },
        { Kolom: "kabupaten", Keterangan: "Wajib. Alamat domisili guru." },
        { Kolom: "provinsi", Keterangan: "Wajib. Alamat domisili guru." }
      ];
      
      const wsHelp = XLSX.utils.json_to_sheet(instructions);
      wsHelp["!cols"] = [{ wch: 20 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsHelp, "Petunjuk_Pengisian");

      const safeSchoolName = school.name.replace(/[^a-zA-Z0-9]/g, "_");
      XLSX.writeFile(wb, `Template_Guru_${safeSchoolName}.xlsx`);
    } catch (err) {
      console.error(err);
      showErrorToast("Gagal", "Gagal mengunduh template");
    }
  };

  const handleBulkUploadGuru = async (data: any[]) => {
    const result = await bulkCreateTeachersAction(data);
    if (result.success) {
      showSuccessToast("Berhasil", result.message || "Data guru berhasil diimport");
      setIsTeacherBulkModalOpen(false);
      setTimeout(() => window.location.reload(), 2000);
    } else {
      showErrorToast("Gagal", result.error || "Gagal mengimport data guru");
    }
    return result;
  };

  // ─── CRUD Anak ───────────────────────────────────────────────────────────
  const handleStudentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("school_id", school.id);
    startTransition(async () => {
      const result = editingStudent ? await updateStudentAction(editingStudent.id, formData) : await createStudentAction(formData);
      if (result.success) {
        showSuccessToast("Berhasil", `Anak berhasil ${editingStudent ? "diperbarui" : "ditambahkan"}.`);
        setIsStudentModalOpen(false); setEditingStudent(null);
        router.refresh();
      } else showErrorToast("Gagal", result.error || "Terjadi kesalahan.");
    });
  };

  const handleDeleteStudent = async (row: any) => {
    const isConfirmed = await confirm({ title: "Hapus Anak", description: `Hapus siswa ${row.full_name}?`, confirmLabel: "Hapus", variant: "danger", cancelLabel: "Batal" });
    if (!isConfirmed) return;
    startTransition(async () => {
      const res = await deleteStudentAction(row.id);
      if (res.success) {
        showSuccessToast("Berhasil", "Anak dihapus.");
        router.refresh();
      } else showErrorToast("Gagal", res.error || "Gagal menghapus.");
    });
  };

  const handleDownloadStudentTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      const templateData = [{
        nama_siswa: "",
        nisn: "",
        npsn: school.npsn || "",
        jenis_kelamin: "L",
        tanggal_lahir: "YYYY-MM-DD",
        nama_sekolah: school.name,
        kelas: "",
        pekerjaan_ibu: "",
        pekerjaan_ayah: "",
        pendidikan_ibu: "",
        pendidikan_ayah: "",
        kelurahan_desa: "",
        kecamatan: "",
        kabupaten: "",
        provinsi: ""
      }];
      
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws["!cols"] = [
        { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Template_Anak");

      const instructions = [
        { Kolom: "nama_siswa", Keterangan: "Wajib. Nama lengkap anak." },
        { Kolom: "nisn", Keterangan: "Opsional. Nomor Induk Siswa Nasional." },
        { Kolom: "npsn", Keterangan: "Opsional. NPSN Sekolah." },
        { Kolom: "jenis_kelamin", Keterangan: "Wajib. L atau P." },
        { Kolom: "tanggal_lahir", Keterangan: "Wajib. YYYY-MM-DD (Contoh: 2012-05-20)." },
        { Kolom: "nama_sekolah", Keterangan: `Wajib. Harus persis: "${school.name}"` },
        { Kolom: "kelas", Keterangan: "Opsional. Nama kelas di sistem." },
        { Kolom: "pekerjaan_ibu", Keterangan: "Wajib. Sesuai nama pekerjaan di SES (contoh: Petani, Wiraswasta)." },
        { Kolom: "pekerjaan_ayah", Keterangan: "Wajib. Sesuai nama pekerjaan di SES." },
        { Kolom: "pendidikan_ibu", Keterangan: "Wajib. Sesuai nama pendidikan di SES (contoh: SD, S1)." },
        { Kolom: "pendidikan_ayah", Keterangan: "Wajib. Sesuai nama pendidikan di SES." },
        { Kolom: "kelurahan_desa", Keterangan: "Wajib. Domisili." },
        { Kolom: "kecamatan", Keterangan: "Wajib. Domisili." },
        { Kolom: "kabupaten", Keterangan: "Wajib. Domisili." },
        { Kolom: "provinsi", Keterangan: "Wajib. Domisili." },
      ];
      const wsHelp = XLSX.utils.json_to_sheet(instructions);
      wsHelp["!cols"] = [{ wch: 20 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsHelp, "Petunjuk_Pengisian");

      const safeSchoolName = school.name.replace(/[^a-zA-Z0-9]/g, "_");
      XLSX.writeFile(wb, `Template_Anak_${safeSchoolName}.xlsx`);
    } catch (err) {
      console.error(err);
      showErrorToast("Gagal", "Gagal mengunduh template");
    }
  };

  const handleBulkUploadStudent = async (data: any[]) => {
    const result = await bulkCreateStudentsAction(data);
    return result;
  };

  // ─── CRUD Kelas ───────────────────────────────────────────────────────────
  const handleClassSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("school_id", school.id);
    startTransition(async () => {
      const result = editingClass ? await updateClassAction(editingClass.id, formData) : await createClassAction(formData);
      if (result.success) {
        showSuccessToast("Berhasil", `Kelas berhasil ${editingClass ? "diperbarui" : "ditambahkan"}.`);
        setIsClassModalOpen(false); setEditingClass(null);
        router.refresh();
      } else showErrorToast("Gagal", result.error || "Terjadi kesalahan.");
    });
  };

  const handleDeleteClass = async (row: any) => {
    const isConfirmed = await confirm({ title: "Hapus Kelas", description: `Hapus kelas ${row.name}?`, confirmLabel: "Hapus", variant: "danger", cancelLabel: "Batal" });
    if (!isConfirmed) return;
    startTransition(async () => {
      const res = await deleteClassAction(row.id);
      if (res.success) {
        showSuccessToast("Berhasil", "Kelas dihapus.");
        router.refresh();
      } else showErrorToast("Gagal", res.error || "Gagal menghapus.");
    });
  };

  const handleExportAccounts = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Sheet Admin Sekolah
      const schoolAdmins = (school.users || []).filter((u: any) => u.role === "school");
      if (schoolAdmins.length > 0) {
        const adminData = schoolAdmins.map((adm: any) => ({
          Peran: "Admin Sekolah",
          Nama: adm.full_name || school.name,
          Username: adm.username,
          Password_Default: "Password123!",
          Info_Tambahan: `NPSN: ${school.npsn || "-"}`
        }));
        const wsAdmin = XLSX.utils.json_to_sheet(adminData);
        wsAdmin["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsAdmin, "Akun Sekolah");
      } else {
        const adminData = [{
          Peran: "Admin Sekolah",
          Nama: school.name,
          Username: `sch_${school.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`.slice(0, 15),
          Password_Default: "Password123!",
          Info_Tambahan: `NPSN: ${school.npsn || "-"}`
        }];
        const wsAdmin = XLSX.utils.json_to_sheet(adminData);
        wsAdmin["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsAdmin, "Akun Sekolah");
      }

      // 2. Sheet Guru
      if (teachers.length > 0) {
        const teacherData = teachers.map((t) => ({
          Peran: "Guru",
          Nama: t.full_name,
          Username: t.username,
          Password_Default: "Password123!",
          Info_Tambahan: "-"
        }));
        const wsTeacher = XLSX.utils.json_to_sheet(teacherData);
        wsTeacher["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 35 }];
        XLSX.utils.book_append_sheet(wb, wsTeacher, "Akun Guru");
      }

      // 3. Sheet Anak
      if (students.length > 0) {
        const studentData = students.map((s: any) => ({
          Peran: "Anak",
          Nama: s.full_name,
          Username: s.users?.username || s.username || "-",
          PIN_Default: "123456",
          Info_Tambahan: (s.classes as any)?.name ? `Kelas: ${(s.classes as any).name}` : "-"
        }));
        const wsStudent = XLSX.utils.json_to_sheet(studentData);
        wsStudent["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsStudent, "Akun Anak");
      }

      if (wb.SheetNames.length === 0) {
        showErrorToast("Gagal", "Tidak ada data akun untuk diekspor.");
        return;
      }

      const safeSchoolName = school.name.replace(/[^a-zA-Z0-9]/g, "_");
      XLSX.writeFile(wb, `Akun_${safeSchoolName}.xlsx`);

      showSuccessToast("Berhasil", "File data akun berhasil diunduh.");
    } catch (err) {
      console.error(err);
      showErrorToast("Gagal", "Terjadi kesalahan saat meng-export data akun.");
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    (t.full_name || t.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      (s.full_name || "").toLowerCase().includes(searchSiswa.toLowerCase()) ||
      (s.nisn || "").toLowerCase().includes(searchSiswa.toLowerCase());
    const matchesClass =
      filterKelas === "all" ||
      s.class_id === filterKelas ||
      s.classes?.id === filterKelas;
    return matchesSearch && matchesClass;
  });

  // Pagination for teacher tab
  const {
    paginatedData: paginatedTeachers,
    currentPage: teacherPage,
    totalPages: teacherTotalPages,
    totalItems: teacherTotalItems,
    setCurrentPage: setTeacherPage,
    startIndex: teacherStart,
    endIndex: teacherEnd,
  } = usePagination(filteredTeachers, 15);

  // Pagination for student tab
  const {
    paginatedData: paginatedStudents,
    currentPage: studentPage,
    totalPages: studentTotalPages,
    totalItems: studentTotalItems,
    setCurrentPage: setStudentPage,
    startIndex: studentStart,
    endIndex: studentEnd,
  } = usePagination(filteredStudents, 15);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Nav Back & Tabs Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        backgroundColor: "white",
        padding: "1rem 1.5rem",
        borderRadius: "1rem",
        border: "1px solid #f1f3f5",
        boxShadow: "0 2px 4px rgba(0,0,0,0.03)"
      }}>
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid transparent", flexWrap: "wrap" }}>
          <button
            onClick={() => { setActiveTab("info"); setSearchTerm(""); }}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: activeTab === "info" ? "#102e50" : "transparent",
              color: activeTab === "info" ? "white" : "#4b5563",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Data Sekolah
          </button>
          <button
            onClick={() => { setActiveTab("teachers"); setSearchTerm(""); }}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: activeTab === "teachers" ? "#102e50" : "transparent",
              color: activeTab === "teachers" ? "white" : "#4b5563",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Daftar Guru ({teachers.length})
          </button>
          <button
            onClick={() => { setActiveTab("students"); setSearchTerm(""); }}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: activeTab === "students" ? "#102e50" : "transparent",
              color: activeTab === "students" ? "white" : "#4b5563",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Daftar Anak ({students.length})
          </button>
          <button
            onClick={() => { setActiveTab("classes"); setSearchTerm(""); }}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: activeTab === "classes" ? "#102e50" : "transparent",
              color: activeTab === "classes" ? "white" : "#4b5563",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Daftar Kelas ({classes.length})
          </button>
          <button
            onClick={() => { setActiveTab("ekspor"); setSearchTerm(""); }}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: activeTab === "ekspor" ? "#102e50" : "transparent",
              color: activeTab === "ekspor" ? "white" : "#4b5563",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Ekspor Akun
          </button>
        </div>

        <Link href="/komunitas/sekolah" style={{ textDecoration: "none" }}>
          <Button variant="outline" size="sm">← Kembali ke Daftar Sekolah</Button>
        </Link>
      </div>

      {/* TAB 1: INFO UMUM */}
      {activeTab === "info" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", color: "#102e50" }}>Identitas Sekolah</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f8f9fa", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#6c757d" }}>Nama Resmi:</span>
                <strong style={{ color: "#111827" }}>{school.name}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f8f9fa", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#6c757d" }}>NPSN:</span>
                <strong style={{ color: "#111827" }}>{school.npsn || "-"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f8f9fa", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#6c757d" }}>Email:</span>
                <strong style={{ color: "#111827" }}>{school.email || "-"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f8f9fa", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#6c757d" }}>Status:</span>
                <strong style={{ color: "#111827" }}>{school.status_sekolah || "-"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f8f9fa", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#6c757d" }}>Jenjang:</span>
                <strong style={{ color: "#111827" }}>{school.jenjang_sekolah || "-"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f8f9fa", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#6c757d" }}>Kepala Sekolah:</span>
                <strong style={{ color: "#111827" }}>{school.principal_name || "-"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f8f9fa", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#6c757d" }}>No. Kontak:</span>
                <strong style={{ color: "#111827" }}>{school.contact_phone || "-"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f8f9fa", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#6c757d" }}>Alamat:</span>
                <strong style={{ color: "#111827", textAlign: "right" }}>{school.address || "-"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6c757d" }}>Lokasi:</span>
                <strong style={{ color: "#111827", textAlign: "right" }}>
                  {[school.village, school.district, school.city, school.province].filter(Boolean).join(", ") || "-"}
                </strong>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", color: "#102e50" }}>Status Import Dapodik & Akun</h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "#6c757d" }}>
              Kelola data guru, siswa, kelas dari Dapodik serta unduh kredensial login (akun) sekolah ini.
            </p>

            {school.import_source === "dapodik" ? (
              <div style={{ padding: "0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.5rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#166534", fontWeight: 600, fontSize: "0.9rem" }}>
                  <span>✅ Data Dapodik Terintegrasi</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#15803d", marginTop: "0.25rem" }}>
                  {school.dapodik_imported_at
                    ? `Terakhir: ${new Date(school.dapodik_imported_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                    : "Tanggal tidak tersedia"}
                </div>
              </div>
            ) : (
              <div style={{ padding: "0.75rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>Belum diimport dari Dapodik</span>
              </div>
            )}

            {/* Informasi Akun Admin Sekolah */}
            {(() => {
              const adminUser = Array.isArray(school.users) ? school.users.find((u: any) => u.role === "school") : null;
              return (
                <div style={{ padding: "0.85rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
                  <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span>Akun Admin Sekolah</span>
                  </div>
                  {adminUser ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <div><span style={{ color: "#64748b" }}>Username:</span> <strong style={{ color: "#0f172a" }}>{adminUser.username}</strong></div>
                      <div><span style={{ color: "#64748b" }}>Password:</span> <code style={{ color: "#a8281c", backgroundColor: "#fee2e2", padding: "0.1rem 0.3rem", borderRadius: "0.25rem" }}>Password123!</code> <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>(default)</span></div>
                    </div>
                  ) : (
                    <div style={{ color: "#64748b", fontStyle: "italic" }}>Akun Admin Sekolah belum dibentuk oleh sistem.</div>
                  )}
                </div>
              );
            })()}

            <Button
              onClick={() => setIsDapodikModalOpen(true)}
              style={{ backgroundColor: "#102e50", color: "white", width: "100%", marginBottom: "0.75rem" }}
            >
              {school.import_source === "dapodik" ? "🔄 Update Data Dapodik" : "Import Dapodik Sekolah Ini"}
            </Button>
            <Button
              onClick={handleExportAccounts}
              style={{ backgroundColor: "#10b981", color: "white", width: "100%" }}
            >
              Download Akun Sekolah (Excel)
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR GURU */}
      {activeTab === "teachers" && (
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#102e50" }}>Daftar Guru ({filteredTeachers.length})</h3>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Cari nama, username, atau email guru..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: "0.5rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.85rem", width: "280px" }}
              />
              <Button
                variant="outline"
                onClick={handleDownloadGuruTemplate}
                style={{ color: "#0874aa", borderColor: "#0874aa" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.4rem", display: "inline-block", verticalAlign: "middle" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download Template
              </Button>
              <Button onClick={() => setIsTeacherBulkModalOpen(true)} style={{ backgroundColor: "#10b981", color: "white" }}>
                Import Excel
              </Button>
              <Button onClick={() => { setEditingTeacher(null); setIsTeacherModalOpen(true); }} style={{ backgroundColor: "#102e50", color: "white" }}>
                + Tambah Guru
              </Button>
            </div>
          </div>

          {filteredTeachers.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6c757d" }}>
              Belum ada guru terdaftar di sekolah ini.
            </div>
          ) : (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Nama Guru", "Username", "Kelas Diajar", "Status", "Aksi"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedTeachers.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: i < paginatedTeachers.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: 500 }}>{t.full_name || "-"}</td>
                      <td style={{ padding: "0.875rem 1rem", fontFamily: "monospace", fontSize: "0.85rem", color: "#6b7280" }}>{t.username}</td>
                      <td style={{ padding: "0.875rem 1rem", fontSize: "0.85rem" }}>
                        {t.classes && t.classes.length > 0
                          ? t.classes.map((c: any) => c.name).join(", ")
                          : <span style={{ color: "#9ca3af" }}>Belum ada kelas</span>}
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <Badge variant={t.is_active ? "success" : "danger"}>{t.is_active ? "Aktif" : "Nonaktif"}</Badge>
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <Button variant="outline" size="sm" onClick={() => { setEditingTeacher(t); setIsTeacherModalOpen(true); }}>Edit</Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteTeacher(t)}>Hapus</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredTeachers.length > 0 && (
            <Pagination
              currentPage={teacherPage}
              totalPages={teacherTotalPages}
              onPageChange={setTeacherPage}
              totalItems={teacherTotalItems}
              startIndex={teacherStart}
              endIndex={teacherEnd}
              className="pt-4 pb-4"
            />
          )}
        </div>
      )}

      {/* TAB 3: DAFTAR ANAK */}
      {activeTab === "students" && (
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#102e50" }}>Daftar Anak ({filteredStudents.length})</h3>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Cari nama / NISN..."
                value={searchSiswa}
                onChange={(e) => setSearchSiswa(e.target.value)}
                style={{ padding: "0.5rem 0.875rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "0.85rem", width: 200 }}
              />
              <select
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                style={{ padding: "0.5rem 0.875rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "0.85rem" }}
              >
                <option value="all">Semua Kelas</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={handleDownloadStudentTemplate}
                style={{ color: "#0874aa", borderColor: "#0874aa" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.4rem", display: "inline-block", verticalAlign: "middle" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download Template
              </Button>
              <Button onClick={() => setIsStudentBulkModalOpen(true)} style={{ backgroundColor: "#10b981", color: "white" }}>
                Import Excel
              </Button>
              <Button onClick={() => { setEditingStudent(null); setIsStudentModalOpen(true); }} style={{ backgroundColor: "#102e50", color: "white" }}>
                + Tambah Anak
              </Button>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6c757d" }}>
              Belum ada anak terdaftar yang cocok dengan pencarian / filter ini.
            </div>
          ) : (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Nama Anak", "L/P", "NISN", "Kelas", "SES", "Sumber", "Status", "Aksi"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: i < paginatedStudents.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: 500 }}>{s.full_name}</td>
                      <td style={{ padding: "0.875rem 1rem", fontSize: "0.85rem" }}>{s.gender === "perempuan" || s.gender === "P" ? "P" : "L"}</td>
                      <td style={{ padding: "0.875rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280" }}>{s.nisn || "-"}</td>
                      <td style={{ padding: "0.875rem 1rem", fontSize: "0.85rem" }}>{(s.classes as any)?.name || <span style={{ color: "#9ca3af" }}>-</span>}</td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        {s.socioeconomic_status || s.ses_class ? (
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 999, background: (sesColorMap[s.socioeconomic_status || s.ses_class] || "#6b7280") + "20", color: sesColorMap[s.socioeconomic_status || s.ses_class] || "#6b7280" }}>
                            {s.socioeconomic_status || s.ses_class}
                          </span>
                        ) : <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>-</span>}
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: 999, background: s.import_source === "dapodik" ? "#e0f2fe" : "#f3f4f6", color: s.import_source === "dapodik" ? "#0369a1" : "#6b7280" }}>
                          {s.import_source === "dapodik" ? "Dapodik" : "Manual"}
                        </span>
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <Badge variant={s.is_active !== false ? "success" : "danger"}>{s.is_active !== false ? "Aktif" : "Nonaktif"}</Badge>
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <Button variant="outline" size="sm" onClick={() => { setEditingStudent(s); setIsStudentModalOpen(true); }}>Edit</Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteStudent(s)}>Hapus</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredStudents.length > 0 && (
            <Pagination
              currentPage={studentPage}
              totalPages={studentTotalPages}
              onPageChange={setStudentPage}
              totalItems={studentTotalItems}
              startIndex={studentStart}
              endIndex={studentEnd}
              className="pt-4 pb-4"
            />
          )}
        </div>
      )}

      {/* TAB 4: DAFTAR KELAS */}
      {activeTab === "classes" && (
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#102e50" }}>Daftar Kelas ({classes.length})</h3>
            <Button onClick={() => { setEditingClass(null); setIsClassModalOpen(true); }} style={{ backgroundColor: "#102e50", color: "white" }}>
              + Tambah Kelas
            </Button>
          </div>

          {classes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6c757d" }}>
              Belum ada kelas terdaftar di sekolah ini.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
              {classes.map((c: any) => {
                const studentCount = studentsByClass[c.id] || students.filter((s: any) => s.class_id === c.id || (s.classes as any)?.name === c.name).length || 0;
                const classTeachers = teachersByClass[c.id] || [];
                return (
                  <div key={c.id} style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1.25rem", background: "#f9fafb", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#102e50" }}>{c.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Kelas {c.grade} • {c.academic_year || "2026/2027"}</div>
                      </div>
                      <Badge variant={c.is_active !== false ? "success" : "danger"}>{c.is_active !== false ? "Aktif" : "Nonaktif"}</Badge>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#374151", marginTop: "0.75rem", marginBottom: "1rem" }}>
                      <div>👥 <strong>{studentCount}</strong> anak</div>
                      <div style={{ marginTop: "0.25rem" }}>
                        👤 {classTeachers.length > 0
                          ? classTeachers.map((name, idx) => (
                              <span key={idx} style={{ display: "inline-block", background: "#eff6ff", color: "#1d4ed8", borderRadius: "0.375rem", padding: "0.1rem 0.4rem", fontSize: "0.78rem", marginRight: "0.25rem", marginTop: "0.15rem" }}>{name}</span>
                            ))
                          : <span style={{ color: "#9ca3af" }}>Belum ada guru</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid #e5e7eb", paddingTop: "0.75rem" }}>
                      <Button variant="outline" size="sm" onClick={() => { setEditingClass(c); setIsClassModalOpen(true); }} style={{ flex: 1 }}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteClass(c)} style={{ flex: 1 }}>Hapus</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: EKSPOR AKUN */}
      {activeTab === "ekspor" && (
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#102e50" }}>Ekspor Data Akun Sekolah, Guru, & Anak</h3>
            <Button onClick={handleExportAccounts} style={{ backgroundColor: "#10b981", color: "white" }}>
              Unduh Excel Data Akun
            </Button>
          </div>

          <div style={{ padding: "1.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.5rem", marginBottom: "1.5rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#166534" }}>Panduan Distribusi Akun</h4>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#15803d", lineHeight: "1.5" }}>
              Anda dapat mengunduh daftar lengkap username dan password default (<code>Password123!</code>) untuk Admin Sekolah, Guru, dan Anak di sekolah ini.
              Data Excel tersebut memiliki 3 sheet (Akun Sekolah, Akun Guru, dan Akun Anak) yang dapat dipilah dan didistribusikan kepada pihak sekolah atau wali kelas.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1.25rem", background: "white" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏫</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{Array.isArray(school.users) && school.users.find((u: any) => u.role === "school") ? 1 : 0} Akun Sekolah</div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>Siap untuk di-export</div>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1.25rem", background: "white" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👨‍🏫</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{teachers.length} Akun Guru</div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>Siap untuk di-export</div>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1.25rem", background: "white" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👨‍🎓</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{students.length} Akun Anak</div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>Siap untuk di-export</div>
            </div>
          </div>
        </div>
      )}

      {/* DAPODIK IMPORT MODAL */}
      {isDapodikModalOpen && (
        <BulkUploadModal
          mode="dapodik"
          title="Import Dapodik"
          templateFileName="template_dapodik"
          templateHeaders={[]}
          onClose={() => setIsDapodikModalOpen(false)}
          onUpload={async () => ({ success: false })}
          existingSchools={[{ id: school.id, name: school.name, npsn: school.npsn }]}
          onDapodikParse={async (formData) => {
            const result = await parseDapodikAction(formData);
            return result;
          }}
          onDapodikConfirm={async (payload) => {
            const result = await importDapodikAction(payload);
            return result;
          }}
          onPollStatus={async (batchId) => {
            const res = await fetch(`/api/dapodik-import/${batchId}`);
            if (!res.ok) throw new Error("Polling gagal");
            return res.json();
          }}
        />
      )}

      {/* MODAL BULK IMPORT GURU */}
      {isTeacherBulkModalOpen && (
        <BulkUploadModal
          title="Import Data Guru"
          description={`Upload file Excel sesuai template. Sistem akan membuat username (nama+NIP) dan password default (Password123!) untuk setiap guru. Pastikan kolom nama_sekolah diisi dengan: "${school.name}".`}
          templateFileName={`Template_Guru_${school.name.replace(/[^a-zA-Z0-9]/g, "_")}`}
          templateHeaders={[]}
          onDownloadTemplate={handleDownloadGuruTemplate}
          onClose={() => setIsTeacherBulkModalOpen(false)}
          onUpload={handleBulkUploadGuru}
        />
      )}

      {/* MODAL TAMBAH/EDIT GURU */}
      <Modal open={isTeacherModalOpen} onClose={() => { setIsTeacherModalOpen(false); setEditingTeacher(null); }} title={editingTeacher ? "Edit Guru" : "Tambah Guru Baru"}>
        <form onSubmit={handleTeacherSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* ── Identitas ── */}
          <div>
            <label className="form-label">Nama Lengkap *</label>
            <input name="full_name" className="form-input" required placeholder="Nama lengkap guru" defaultValue={editingTeacher?.full_name} style={{ width: "100%" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">NIP (Opsional)</label>
              <input name="nip" className="form-input" placeholder="Nomor Induk Pegawai" defaultValue={editingTeacher?.nip || ""} style={{ width: "100%" }} />
            </div>
            <div>
              <label className="form-label">Email Guru (Opsional)</label>
              <input type="email" name="email" className="form-input" placeholder="email@contoh.com" defaultValue={editingTeacher?.email || ""} style={{ width: "100%" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Jenis Kelamin *</label>
              <select name="gender" className="form-input" required defaultValue={editingTeacher?.gender || "L"} style={{ width: "100%" }}>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="form-label">Tanggal Lahir *</label>
              <input type="date" name="birth_date" className="form-input" required defaultValue={editingTeacher?.birth_date || ""} style={{ width: "100%" }} />
            </div>
          </div>

          {/* ── Info Sekolah (Read-Only) & Alamat ── */}
          <div>
            <label className="form-label">Nama Sekolah</label>
            <input
              className="form-input"
              value={school.name}
              readOnly
              style={{ width: "100%", background: "#f3f4f6", cursor: "not-allowed", color: "#6b7280" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Kelurahan / Desa *</label>
              <input name="village" className="form-input" required defaultValue={editingTeacher?.village || ""} style={{ width: "100%" }} />
            </div>
            <div>
              <label className="form-label">Kecamatan *</label>
              <input name="district" className="form-input" required defaultValue={editingTeacher?.district || ""} style={{ width: "100%" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Kabupaten / Kota *</label>
              <input name="regency" className="form-input" required defaultValue={editingTeacher?.city || ""} style={{ width: "100%" }} />
            </div>
            <div>
              <label className="form-label">Provinsi *</label>
              <input name="province" className="form-input" required defaultValue={editingTeacher?.province || ""} style={{ width: "100%" }} />
            </div>
          </div>

          {/* ── Relasi Kelas ── */}
          <div>
            <label className="form-label">Relasikan Kelas (Pilih yang akan diajar) *</label>
            <div style={{ padding: "0.75rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", maxHeight: "150px", overflowY: "auto" }}>
              {classes.length === 0 && <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Tidak ada kelas tersedia di sekolah ini.</span>}
              {classes.map((c: any) => {
                const existingTeacher = (c.users as any)?.full_name;
                const isChecked = editingTeacher?.classes?.some((ec: any) => ec.id === c.id);
                return (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input type="checkbox" name="class_ids" value={c.id} defaultChecked={isChecked} />
                    <span style={{ fontSize: "0.85rem" }}>
                      {c.name}{" "}
                      {existingTeacher && existingTeacher !== editingTeacher?.full_name
                        ? <small style={{ color: "#ef4444" }}>(sudah ada wali: {existingTeacher})</small>
                        : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Status & Info Akun ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Status Akun *</label>
              <select name="is_active" className="form-input" required defaultValue={editingTeacher ? (editingTeacher.is_active ? "true" : "false") : "true"} style={{ width: "100%" }}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            {!editingTeacher && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <div style={{ fontSize: "0.78rem", color: "#6b7280", background: "#f9fafb", padding: "0.625rem", borderRadius: "0.375rem", border: "1px solid #e5e7eb", width: "100%" }}>
                  ℹ Username: <strong>nama+3 digit NIP/acak</strong><br />
                  Password default: <code>Password123!</code>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <Button type="button" variant="outline" onClick={() => { setIsTeacherModalOpen(false); setEditingTeacher(null); }}>Batal</Button>
            <Button type="submit" disabled={isPending} style={{ backgroundColor: "#102e50", color: "white" }}>
              {isPending ? "Menyimpan..." : "Simpan Guru"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL BULK IMPORT ANAK */}
      {isStudentBulkModalOpen && (
        <BulkUploadModal
          title="Import Anak via Excel"
          description={`Upload file Excel sesuai template. Sistem akan otomatis men-generate username dan PIN anak berdasarkan NISN. Pastikan field SES diisi sama persis dengan opsi di sistem.`}
          templateFileName={`Template_Anak_${school.name.replace(/[^a-zA-Z0-9]/g, "_")}`}
          templateHeaders={[]}
          onDownloadTemplate={handleDownloadStudentTemplate}
          onClose={(success) => {
            setIsStudentBulkModalOpen(false);
            if (success) {
              showSuccessToast("Berhasil", "Data anak berhasil diimpor.");
              router.refresh();
            }
          }}
          onUpload={handleBulkUploadStudent}
        />
      )}

      {/* MODAL TAMBAH/EDIT ANAK */}
      <Modal open={isStudentModalOpen} onClose={() => { setIsStudentModalOpen(false); setEditingStudent(null); }} title={editingStudent ? "Edit Anak" : "Tambah Anak Baru"}>
        <form onSubmit={handleStudentSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* ── Identitas Siswa ── */}
          <div>
            <label className="form-label">Nama Lengkap *</label>
            <input name="full_name" className="form-input" required defaultValue={editingStudent?.full_name} placeholder="Nama lengkap siswa" style={{ width: "100%" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">NISN (Opsional)</label>
              <input name="nisn" className="form-input" defaultValue={editingStudent?.nisn || ""} placeholder="Nomor Induk Siswa Nasional" style={{ width: "100%" }} />
            </div>
            <div>
              <label className="form-label">NPSN (Opsional)</label>
              <input name="npsn" className="form-input" defaultValue={school.npsn || ""} placeholder="Nomor Pokok Sekolah Nasional" style={{ width: "100%" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Jenis Kelamin *</label>
              <select name="gender" className="form-input" required defaultValue={editingStudent?.gender || "L"} style={{ width: "100%" }}>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="form-label">Tanggal Lahir *</label>
              <input type="date" name="birth_date" className="form-input" required defaultValue={editingStudent?.birth_date || ""} style={{ width: "100%" }} />
            </div>
          </div>

          {/* ── Info Sekolah & Kelas ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Nama Sekolah</label>
              <input
                className="form-input"
                value={school.name}
                readOnly
                style={{ width: "100%", background: "#f3f4f6", cursor: "not-allowed", color: "#6b7280" }}
              />
            </div>
            <div>
              <label className="form-label">Pilih Kelas *</label>
              <select name="class_id" className="form-input" required defaultValue={editingStudent?.class_id || (editingStudent?.classes as any)?.id || ""} style={{ width: "100%" }}>
                <option value="">-- Pilih --</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* ── Info Keluarga (SES) ── */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "0.875rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.625rem" }}>
              👨‍👩‍👧 Latar Belakang Keluarga (Wajib diisi)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Pekerjaan Ibu *</label>
                <select name="mother_occupation_id" className="form-input" required defaultValue={editingStudent?.mother_occupation_id || ""} style={{ width: "100%", fontSize: "0.8rem" }}>
                  <option value="">-- Pilih --</option>
                  {sesVariables.filter(v => v.type === 'occupation').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Pekerjaan Ayah *</label>
                <select name="father_occupation_id" className="form-input" required defaultValue={editingStudent?.father_occupation_id || ""} style={{ width: "100%", fontSize: "0.8rem" }}>
                  <option value="">-- Pilih --</option>
                  {sesVariables.filter(v => v.type === 'occupation').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Pendidikan Ibu *</label>
                <select name="mother_education_id" className="form-input" required defaultValue={editingStudent?.mother_education_id || ""} style={{ width: "100%", fontSize: "0.8rem" }}>
                  <option value="">-- Pilih --</option>
                  {sesVariables.filter(v => v.type === 'education').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Pendidikan Ayah *</label>
                <select name="father_education_id" className="form-input" required defaultValue={editingStudent?.father_education_id || ""} style={{ width: "100%", fontSize: "0.8rem" }}>
                  <option value="">-- Pilih --</option>
                  {sesVariables.filter(v => v.type === 'education').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Alamat Siswa ── */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "0.875rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.625rem" }}>
              🏠 Alamat Domisili Anak
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Kelurahan / Desa *</label>
                <input name="village" className="form-input" required defaultValue={editingStudent?.village || ""} placeholder="Kelurahan" style={{ width: "100%" }} />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Kecamatan *</label>
                <input name="district" className="form-input" required defaultValue={editingStudent?.district || ""} placeholder="Kecamatan" style={{ width: "100%" }} />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Kabupaten / Kota *</label>
                <input name="city" className="form-input" required defaultValue={editingStudent?.city || ""} placeholder="Kabupaten" style={{ width: "100%" }} />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Provinsi *</label>
                <input name="province" className="form-input" required defaultValue={editingStudent?.province || ""} placeholder="Provinsi" style={{ width: "100%" }} />
              </div>
            </div>
          </div>

          {/* ── Status Akun & Info ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Status Akun *</label>
              <select name="is_active" className="form-input" required defaultValue={editingStudent ? (editingStudent.is_active ? "true" : "false") : "true"} style={{ width: "100%" }}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            {!editingStudent && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <div style={{ fontSize: "0.78rem", color: "#6b7280", background: "#f9fafb", padding: "0.625rem", borderRadius: "0.375rem", border: "1px solid #e5e7eb", width: "100%" }}>
                  ℹ Username otomatis: <strong>nama+3 digit NISN</strong><br />
                  PIN default: <code>123456</code>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button type="button" variant="outline" onClick={() => { setIsStudentModalOpen(false); setEditingStudent(null); }}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan Anak"}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL TAMBAH/EDIT KELAS */}
      <Modal open={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title={editingClass ? "Edit Kelas" : "Tambah Kelas Baru"}>
        <form onSubmit={handleClassSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="form-label">Nama Kelas *</label>
            <input name="name" className="form-input" required placeholder="Contoh: 1A, 2B, dll" defaultValue={editingClass?.name} style={{ width: "100%" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Tingkat (Grade) *</label>
              <select name="grade" className="form-input" required defaultValue={editingClass?.grade || "1"} style={{ width: "100%" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Tahun Ajaran *</label>
              <input name="academic_year" className="form-input" required placeholder="Contoh: 2026/2027" defaultValue={editingClass?.academic_year || "2026/2027"} style={{ width: "100%" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Wali Kelas (Opsional)</label>
              <select name="teacher_id" className="form-input" defaultValue={editingClass?.users?.[0]?.id || editingClass?.teacher_id || ""} style={{ width: "100%" }}>
                <option value="">-- Pilih Wali Kelas --</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Status *</label>
              <select name="is_active" className="form-input" required defaultValue={editingClass ? (editingClass.is_active ? "true" : "false") : "true"} style={{ width: "100%" }}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button type="button" variant="outline" onClick={() => setIsClassModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan Kelas"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
