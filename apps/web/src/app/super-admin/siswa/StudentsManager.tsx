"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { DataTable, Button, Modal, Badge, useToast, useConfirm, SesBadge, ActionMenu } from "@pemantik/ui";
import type { ColumnDef } from "@pemantik/ui";
import { createStudentAction, bulkCreateStudentsAction, updateStudentAction, deleteStudentAction, bulkDeleteStudentsAction } from "../../actions/students";
import BulkUploadModal from "@/components/shared/BulkUploadModal";
import CredentialModal, { Credentials } from "@/components/shared/CredentialModal";
import SearchableSelect from "@/components/shared/SearchableSelect";
import Pagination from "@/components/shared/Pagination";
import { usePagination } from "@/lib/usePagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
    communities: { name: string; is_sandbox?: boolean } | null;
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
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  currentSearch?: string;
  currentSandbox?: boolean;
}

export default function StudentsManager({ 
  initialStudents, 
  schools, 
  sesVariables = [], 
  classes = [],
  totalCount = 0,
  currentPage = 1,
  pageSize = 25,
  currentSearch = "",
  currentSandbox = false
}: StudentsManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [search, setSearch] = useState(currentSearch);
  const [showSandbox, setShowSandbox] = useState(currentSandbox);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [credentialModal, setCredentialModal] = useState<{isOpen: boolean; creds: Credentials | null; title: string}>({
    isOpen: false,
    creds: null,
    title: ""
  });
  const [mounted, setMounted] = useState(false);
  
  const [uploadLoading, setUploadLoading] = useState(false);
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state with URL when search or sandbox changes (with basic debounce for search)
  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (showSandbox) params.set("sandbox", "true");
      // Reset page to 1 when search or filter changes
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, showSandbox, mounted, pathname, router]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (showSandbox) params.set("sandbox", "true");
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  // paginatedStudents is simply the data from server
  const paginatedStudents = initialStudents;

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = editingStudent 
        ? await updateStudentAction(editingStudent.id, formData)
        : await createStudentAction(formData);
        
      if (result.success) {
        if (editingStudent) {
          success("Berhasil", result.message || `Anak diperbarui.`);
          setIsManualModalOpen(false);
          setEditingStudent(null);
          setTimeout(() => window.location.reload(), 1000);
        } else {
          setIsManualModalOpen(false);
          if (result.credentials) {
            setCredentialModal({
              isOpen: true,
              creds: result.credentials,
              title: "Akun Anak Berhasil Dibuat"
            });
          } else {
            success("Berhasil", result.message || `Anak ditambahkan.`);
            setTimeout(() => window.location.reload(), 1000);
          }
        }
      } else {
        error("Gagal", result.error || `Gagal ${editingStudent ? 'memperbarui' : 'membuat'} siswa.`);
      }
    });
  };

  const handleDelete = async (row: any) => {
    const isConfirmed = await confirm({
      title: "Hapus Anak",
      description: `Yakin ingin menghapus anak ${row.full_name}?`,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      variant: "danger"
    });
    if (!isConfirmed) return;
    
    startTransition(async () => {
      const result = await deleteStudentAction(row.id);
      if (result.success) success("Berhasil", result.message || "Anak dihapus.");
      else error("Gagal", result.error || "Gagal menghapus anak.");
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

  const handleBulkUpload = async (rows: any[]) => {
    return await bulkCreateStudentsAction(rows);
  };

  const handleRollback = async (ids: string[]) => {
    await bulkDeleteStudentsAction(ids);
  };

  const handleDownloadTemplate = () => {
    const headers = ["nama_siswa", "nisn", "npsn", "jenis_kelamin", "tanggal_lahir", "nama_sekolah", "kelas", "pekerjaan_ibu", "pekerjaan_ayah", "pendidikan_ibu", "pendidikan_ayah", "kelurahan_desa", "kecamatan", "kabupaten", "provinsi"];
    const wsData = [
      headers,
      ["Ahmad Fikri", "10203040", "20202020", "L", "2015-05-12", schools[0]?.name || "Sekolah Contoh", "5A", "Petani", "Guru", "SD", "S1", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Petunjuk Sheet
    const petunjukData = [
      ["Kolom", "Wajib?", "Keterangan / Contoh"],
      ["nama_siswa", "Ya", "Nama lengkap siswa."],
      ["nisn", "Tidak", "NISN siswa. Opsional."],
      ["npsn", "Tidak", "NPSN sekolah. Opsional."],
      ["jenis_kelamin", "Ya", "L untuk Laki-laki, P untuk Perempuan."],
      ["tanggal_lahir", "Ya", "Format YYYY-MM-DD (Misal: 2010-12-05)."],
      ["nama_sekolah", "Ya", "Pastikan ejaan nama sekolah persis sama dengan yang terdaftar."],
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

    XLSX.writeFile(wb, "Template_Siswa.xlsx");
  };

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap", gap: "1rem" }}>
        <input
          type="text"
          placeholder="Cari nama, NISN, username, atau sekolah..."
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
          <Button variant="outline" onClick={handleDownloadTemplate} style={{ color: "#0874aa", borderColor: "#0874aa" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.5rem", display: "inline-block", verticalAlign: "middle" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download Template
          </Button>
          {/* Tombol create dipindah ke halaman Detail Sekolah via Import Dapodik (D4) */}
        </div>
      </div>

      {/* Info banner - read-only global view */}
      <div style={{ margin: "0 1.5rem 1rem", padding: "0.75rem 1rem", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "0.5rem", fontSize: "0.85rem", color: "#0369a1", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span>ℹ</span>
        <span>
          Halaman ini menampilkan rekap semua anak lintas sekolah.
          Untuk <strong>menambah anak</strong>, gunakan{" "}
          <a href="/super-admin/sekolah" style={{ color: "#0369a1", fontWeight: 600 }}>Import Dapodik di halaman Sekolah</a>.
        </span>
      </div>

      {(() => {
        const studentColumns: ColumnDef<Student>[] = [
          {
            key: "full_name",
            label: "Nama Anak",
            sortable: true,
            render: (_v, row) => (
              <strong style={{ color: "#102e50" }}>{row.full_name}</strong>
            ),
          },
          {
            key: "nisn",
            label: "NISN & Gender",
            render: (_v, row) => (
              <div>
                <div style={{ fontWeight: 500 }}>NISN: {row.nisn || "—"}</div>
                <div style={{ fontSize: "0.78rem", color: "#6c757d" }}>
                  {row.gender === "L" ? "Laki-laki" : "Perempuan"}
                </div>
              </div>
            ),
          },
          {
            key: "username",
            label: "Akun Akses",
            render: (_v, row) => (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "#6c757d" }}>User: </span>
                  <strong>{row.username}</strong>
                </div>
                <div>
                  <span style={{ color: "#6c757d" }}>PIN: </span>
                  <code style={{ color: "#a8281c" }}>123456</code>
                </div>
              </div>
            ),
          },
          {
            key: "classes",
            label: "Kelas & Guru",
            render: (_v, row) => (
              <div>
                <div style={{ fontWeight: 500, color: "#102e50" }}>{(row.classes as any)?.name || "—"}</div>
                <div style={{ fontSize: "0.78rem", color: "#6c757d" }}>Guru: {(row.classes as any)?.users?.full_name || "—"}</div>
              </div>
            ),
          },
          {
            key: "schools",
            label: "Sekolah",
            render: (_v, row) => (
              <span style={{ fontSize: "0.875rem" }}>{row.schools?.name || "—"}</span>
            ),
          },
          {
            key: "ses_class",
            label: "SES",
            render: (_v, row) =>
              row.ses_class ? (
                <SesBadge sesClass={row.ses_class} />
              ) : (
                <span style={{ fontSize: "0.78rem", color: "#adb5bd" }}>Belum Dihitung</span>
              ),
          },
          {
            key: "is_active",
            label: "Status",
            render: (_v, row) => (
              <Badge variant={row.is_active ? "success" : "danger"}>
                {row.is_active ? "Aktif" : "Nonaktif"}
              </Badge>
            ),
          },
          {
            key: "actions",
            label: "Aksi",
            align: "center" as const,
            render: (_v, row) => (
              <ActionMenu 
                actions={[
                  { label: "Edit", onClick: () => handleOpenEditModal(row) },
                  { label: "Hapus", onClick: () => handleDelete(row), variant: "danger" }
                ]} 
              />
            ),
          },
        ];
        return (
          <DataTable
            columns={studentColumns}
            data={paginatedStudents}
            emptyMessage="Tidak ada data anak ditemukan."
            minWidth="900px"
            striped
          />
        );
      })()}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalCount}
        startIndex={startIndex}
        endIndex={endIndex}
      />

      {/* MANUAL MODAL */}
      {isManualModalOpen && mounted && createPortal(
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, padding: "2rem 1rem", overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "0.5rem", width: "100%", maxWidth: "600px", margin: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem" }}>
              {editingStudent ? "Edit Anak" : "Tambah Anak Baru"}
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
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>NPSN Sekolah (Opsional)</label>
                  <input type="text" name="npsn" defaultValue={editingStudent?.schools?.npsn} className="form-input" style={{ width: "100%" }} />
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
                  Sistem akan secara otomatis membuat <b>Username</b> unik dan PIN default <b>123456</b> untuk anak login ke mobile app.
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
          title="Import Data Anak"
          description="Download template, isi data anak, dan upload kembali. Sistem akan men-generate username dan PIN unik untuk tiap siswa secara otomatis."
          templateFileName="Template_Siswa"
          templateHeaders={["nama_siswa", "nisn", "jenis_kelamin", "tanggal_lahir", "nama_sekolah", "npsn", "pilih_kelas", "pekerjaan_ibu", "pekerjaan_ayah", "pendidikan_ibu", "pendidikan_ayah", "kelurahan", "kecamatan", "kabupaten", "provinsi"]}
          templateData={[
            ["Ahmad Fikri", "10203040", "L", "2015-05-12", schools[0]?.name || "Sekolah Contoh", "20202020", "5A", "Petani", "Guru", "SD", "S1", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta"]
          ]}
          onClose={() => setIsBulkModalOpen(false)}
          onUpload={handleBulkUpload}
          onRollback={handleRollback}
        />
      )}
      {/* MODAL CREDENTIAL */}
      <CredentialModal
        isOpen={credentialModal.isOpen}
        onClose={() => {
          setCredentialModal({ isOpen: false, creds: null, title: "" });
          window.location.reload();
        }}
        credentials={credentialModal.creds}
        title={credentialModal.title}
      />
    </div>
  );
}
