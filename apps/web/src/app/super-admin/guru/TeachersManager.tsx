"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, useToast, useConfirm } from "@pemantik/ui";
import { createTeacherAction, bulkCreateTeachersAction, updateTeacherAction, deleteTeacherAction, resetTeacherPasswordAction } from "../../actions/teachers";
import BulkUploadModal from "@/components/shared/BulkUploadModal";
import SearchableSelect from "@/components/shared/SearchableSelect";
import * as XLSX from "xlsx";

interface Teacher {
  id: string;
  full_name: string;
  username: string;
  is_active: boolean;
  schools: {
    name: string;
    communities: { name: string } | null;
  } | null;
  classes?: { name: string }[];
}

interface SchoolOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  school_id: string;
}

interface TeachersManagerProps {
  initialTeachers: Teacher[];
  schools: SchoolOption[];
  classes: ClassOption[];
}

export default function TeachersManager({ initialTeachers, schools, classes }: TeachersManagerProps) {
  const [search, setSearch] = useState("");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  
  const [isPending, startTransition] = useTransition();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredTeachers = initialTeachers.filter(
    (t) =>
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      t.username.toLowerCase().includes(search.toLowerCase()) ||
      (t.schools?.name?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = editingTeacher 
        ? await updateTeacherAction(editingTeacher.id, formData)
        : await createTeacherAction(formData);
        
      if (result.success) {
        showSuccessToast("Berhasil", result.message || `Guru ${editingTeacher ? 'diperbarui' : 'ditambahkan'}.`);
        setIsManualModalOpen(false);
        setEditingTeacher(null);
      } else {
        showErrorToast("Gagal", result.error || `Gagal ${editingTeacher ? 'memperbarui' : 'membuat'} guru.`);
      }
    });
  };

  const handleDelete = async (row: any) => {
    const isConfirmed = await confirm({
      title: "Hapus Guru",
      description: `Yakin ingin menghapus guru ${row.full_name}?`,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      variant: "danger"
    });
    if (!isConfirmed) return;
    
    startTransition(async () => {
      const result = await deleteTeacherAction(row.id);
      if (result.success) showSuccessToast("Berhasil", result.message || "Guru dihapus.");
      else showErrorToast("Gagal", result.error || "Gagal menghapus guru.");
    });
  };

  const handleResetPassword = async (row: any) => {
    const isConfirmed = await confirm({
      title: "Reset Sandi",
      description: `Apakah Anda yakin ingin mereset kata sandi guru '${row.full_name}' ke default (Password123!)?`,
      confirmLabel: "Reset",
      cancelLabel: "Batal",
      variant: "warning"
    });
    if (!isConfirmed) return;

    startTransition(async () => {
      const result = await resetTeacherPasswordAction(row.id);
      if (result.success) showSuccessToast("Berhasil", "Kata sandi guru berhasil di-reset.");
      else showErrorToast("Gagal", result.error || "Terjadi kesalahan.");
    });
  };

  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setSelectedSchoolId("");
    setIsManualModalOpen(true);
  };

  const handleOpenEditModal = (row: any) => {
    setEditingTeacher(row);
    setSelectedSchoolId(row.schools?.id || "");
    setIsManualModalOpen(true);
  };

  const handleBulkUpload = async (data: any[]) => {
    const result = await bulkCreateTeachersAction(data);
    if (result.success) {
      showSuccessToast("Impor Selesai", result.message || "");
      setIsBulkModalOpen(false);
    }
    return result;
  };

  const handleDownloadTemplate = () => {
    const headers = ["nama_guru", "email", "nip", "jenis_kelamin", "tanggal_lahir", "kelurahan", "kecamatan", "kabupaten", "provinsi", "nama_sekolah", "kelas"];
    const wsData = [
      headers,
      ["Budi Santoso", "budi@sekolah.com", "198001012005011003", "L", "1980-01-01", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta", schools[0]?.name || "Sekolah Contoh", "5A"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Petunjuk Sheet
    const petunjukData = [
      ["Kolom", "Wajib?", "Keterangan / Contoh"],
      ["nama_guru", "Ya", "Nama lengkap guru."],
      ["email", "Ya", "Email aktif. Digunakan sebagai username login."],
      ["nip", "Tidak", "Nomor Induk Pegawai."],
      ["jenis_kelamin", "Ya", "L untuk Laki-laki, P untuk Perempuan."],
      ["tanggal_lahir", "Ya", "Format YYYY-MM-DD (Misal: 1980-01-01)."],
      ["kelurahan", "Ya", "Kelurahan / Desa domisili."],
      ["kecamatan", "Ya", "Kecamatan domisili."],
      ["kabupaten", "Ya", "Kabupaten / Kota domisili."],
      ["provinsi", "Ya", "Provinsi domisili."],
      ["nama_sekolah", "Ya", "Pastikan ejaan persis sama dengan nama sekolah di sistem."],
      ["kelas", "Ya", "Daftar kelas yang diajar. Pisahkan dengan koma jika lebih dari satu (Contoh: 5A, 5B). Kelas harus sudah terdaftar di sekolah tersebut."]
    ];
    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk Pengisian");
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    
    const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
    ws['!cols'] = colWidths;
    wsPetunjuk['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 50 }];

    XLSX.writeFile(wb, "Template_Guru.xlsx");
  };

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
        <input
          type="text"
          placeholder="Cari nama guru, username, atau sekolah..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ maxWidth: "300px" }}
        />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button variant="outline" onClick={handleDownloadTemplate} style={{ color: "#0874aa", borderColor: "#0874aa" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.5rem", display: "inline-block", verticalAlign: "middle" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download Template
          </Button>
          {/* Tombol create dipindah ke halaman Detail Sekolah (D4) */}
        </div>
      </div>

      {/* Info banner — read-only global view */}
      <div style={{ margin: "0 1.5rem 1rem", padding: "0.75rem 1rem", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "0.5rem", fontSize: "0.85rem", color: "#0369a1", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span>ℹ</span>
        <span>
          Halaman ini menampilkan rekap semua guru lintas sekolah.
          Untuk <strong>menambah guru baru</strong>, buka halaman{" "}
          <a href="/super-admin/sekolah" style={{ color: "#0369a1", fontWeight: 600 }}>Detail Sekolah → Tab Guru</a>.
        </span>
      </div>

      <table className="pemantik-table">
        <thead>
          <tr>
            <th>Nama Guru</th>
            <th>Akun Akses</th>
            <th>Sekolah</th>
            <th>Komunitas</th>
            <th>Kelas Terpilih</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filteredTeachers.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "3rem 1rem", color: "#6c757d" }}>
                Tidak ada data guru ditemukan.
              </td>
            </tr>
          ) : (
            filteredTeachers.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.full_name}</strong></td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                    <div><span style={{ color: "#6c757d" }}>User:</span> <strong>{row.username}</strong></div>
                    <div><span style={{ color: "#6c757d" }}>Pass:</span> <code style={{ color: "#a8281c" }}>Password123!</code></div>
                  </div>
                </td>
                <td>{row.schools?.name || "—"}</td>
                <td>{row.schools?.communities?.name || "—"}</td>
                <td>
                  {row.classes && row.classes.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                      {row.classes.map((c: any) => (
                        <span key={c.name} style={{ padding: "0.15rem 0.4rem", backgroundColor: "#f3f4f6", borderRadius: "0.25rem", fontSize: "0.75rem", border: "1px solid #e5e7eb" }}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  ) : "—"}
                </td>
                <td>
                  <Badge variant={row.is_active ? "success" : "danger"}>
                    {row.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(row)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => handleResetPassword(row)}>Reset Sandi</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(row)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* MANUAL MODAL */}
      {isManualModalOpen && mounted && createPortal(
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, padding: "2rem 1rem", overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "0.5rem", width: "100%", maxWidth: "600px", margin: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem" }}>
              {editingTeacher ? "Edit Guru" : "Tambah Guru Baru"}
            </h2>
            <form onSubmit={handleManualSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Sekolah Tempat Mengajar *</label>
                  <SearchableSelect 
                    name="school_id" 
                    required={true}
                    options={schools.map(s => ({ value: s.id, label: s.name }))}
                    value={selectedSchoolId}
                    onChange={(val) => setSelectedSchoolId(val)}
                    placeholder="-- Pilih Sekolah --"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Daftar Kelas *</label>
                  {selectedSchoolId ? (
                     <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "150px", overflowY: "auto", border: "1px solid #e5e7eb", padding: "0.75rem", borderRadius: "0.375rem" }}>
                       {classes.filter(c => c.school_id === selectedSchoolId).length > 0 ? (
                         classes.filter(c => c.school_id === selectedSchoolId).map(c => {
                           const isChecked = editingTeacher?.classes?.some((ec: any) => ec.name === c.name);
                           return (
                             <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                               <input type="checkbox" name="class_ids" value={c.id} defaultChecked={isChecked} />
                               {c.name}
                             </label>
                           );
                         })
                       ) : (
                         <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>Belum ada kelas di sekolah ini.</span>
                       )}
                     </div>
                  ) : (
                     <div style={{ padding: "0.75rem", border: "1px dashed #e5e7eb", borderRadius: "0.375rem", fontSize: "0.8rem", color: "#6c757d", textAlign: "center" }}>
                        Pilih sekolah terlebih dahulu
                     </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Nama Lengkap *</label>
                  <input type="text" name="full_name" required defaultValue={editingTeacher?.full_name} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Email (Menjadi Username) *</label>
                  <input type="email" name="email" required defaultValue={editingTeacher?.username ? `${editingTeacher.username}@pemantik.id` : ""} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Tanggal Lahir *</label>
                  <input type="date" name="birth_date" required defaultValue={editingTeacher?.birth_date} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Gender *</label>
                  <select name="gender" required defaultValue={editingTeacher?.gender} className="form-input" style={{ width: "100%" }}>
                    <option value="">-- Pilih --</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>NIP (Opsional)</label>
                  <input type="text" name="nip" defaultValue={editingTeacher?.nip} className="form-input" style={{ width: "100%" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kelurahan / Desa *</label>
                  <input type="text" name="village" required defaultValue={editingTeacher?.village} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kecamatan *</label>
                  <input type="text" name="district" required defaultValue={editingTeacher?.district} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kabupaten / Kota *</label>
                  <input type="text" name="regency" required defaultValue={editingTeacher?.regency} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Provinsi *</label>
                  <input type="text" name="province" required defaultValue={editingTeacher?.province} className="form-input" style={{ width: "100%" }} />
                </div>
              </div>

              {!editingTeacher && (
                <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "1.5rem" }}>
                  * Password default untuk guru baru adalah <b>Password123!</b>
                </div>
              )}
              
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)} disabled={isPending}>Batal</Button>
                <Button type="submit" disabled={isPending} style={{ backgroundColor: "#102e50", color: "white" }}>
                  {isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <BulkUploadModal
          title="Import Data Guru"
          description="Download template di luar ini, isi data, dan upload kembali. Sistem akan otomatis membuat akun untuk setiap guru yang di-upload dengan password default (Password123!)."
          templateFileName="Template_Guru"
          templateHeaders={["nama_guru", "email"]}
          templateData={schools.slice(0, 3).map(s => [s.id, "Budi Santoso", "budi@sekolah.com"])}
          onClose={() => setIsBulkModalOpen(false)}
          onUpload={handleBulkUpload}
        />
      )}
    </div>
  );
}
