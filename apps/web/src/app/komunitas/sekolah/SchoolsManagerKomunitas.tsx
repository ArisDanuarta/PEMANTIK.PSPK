"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Badge, Button, useToast, useConfirm } from "@pemantik/ui";
import { createSchoolAction, updateSchoolAction, deleteSchoolAction, bulkCreateSchoolsAction, resetSchoolPasswordAction } from "../../actions/schools";
import BulkUploadModal from "@/components/shared/BulkUploadModal";
import * as XLSX from "xlsx";

interface School {
  id: string;
  name: string;
  npsn: string | null;
  address: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  principal_name: string | null;
  contact_phone: string | null;
  community_id: string;
  users?: { username: string; role: string }[];
  classes?: any[];
  is_active: boolean;
  email?: string;
  jenjang_sekolah?: string;
  status_sekolah?: string;
}

interface SchoolsManagerKomunitasProps {
  initialSchools: School[];
  communityId: string;
  communityName: string;
}

export default function SchoolsManagerKomunitas({ initialSchools, communityId, communityName }: SchoolsManagerKomunitasProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const [isPending, startTransition] = useTransition();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const filteredSchools = initialSchools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.npsn?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingSchool(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (school: School) => {
    setEditingSchool(school);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Pastikan community_id selalu diset ke komunitas saat ini
    formData.set("community_id", communityId);
    
    startTransition(async () => {
      let result;
      if (editingSchool) {
         result = await updateSchoolAction(editingSchool.id, formData);
      } else {
         result = await createSchoolAction(formData);
      }

      if (result.success) {
        showSuccessToast(editingSchool ? "Sekolah diperbarui" : "Sekolah ditambahkan", result.message || "");
        setIsModalOpen(false);
      } else {
        showErrorToast("Gagal", result.error || "Terjadi kesalahan.");
      }
    });
  };

  const handleDelete = async (school: School) => {
    const ok = await confirm({
      title: "Hapus Sekolah?",
      description: `Apakah Anda yakin ingin menghapus sekolah '${school.name}' beserta data akun aksesnya? Aksi ini tidak dapat dibatalkan.`,
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      variant: "danger",
    });

    if (!ok) return;

    startTransition(async () => {
      const result = await deleteSchoolAction(school.id);
      if (result.success) {
        showSuccessToast("Dihapus", result.message || "Sekolah berhasil dihapus.");
      } else {
        showErrorToast("Gagal", result.error || "Gagal menghapus sekolah.");
      }
    });
  };

  const handleResetPassword = async (school: School) => {
    const ok = await confirm({
      title: "Reset Sandi",
      description: `Apakah Anda yakin ingin mereset kata sandi admin sekolah '${school.name}' ke default (Password123!)?`,
      confirmLabel: "Reset",
      cancelLabel: "Batal",
      variant: "warning",
    });

    if (!ok) return;

    startTransition(async () => {
      const result = await resetSchoolPasswordAction(school.id);
      if (result.success) {
        showSuccessToast("Berhasil", "Kata sandi admin sekolah berhasil di-reset.");
      } else {
        showErrorToast("Gagal", result.error || "Terjadi kesalahan.");
      }
    });
  };

  const handleBulkUpload = async (data: any[]) => {
    // Sisipkan community_id pada setiap baris data agar backend action menggunakan milik komunitas kita
    const preparedData = data.map(row => ({
      ...row,
      community_id: communityId
    }));

    const result = await bulkCreateSchoolsAction(preparedData);
    if (result.success) {
      showSuccessToast("Impor Selesai", result.message || "");
      setIsBulkModalOpen(false);
    }
    return result;
  };

  const handleDownloadTemplate = () => {
    const headers = ["nama_sekolah", "npsn", "email_sekolah", "status_sekolah", "jenjang_sekolah", "kepala_sekolah", "nomor_telepon", "daftar_kelas", "kelurahan_desa", "kecamatan", "kabupaten", "provinsi"];
    const wsData = [
      headers,
      ["Contoh SD 1", "20101010", "sd1@contoh.com", "Negeri", "SD", "Budi", "08123456789", "5A, 5B, 6A", "Dago", "Coblong", "Bandung", "Jawa Barat"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Add instruction sheet
    const instructions = [
      ["Kolom", "Wajib", "Keterangan"],
      ["nama_sekolah", "Ya", "Nama lengkap sekolah"],
      ["npsn", "Tidak", "Nomor Pokok Sekolah Nasional"],
      ["email_sekolah", "Tidak", "Email sekolah"],
      ["status_sekolah", "Ya", "Status sekolah (Misal: Negeri / Swasta)"],
      ["jenjang_sekolah", "Ya", "Jenjang pendidikan (Misal: SD, SMP, SMA)"],
      ["kepala_sekolah", "Tidak", "Nama Kepala Sekolah"],
      ["nomor_telepon", "Tidak", "Nomor Telepon Sekolah"],
      ["daftar_kelas", "Ya", "Daftar kelas yang ikut asesmen. Pisahkan dengan koma (Contoh: 5A, 5B)."],
      ["kelurahan_desa", "Ya", "Kelurahan / Desa lokasi sekolah"],
      ["kecamatan", "Ya", "Kecamatan lokasi sekolah"],
      ["kabupaten", "Ya", "Kabupaten / Kota lokasi sekolah"],
      ["provinsi", "Ya", "Provinsi lokasi sekolah"]
    ];
    const wsHelp = XLSX.utils.aoa_to_sheet(instructions);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Sekolah");
    XLSX.utils.book_append_sheet(wb, wsHelp, "Petunjuk Pengisian");

    XLSX.writeFile(wb, "Template_Sekolah_Komunitas.xlsx");
  };

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
        <input
          type="text"
          placeholder="Cari nama atau NPSN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ maxWidth: "300px" }}
        />
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Button variant="outline" onClick={handleDownloadTemplate} style={{ color: "#2563eb", borderColor: "#2563eb" }}>
            Download Template
          </Button>
          <Button variant="outline" onClick={() => setIsBulkModalOpen(true)}>
            Import Excel
          </Button>
          <Button onClick={handleOpenAddModal} style={{ backgroundColor: "#102e50", color: "white" }}>
            + Tambah Sekolah
          </Button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="pemantik-table">
          <thead>
            <tr>
              <th>Nama Sekolah</th>
              <th>NPSN & Alamat</th>
              <th>Akun Akses</th>
              <th>Daftar Kelas</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchools.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "3rem 1rem", color: "#6c757d" }}>
                  Tidak ada data ditemukan.
                </td>
              </tr>
            ) : (
              filteredSchools.map((row) => {
                const schoolUser = row.users?.find(u => u.role === 'school');
                return (
                  <tr key={row.id}>
                    <td>
                      <a href={`/komunitas/sekolah/${row.id}`} style={{ fontWeight: 600, color: "#102e50", textDecoration: "none" }} className="hover:underline">
                        {row.name}
                      </a>
                      <div style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 500 }}>
                        {row.jenjang_sekolah ? `${row.jenjang_sekolah} ` : ""}
                        {row.status_sekolah ? `${row.status_sekolah}` : ""} 
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>Kepsek: {row.principal_name || "-"}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>NPSN: {row.npsn || "-"}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                        {row.address ? `${row.address}, ` : ""}
                        {row.village ? `${row.village}, ` : ""}
                        {row.district ? `${row.district}, ` : ""}
                        {row.city || ""}
                      </div>
                    </td>
                    <td>
                      {schoolUser ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                          <div><span style={{ color: "#6c757d" }}>User:</span> <strong>{schoolUser.username}</strong></div>
                          {row.email && <div><span style={{ color: "#6c757d" }}>Email:</span> {row.email}</div>}
                          <div><span style={{ color: "#6c757d" }}>Pass:</span> <code style={{ color: "#a8281c" }}>Password123!</code> <span style={{ fontSize: "0.7rem", color: "#adb5bd" }}>(bawaan)</span></div>
                        </div>
                      ) : (
                        <span style={{ color: "#6c757d", fontSize: "0.85rem" }}>Belum ada akun</span>
                      )}
                    </td>
                    <td>
                      {row.classes && row.classes.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                          {row.classes.map((c: any) => (
                            <span key={c.id} style={{ padding: "0.15rem 0.4rem", backgroundColor: "#f3f4f6", borderRadius: "0.25rem", fontSize: "0.75rem", border: "1px solid #e5e7eb" }}>
                              {c.name}
                            </span>
                          ))}
                        </div>
                      ) : "-"}
                    </td>
                    <td>
                      <Badge variant={row.is_active ? "success" : "danger"}>
                        {row.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <a href={`/komunitas/sekolah/${row.id}`} style={{ textDecoration: "none" }}>
                          <Button variant="secondary" size="sm">Detail →</Button>
                        </a>
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(row)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => handleResetPassword(row)}>Reset Sandi</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(row)}>Hapus</Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MANUAL MODAL (ADD & EDIT) */}
      {isModalOpen && mounted && createPortal(
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(16, 46, 80, 0.5)", zIndex: 9999, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            className="animate-scale-in"
            style={{ backgroundColor: "white", padding: "2rem", borderRadius: "0.75rem", width: "100%", maxWidth: "650px", margin: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem" }}>
              {editingSchool ? "Edit Sekolah" : "Tambah Sekolah Baru"}
            </h2>
            <form onSubmit={handleFormSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Nama Sekolah *</label>
                  <input type="text" name="name" required defaultValue={editingSchool?.name || ""} className="form-input" style={{ width: "100%" }} />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>NPSN (Opsional)</label>
                  <input type="text" name="npsn" defaultValue={editingSchool?.npsn || ""} className="form-input" style={{ width: "100%" }} />
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Email Sekolah (Opsional)</label>
                  <input type="email" name="email" defaultValue={editingSchool?.email || ""} className="form-input" style={{ width: "100%" }} />
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Status Sekolah *</label>
                  <select name="status_sekolah" required defaultValue={editingSchool?.status_sekolah || ""} className="form-input" style={{ width: "100%" }}>
                    <option value="">-- Pilih Status --</option>
                    <option value="Negeri">Negeri</option>
                    <option value="Swasta">Swasta</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Jenjang Sekolah *</label>
                  <select name="jenjang_sekolah" required defaultValue={editingSchool?.jenjang_sekolah || ""} className="form-input" style={{ width: "100%" }}>
                    <option value="">-- Pilih Jenjang --</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kepala Sekolah (Opsional)</label>
                  <input type="text" name="principal_name" defaultValue={editingSchool?.principal_name || ""} className="form-input" style={{ width: "100%" }} />
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Nomor Telepon (Opsional)</label>
                  <input type="text" name="contact_phone" defaultValue={editingSchool?.contact_phone || ""} className="form-input" style={{ width: "100%" }} />
                </div>
                
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Daftar Kelas (Ikut Asesmen) *</label>
                  <input type="text" name="classes" required placeholder="Misal: 5A, 5B, 6A (Pisahkan dengan koma)" className="form-input" style={{ width: "100%" }} />
                  <p style={{ fontSize: "0.75rem", color: "#6c757d", marginTop: "0.25rem" }}>
                    Kelas ini nanti akan muncul sebagai pilihan saat Anda membuat akun Guru.
                  </p>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Desa / Kelurahan *</label>
                  <input type="text" name="village" required defaultValue={editingSchool?.village || ""} className="form-input" style={{ width: "100%" }} />
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kecamatan *</label>
                  <input type="text" name="district" required defaultValue={editingSchool?.district || ""} className="form-input" style={{ width: "100%" }} />
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Kota / Kabupaten *</label>
                  <input type="text" name="city" required defaultValue={editingSchool?.city || ""} className="form-input" style={{ width: "100%" }} />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Provinsi *</label>
                  <input type="text" name="province" required defaultValue={editingSchool?.province || ""} className="form-input" style={{ width: "100%" }} />
                </div>
                
                {!editingSchool && (
                  <div style={{ gridColumn: "span 2", fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
                    * Sistem akan meng-generate <b>Username</b> dari Nama Sekolah + 4 digit NPSN/acak. Password default adalah <b>Password123!</b>
                  </div>
                )}
              </div>
              
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "2rem" }}>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isPending}>Batal</Button>
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
          title="Import Data Sekolah"
          description={`Gunakan template Excel, isi data sekolah beserta kolom Kecamatan dan Desa, lalu upload kembali. Sistem otomatis mengasosiasikannya dengan komunitas Anda (${communityName}).`}
          templateFileName="Template_Sekolah"
          templateHeaders={["Nama_Sekolah", "NPSN", "Provinsi", "Kota", "Kecamatan", "Desa", "Nama_Kepsek", "Telp", "Alamat", "Daftar_Kelas"]}
          templateData={[["Contoh SD 1", "20101010", "Jawa Barat", "Bandung", "Coblong", "Dago", "Budi", "08123", "Jl. ABC", "5A, 5B, 6A"]]}
          onClose={() => setIsBulkModalOpen(false)}
          onUpload={handleBulkUpload}
        />
      )}
    </div>
  );
}
