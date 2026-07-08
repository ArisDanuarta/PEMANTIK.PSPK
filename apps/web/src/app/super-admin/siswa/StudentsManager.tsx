"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { Table, Button, Modal, Badge, useToast, useConfirm, SesBadge } from "@pemantik/ui";
import { createStudentAction, bulkCreateStudentsAction, updateStudentAction, deleteStudentAction, resetStudentPasswordAction } from "../../actions/students";
import BulkUploadModal from "@/components/shared/BulkUploadModal";
import SearchableSelect from "@/components/shared/SearchableSelect";
import * as XLSX from "xlsx";

interface Student {
  id: string;
  full_name: string;
  nisn: string | null;
  gender: string;
  username: string;
  is_active: boolean;
  schools: {
    name: string;
    communities: { name: string } | null;
  } | null;
  classes?: any;
  ses_class?: string | null;
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

interface StudentsManagerProps {
  initialStudents: Student[];
  schools: SchoolOption[];
  sesVariables: any[];
  classes: ClassOption[];
}

export default function StudentsManager({ initialStudents, schools, sesVariables = [], classes = [] }: StudentsManagerProps) {
  const [search, setSearch] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [uploadLoading, setUploadLoading] = useState(false);
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredStudents = initialStudents.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      (s.nisn?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (s.schools?.name?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = editingStudent 
        ? await updateStudentAction(editingStudent.id, formData)
        : await createStudentAction(formData);
        
      if (result.success) {
        success("Berhasil", result.message || `Siswa ${editingStudent ? 'diperbarui' : 'ditambahkan'}.`);
        setIsManualModalOpen(false);
        setEditingStudent(null);
      } else {
        error("Gagal", result.error || `Gagal ${editingStudent ? 'memperbarui' : 'membuat'} siswa.`);
      }
    });
  };

  const handleDelete = async (row: any) => {
    const isConfirmed = await confirm({
      title: "Hapus Siswa",
      description: `Yakin ingin menghapus siswa ${row.full_name}?`,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      variant: "danger"
    });
    if (!isConfirmed) return;
    
    startTransition(async () => {
      const result = await deleteStudentAction(row.id);
      if (result.success) success("Berhasil", result.message || "Siswa dihapus.");
      else error("Gagal", result.error || "Gagal menghapus siswa.");
    });
  };

