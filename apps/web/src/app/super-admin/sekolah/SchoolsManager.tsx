"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, useToast, useConfirm } from "@pemantik/ui";
import { createSchoolAction, updateSchoolAction, deleteSchoolAction, bulkCreateSchoolsAction, resetSchoolPasswordAction, parseDapodikAction, importDapodikAction, bulkDeleteSchoolsAction } from "../../actions/schools";
import BulkUploadModal from "@/components/shared/BulkUploadModal";
import SearchableSelect from "@/components/shared/SearchableSelect";
import Pagination from "@/components/shared/Pagination";
import { usePagination } from "@/lib/usePagination";
import * as XLSX from "xlsx";

interface School {
  id: string;
  name: string;
  npsn: string | null;
  email?: string | null;
  status_sekolah?: string | null;
  jenjang_sekolah?: string | null;
  address: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  principal_name: string | null;
  contact_phone: string | null;
  community_id: string;
  communities: { id: string; name: string; is_sandbox?: boolean } | null;
  users?: { username: string; role: string }[];
  classes?: any[];
  is_active: boolean;
}

interface CommunityOption {
  id: string;
  name: string;
}

interface SchoolsManagerProps {
  initialSchools: School[];
  communities: CommunityOption[];
}

export default function SchoolsManager({ initialSchools, communities }: SchoolsManagerProps) {
  const [search, setSearch] = useState("");
  const [showSandbox, setShowSandbox] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "dapodik">("list");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [mounted, setMounted] = useState(false);
  
  const [isPending, startTransition] = useTransition();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredSchools = initialSchools.filter(
    (s) =>
      (showSandbox ? !!(s.communities?.is_sandbox) : !(s.communities?.is_sandbox)) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.npsn?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (s.communities?.name?.toLowerCase() || "").includes(search.toLowerCase()))
  );

  const {
    paginatedData: paginatedSchools,
    currentPage,
    totalPages,
    totalItems,
    setCurrentPage,
    startIndex,
    endIndex,
  } = usePagination(filteredSchools, 20);

  const handleOpenAddModal = () => {
    setEditingSchool(null);
    setSelectedCommunityId("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (school: School) => {
    setEditingSchool(school);
    setSelectedCommunityId(school.community_id || "");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
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
    const result = await bulkCreateSchoolsAction(data);
    return result;
  };

  const handleRollback = async (ids: string[]) => {
    await bulkDeleteSchoolsAction(ids);
  };

  const handleDownloadTemplate = () => {
    const headers = ["nama_sekolah", "npsn", "email_sekolah", "status_sekolah", "jenjang_sekolah", "kepala_sekolah", "nomor_telepon", "daftar_kelas", "kelurahan_desa", "kecamatan", "kabupaten", "provinsi"];
    const wsData = [
      headers,
      ["SD Negeri 1 Contoh", "20101010", "admin@sd1.com", "Negeri", "SD", "Budi Santoso", "081234567890", "5A, 5B, 6A", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
    ws['!cols'] = colWidths;
    
    // Petunjuk Sheet
    const petunjukData = [
      ["Kolom", "Wajib?", "Keterangan / Contoh"],
      ["nama_sekolah", "Ya", "Nama lengkap sekolah."],
      ["npsn", "Tidak", "Nomor Pokok Sekolah Nasional (opsional)."],
      ["email_sekolah", "Tidak", "Email sekolah untuk login. Jika kosong akan digenerate otomatis."],
      ["status_sekolah", "Ya", "Status sekolah: Negeri atau Swasta."],
      ["jenjang_sekolah", "Ya", "Jenjang: SD, SMP, SMA, atau SMK."],
      ["kepala_sekolah", "Tidak", "Nama kepala sekolah (opsional)."],
      ["nomor_telepon", "Tidak", "Nomor telepon sekolah (opsional)."],
      ["daftar_kelas", "Ya", "Daftar kelas ikut asesmen, pisahkan koma. Contoh: 5A, 5B, 6A"],
      ["kelurahan_desa", "Ya", "Kelurahan / Desa lokasi sekolah."],
      ["kecamatan", "Ya", "Kecamatan lokasi sekolah."],
      ["kabupaten", "Ya", "Kabupaten / Kota lokasi sekolah."],
      ["provinsi", "Ya", "Provinsi lokasi sekolah."],
    ];
    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);
    wsPetunjuk['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 60 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk Pengisian");
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    XLSX.writeFile(wb, "Template_Sekolah.xlsx");
  };

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      {/* TABS */}
      <div style={{ display: "flex", gap: "1.5rem", borderBottom: "1px solid #e5e7eb", padding: "0 1.5rem" }}>
        <button
          onClick={() => setActiveTab("list")}
          style={{
            padding: "1.25rem 0", background: "none", border: "none", cursor: "pointer",
            fontSize: "1rem", fontWeight: activeTab === "list" ? 600 : 400,
            color: activeTab === "list" ? "#102e50" : "#6b7280",
            borderBottom: activeTab === "list" ? "2px solid #102e50" : "2px solid transparent",
          }}
        >
          Daftar Sekolah
        </button>
        <button
          onClick={() => setActiveTab("dapodik")}
          style={{
            padding: "1.25rem 0", background: "none", border: "none", cursor: "pointer",
            fontSize: "1rem", fontWeight: activeTab === "dapodik" ? 600 : 400,
            color: activeTab === "dapodik" ? "#102e50" : "#6b7280",
            borderBottom: activeTab === "dapodik" ? "2px solid #102e50" : "2px solid transparent",
          }}
        >
          Upload Dapodik
        </button>
      </div>

      {activeTab === "list" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap", gap: "1rem" }}>
            <input
              type="text"
              placeholder="Cari nama, NPSN, atau komunitas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ flex: "1 1 200px", maxWidth: "400px" }}
            />
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "#4b5563", marginRight: "0.5rem" }}>
                <div style={{ position: "relative", width: "36px", height: "20px" }}>
                  <input 
                    type="checkbox" 
                    checked={showSandbox} 
                    onChange={(e) => setShowSandbox(e.target.checked)} 
                    style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                  />
                  <div style={{ 
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: showSandbox ? "#f59e0b" : "#e5e7eb", 
                    borderRadius: "999px", transition: "0.3s" 
                  }} />
                  <div style={{ 
                    position: "absolute", top: "2px", left: showSandbox ? "18px" : "2px", 
                    width: "16px", height: "16px", backgroundColor: "white", 
                    borderRadius: "50%", transition: "0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" 
                  }} />
                </div>
                Tampilkan Data Uji Coba (Sandbox)
              </label>
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
              <th>Komunitas Induk</th>
              <th>Daftar Kelas</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchools.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "3rem 1rem", color: "black" }}>
                  Tidak ada data ditemukan.
                </td>
              </tr>
            ) : (
              paginatedSchools.map((row) => {
                const schoolUser = row.users?.find(u => u.role === 'school');
                return (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#102e50" }}>{row.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 500 }}>
                        {row.jenjang_sekolah ? `${row.jenjang_sekolah} ` : ""}
                        {row.status_sekolah ? `${row.status_sekolah}` : ""} 
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "black" }}>Kepsek: {row.principal_name || "-"}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>NPSN: {row.npsn || "-"}</div>
                      <div style={{ fontSize: "0.8rem", color: "black" }}>
                        {row.address ? `${row.address}, ` : ""}
                        {row.village ? `${row.village}, ` : ""}
                        {row.district ? `${row.district}, ` : ""}
                        {row.city || ""}
                      </div>
                    </td>
                    <td>
                      {schoolUser ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                          <div><span style={{ color: "black" }}>User:</span> <strong>{schoolUser.username}</strong></div>
                          {row.email && <div><span style={{ color: "black" }}>Email:</span> {row.email}</div>}
                          <div><span style={{ color: "black" }}>Pass:</span> <code style={{ color: "#a8281c" }}>Password123!</code> <span style={{ fontSize: "0.7rem", color: "black" }}>(bawaan)</span></div>
                        </div>
                      ) : (
                        <span style={{ color: "black", fontSize: "0.85rem" }}>Belum ada akun</span>
                      )}
                    </td>
                    <td>
                      {row.communities?.name ? (
                        <span style={{ fontWeight: 500, color: "#0f172a" }}>{row.communities.name}</span>
                      ) : (
                        <span style={{ color: "#64748b", fontStyle: "italic", fontSize: "0.85rem" }}>Sekolah Independen</span>
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
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <a href={`/super-admin/sekolah/${row.id}`} style={{ textDecoration: "none" }}>
                          <Button variant="outline" size="sm">Detail →</Button>
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
      />
      </>
      )}

      {/* DAPODIK IMPORT TAB */}
      {activeTab === "dapodik" && (
        <div style={{ padding: "2rem" }}>
          <BulkUploadModal
            inline
            mode="dapodik"
            title="Import Dapodik"
            templateFileName="template_dapodik"
            templateHeaders={[]}
            onClose={() => setActiveTab("list")}
            onUpload={async () => ({ success: false })}
            existingSchools={initialSchools.map(s => ({ id: s.id, name: s.name, npsn: s.npsn }))}
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
        </div>
      )}

      {/* MANUAL MODAL (ADD & EDIT) */}
      {isModalOpen && mounted && createPortal(
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(16, 46, 80, 0.5)", zIndex: 9999, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem" }}>
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "0.75rem", width: "100%", maxWidth: "650px", margin: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem" }}>
              {editingSchool ? "Edit Sekolah" : "Tambah Sekolah Baru"}
            </h2>
            <form onSubmit={handleFormSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Komunitas Induk</label>
                  <SearchableSelect 
                    name="community_id" 
                    required={false}
                    options={[
                      { value: "", label: "TIDAK ADA KOMUNITAS (INDEPENDEN)" },
                      ...communities.map(c => ({ value: c.id, label: c.name }))
                    ]}
                    value={selectedCommunityId}
                    onChange={(val) => setSelectedCommunityId(val)}
                    placeholder="-- Pilih Komunitas (Kosongkan jika Independen) --"
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Nama Sekolah *</label>
                  <input type="text" name="name" required defaultValue={editingSchool?.name || ""} className="form-input" style={{ width: "100%" }} />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>NPSN (Opsional)</label>
                  <input type="text" name="npsn" defaultValue={editingSchool?.npsn || ""} className="form-input" style={{ width: "100%" }} />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Email Sekolah (Opsional)</label>
                  <input type="email" name="email" defaultValue={editingSchool?.email || ""} placeholder="Jika dikosongkan akan digenerate otomatis" className="form-input" style={{ width: "100%" }} />
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

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>Daftar Kelas (Ikut Asesmen) *</label>
                  <input type="text" name="classes" required placeholder="Misal: 5A, 5B, 6A (Pisahkan dengan koma)" defaultValue={editingSchool ? (editingSchool.classes || []).map(c => c.name).join(", ") : ""} className="form-input" style={{ width: "100%" }} />
                  <p style={{ fontSize: "0.75rem", color: "black", marginTop: "0.25rem" }}>
                    Kelas ini nanti akan muncul sebagai pilihan saat Anda membuat akun Guru.
                  </p>
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
          description="Gunakan template Excel, isi data sekolah, lalu upload kembali. Akun admin sekolah akan dibuat otomatis (Password123!). Pastikan nama komunitas yang diisi sesuai data yang ada di sistem."
          templateFileName="Template_Sekolah"
          templateHeaders={["nama_sekolah", "npsn", "email_sekolah", "status_sekolah", "jenjang_sekolah", "kepala_sekolah", "nomor_telepon", "daftar_kelas", "kelurahan_desa", "kecamatan", "kabupaten", "provinsi"]}
          templateData={[
            ["SD Negeri 1 Contoh", "20101010", "admin@sd1.com", "Negeri", "SD", "Budi Santoso", "081234567890", "5A, 5B, 6A", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta"]
          ]}
          onClose={() => setIsBulkModalOpen(false)}
          onUpload={handleBulkUpload}
          onRollback={handleRollback}
        />
      )}
    </div>
  );
}