  const handleResetPassword = async (row: any) => {
    const isConfirmed = await confirm({
      title: "Reset PIN",
      description: `Apakah Anda yakin ingin mereset PIN siswa '${row.full_name}' ke default (123456)?`,
      confirmLabel: "Reset",
      cancelLabel: "Batal",
      variant: "warning"
    });
    if (!isConfirmed) return;
    
    startTransition(async () => {
      const result = await resetStudentPasswordAction(row.id);
      if (result.success) success("Berhasil", "PIN siswa berhasil di-reset.");
      else error("Gagal", result.error || "Terjadi kesalahan.");
    });
  };

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setSelectedSchoolId("");
    setIsManualModalOpen(true);
  };

  const handleOpenEditModal = (row: any) => {
    setEditingStudent(row);
    setSelectedSchoolId(row.schools?.id || "");
    setIsManualModalOpen(true);
  };

  const handleBulkUpload = async (data: any[]) => {
    const result = await bulkCreateStudentsAction(data);
    if (result.success) {
      success("Impor Selesai", result.message || "");
      setIsBulkModalOpen(false);
    }
    return result;
  };

  const handleDownloadTemplate = () => {
    const headers = ["nama_siswa", "nisn", "jenis_kelamin", "tanggal_lahir", "nama_sekolah", "npsn", "pilih_kelas", "pekerjaan_ibu", "pekerjaan_ayah", "pendidikan_ibu", "pendidikan_ayah", "kelurahan", "kecamatan", "kabupaten", "provinsi"];
    const wsData = [
      headers,
      ["Ahmad Fikri", "10203040", "L", "2015-05-12", schools[0]?.name || "Sekolah Contoh", "20202020", "5A", "Petani", "Guru", "SD", "S1", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Petunjuk Sheet
    const petunjukData = [
      ["Kolom", "Wajib?", "Keterangan / Contoh"],
      ["nama_siswa", "Ya", "Nama lengkap siswa."],
      ["nisn", "Tidak", "NISN siswa. Opsional."],
      ["jenis_kelamin", "Ya", "L untuk Laki-laki, P untuk Perempuan."],
      ["tanggal_lahir", "Ya", "Format YYYY-MM-DD (Misal: 2010-12-05)."],
      ["nama_sekolah", "Ya", "Pastikan ejaan nama sekolah persis sama dengan yang terdaftar."],
      ["npsn", "Tidak", "NPSN sekolah. Opsional."],
      ["pilih_kelas", "Ya", "Nama atau kode kelas. (Misal: 5A, 6B). Harus sama dengan kelas yang ada di sistem."],
      ["pekerjaan_ibu", "Ya", "Pekerjaan ibu. Contoh: Guru, Petani, Wiraswasta."],
      ["pekerjaan_ayah", "Ya", "Pekerjaan ayah. Contoh: Guru, Petani, Wiraswasta."],
      ["pendidikan_ibu", "Ya", "Pendidikan ibu. Contoh: SD, SMP, SMA, S1."],
      ["pendidikan_ayah", "Ya", "Pendidikan ayah. Contoh: SD, SMP, SMA, S1."],
      ["kelurahan", "Ya", "Kelurahan / Desa."],
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

    XLSX.writeFile(wb, "Template_Siswa.xlsx");
  };

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
        <input
          type="text"
          placeholder="Cari nama, NISN, username, atau sekolah..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ maxWidth: "350px" }}
        />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button variant="outline" onClick={handleDownloadTemplate} style={{ color: "#0874aa", borderColor: "#0874aa" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.5rem", display: "inline-block", verticalAlign: "middle" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download Template
          </Button>
          {/* Tombol create dipindah ke halaman Detail Sekolah via Import Dapodik (D4) */}
        </div>
      </div>

      {/* Info banner — read-only global view */}
      <div style={{ margin: "0 1.5rem 1rem", padding: "0.75rem 1rem", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "0.5rem", fontSize: "0.85rem", color: "#0369a1", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span>ℹ</span>
        <span>
          Halaman ini menampilkan rekap semua siswa lintas sekolah.
          Untuk <strong>menambah siswa</strong>, gunakan{" "}
          <a href="/super-admin/sekolah" style={{ color: "#0369a1", fontWeight: 600 }}>Import Dapodik di halaman Sekolah</a>.
        </span>
      </div>

      <table className="pemantik-table">
        <thead>
          <tr>
            <th>Nama Siswa</th>
            <th>NISN & Gender</th>
            <th>Akun Akses</th>
            <th>Kelas & Guru</th>
            <th>Sekolah</th>
            <th>SES</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "3rem 1rem", color: "#6c757d" }}>
                Tidak ada data siswa ditemukan.
              </td>
            </tr>
          ) : (
            filteredStudents.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.full_name}</strong></td>
                <td>
                  <div style={{ fontWeight: 500 }}>NISN: {row.nisn || "—"}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>{row.gender === "L" ? "Laki-laki" : "Perempuan"}</div>
                </td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                    <div><span style={{ color: "#6c757d" }}>User:</span> <strong>{row.username}</strong></div>
                    <div><span style={{ color: "#6c757d" }}>PIN:</span> <code style={{ color: "#a8281c" }}>123456</code></div>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 500, color: "#102e50" }}>{row.classes?.name || "—"}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>Guru: {row.classes?.users?.full_name || "—"}</div>
                </td>
                <td>{row.schools?.name || "—"}</td>
                <td>
                  {row.ses_class ? (
                  <SesBadge sesClass={row.ses_class} />
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>Belum Dihitung</span>
                  )}
                </td>
                <td>
                  <Badge variant={row.is_active ? "success" : "danger"}>
                    {row.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(row)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => handleResetPassword(row)}>Reset PIN</Button>
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
              {editingStudent ? "Edit Siswa" : "Tambah Siswa Baru"}
            </h2>
            <form onSubmit={handleManualSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Sekolah Asal *</label>
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
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Pilih Kelas *</label>
                  <select name="class_id" required defaultValue={editingStudent?.classes?.id || ""} className="form-input" style={{ width: "100%" }} disabled={!selectedSchoolId}>
                    <option value="">-- Pilih Kelas --</option>
                    {classes.filter(c => c.school_id === selectedSchoolId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Nama Lengkap *</label>
                <input type="text" name="full_name" required defaultValue={editingStudent?.full_name} className="form-input" style={{ width: "100%" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>NISN (Opsional)</label>
                  <input type="text" name="nisn" defaultValue={editingStudent?.nisn} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Gender *</label>
                  <select name="gender" required defaultValue={editingStudent?.gender} className="form-input" style={{ width: "100%" }}>
                    <option value="">Pilih</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Tanggal Lahir *</label>
                <input type="date" name="birth_date" required defaultValue={editingStudent?.birth_date} className="form-input" style={{ width: "100%" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kelurahan / Desa *</label>
                  <input type="text" name="village" required defaultValue={editingStudent?.village} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kecamatan *</label>
                  <input type="text" name="district" required defaultValue={editingStudent?.district} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kabupaten / Kota *</label>
                  <input type="text" name="city" required defaultValue={editingStudent?.city} className="form-input" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Provinsi *</label>
                  <input type="text" name="province" required defaultValue={editingStudent?.province} className="form-input" style={{ width: "100%" }} />
                </div>
              </div>

              <div style={{ marginBottom: "1rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem", color: "#102e50" }}>Data Pekerjaan & Pendidikan Orang Tua (SES)</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Pendidikan Ayah *</label>
                    <select name="father_education_id" required defaultValue={editingStudent?.father_education_id} className="form-input" style={{ width: "100%" }}>
                      <option value="">-- Pilih --</option>
                      {sesVariables.filter(v => v.type === 'education').map(v => (
                        <option key={`fe-${v.id}`} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Pekerjaan Ayah *</label>
                    <select name="father_occupation_id" required defaultValue={editingStudent?.father_occupation_id} className="form-input" style={{ width: "100%" }}>
                      <option value="">-- Pilih --</option>
                      {sesVariables.filter(v => v.type === 'occupation').map(v => (
                        <option key={`fj-${v.id}`} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Pendidikan Ibu *</label>
                    <select name="mother_education_id" required defaultValue={editingStudent?.mother_education_id} className="form-input" style={{ width: "100%" }}>
                      <option value="">-- Pilih --</option>
                      {sesVariables.filter(v => v.type === 'education').map(v => (
                        <option key={`me-${v.id}`} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Pekerjaan Ibu *</label>
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
                  Sistem akan secara otomatis membuat <b>Username</b> unik dan PIN default <b>123456</b> untuk siswa login ke mobile app.
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
          title="Import Data Siswa"
          description="Download template, isi data siswa, dan upload kembali. Sistem akan men-generate username dan PIN unik untuk tiap siswa secara otomatis."
          templateFileName="Template_Siswa"
          templateHeaders={["nama_siswa", "nisn", "jenis_kelamin", "tanggal_lahir", "nama_sekolah", "npsn", "pilih_kelas", "pekerjaan_ibu", "pekerjaan_ayah", "pendidikan_ibu", "pendidikan_ayah", "kelurahan", "kecamatan", "kabupaten", "provinsi"]}
          templateData={[
            ["Ahmad Fikri", "10203040", "L", "2015-05-12", schools[0]?.name || "Sekolah Contoh", "20202020", "5A", "Petani", "Guru", "SD", "S1", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta"]
          ]}
          onClose={() => setIsBulkModalOpen(false)}
          onUpload={handleBulkUpload}
        />
      )}
    </div>
  );
}
