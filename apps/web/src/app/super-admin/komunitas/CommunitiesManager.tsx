"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Table, Button, Modal, Badge } from "@pemantik/ui";
import { useToast } from "@pemantik/ui";
import { useConfirm } from "@pemantik/ui";
import {
  createCommunityAction,
  updateCommunityAction,
  resetCommunityPasswordAction,
  toggleCommunityActiveAction,
  bulkCreateCommunitiesAction,
  deepDeleteCommunityAction,
  getCommunityDeletionStatsAction,
  bulkDeleteCommunitiesAction,
} from "../../actions/communities";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import BulkUploadModal from "@/components/shared/BulkUploadModal";
import CredentialModal, { Credentials } from "@/components/shared/CredentialModal";
import Pagination from "@/components/shared/Pagination";

interface Community {
  id: string;
  name: string;
  code: string;
  address: string | null;
  status_kepemilikan?: string | null;
  village?: string | null;
  district?: string | null;
  city?: string | null;
  province?: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
  is_sandbox?: boolean;
  created_at: string;
  allowed_categories?: string[] | null;
  username?: string | null;
}

interface CommunitiesManagerProps {
  initialCommunities: Community[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  currentSearch?: string;
  currentSandbox?: boolean;
}

export default function CommunitiesManager({
  initialCommunities,
  totalCount = 0,
  currentPage = 1,
  pageSize = 20,
  currentSearch = "",
  currentSandbox = false
}: CommunitiesManagerProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  
  // Sync when initialCommunities changes (server side updates)
  useEffect(() => {
    setCommunities(initialCommunities);
  }, [initialCommunities]);

  const [search, setSearch] = useState(currentSearch);
  const [showSandbox, setShowSandbox] = useState(currentSandbox);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [credentialModal, setCredentialModal] = useState<{isOpen: boolean; creds: Credentials | null; title: string}>({
    isOpen: false,
    creds: null,
    title: ""
  });
  const [editingComm, setEditingComm] = useState<Community | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // States for Deep Delete functionality
  const [deletingComm, setDeletingComm] = useState<Community | null>(null);
  const [deleteStats, setDeleteStats] = useState<any>(null);
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [isPending, startTransition] = useTransition();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { confirm } = useConfirm();

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

  const paginatedCommunities = communities;

  const handleOpenAddModal = () => {
    setEditingComm(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comm: Community) => {
    setEditingComm(comm);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      let result;
      if (editingComm) {
        result = await updateCommunityAction(editingComm.id, formData);
      } else {
        result = await createCommunityAction(formData);
      }

      if (result.success) {
        if (editingComm) {
          showSuccessToast("Komunitas berhasil diperbarui!");
          setIsModalOpen(false);
          setTimeout(() => window.location.reload(), 1000);
        } else {
          // If it's a new community, show the credential modal
          setIsModalOpen(false);
          if (result.credentials) {
            setCredentialModal({
              isOpen: true,
              creds: result.credentials,
              title: "Akun Komunitas Berhasil Dibuat"
            });
          } else {
            showSuccessToast("Komunitas berhasil dibuat!");
            setTimeout(() => window.location.reload(), 1000);
          }
        }
      } else {
        showErrorToast("Gagal menyimpan komunitas", result.error || "");
      }
    });
  };

  const handleResetPassword = async (comm: Community) => {
    const ok = await confirm({
      title: "Reset Sandi",
      description: `Apakah Anda yakin ingin mereset kata sandi admin komunitas '${comm.name}' ke default (Password123!)?`,
      confirmLabel: "Reset",
      cancelLabel: "Batal",
      variant: "warning",
    });

    if (!ok) return;

    startTransition(async () => {
      const result = await resetCommunityPasswordAction(comm.id);
      if (result.success) {
        if (result.credentials) {
          setCredentialModal({
            isOpen: true,
            creds: result.credentials,
            title: "Password Berhasil Direset"
          });
        } else {
          showSuccessToast("Berhasil", "Kata sandi admin komunitas berhasil di-reset.");
        }
      } else {
        showErrorToast("Gagal", result.error || "Terjadi kesalahan.");
      }
    });
  };

  const handleToggleActive = async (comm: Community) => {
    const isDeactivating = comm.is_active;
    const ok = await confirm({
      title: isDeactivating ? "Nonaktifkan Komunitas?" : "Aktifkan Komunitas?",
      description: isDeactivating
        ? `Apakah Anda yakin ingin menonaktifkan komunitas '${comm.name}'? Sekolah di bawah komunitas ini akan kehilangan akses sementara.`
        : `Apakah Anda yakin ingin mengaktifkan kembali komunitas '${comm.name}'?`,
      confirmLabel: isDeactivating ? "Ya, Nonaktifkan" : "Ya, Aktifkan",
      cancelLabel: "Batal",
      variant: isDeactivating ? "danger" : "info",
    });

    if (!ok) return;

    startTransition(async () => {
      const result = await toggleCommunityActiveAction(comm.id, comm.is_active);
      if (result.success) {
        showSuccessToast(
          isDeactivating ? "Komunitas dinonaktifkan!" : "Komunitas berhasil diaktifkan!"
        );
        window.location.reload();
      } else {
        showErrorToast("Gagal mengubah status komunitas", result.error || "");
      }
    });
  };

  const handleDeleteCommunity = async (comm: Community) => {
    setDeletingComm(comm);
    setIsFetchingStats(true);
    setDeleteStats(null);
    setDeleteConfirmText("");
    
    // Fetch stats
    const res = await getCommunityDeletionStatsAction(comm.id);
    setIsFetchingStats(false);
    if (res.success) {
      setDeleteStats(res.stats);
    } else {
      showErrorToast("Gagal mengambil data", res.error || "");
      setDeletingComm(null);
    }
  };

  const executeDeepDelete = async () => {
    if (!deletingComm) return;
    if (deleteConfirmText !== deletingComm.name) return;
    
    setIsDeleting(true);
    const result = await deepDeleteCommunityAction(deletingComm.id);
    
    if (result.success) {
      showSuccessToast("Berhasil", "Komunitas beserta seluruh data di dalamnya telah dihapus secara permanen!");
      setDeletingComm(null);
      setIsDeleting(false);
      window.location.reload();
    } else {
      showErrorToast("Gagal menghapus", result.error || "");
      setIsDeleting(false);
    }
  };

  const handleBulkUpload = async (data: any[]) => {
    return await bulkCreateCommunitiesAction(data);
  };

  const handleRollback = async (ids: string[]) => {
    await bulkDeleteCommunitiesAction(ids);
  };

  const handleDownloadTemplate = () => {
    const headers = ["nama_komunitas", "email_komunitas", "status_kepemilikan", "nama_penanggung_jawab", "nomor_telepon", "kelurahan_desa", "kecamatan", "kabupaten", "provinsi"];
    const wsData = [
      headers,
      ["Yayasan Pendidikan Anak Bangsa", "yayasan.pab@mitra.com", "Yayasan", "Budi Santoso", "081234567890", "Menteng", "Menteng", "Jakarta Pusat", "DKI Jakarta"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Petunjuk Sheet
    const petunjukData = [
      ["Kolom", "Wajib?", "Keterangan / Contoh"],
      ["nama_komunitas", "Ya", "Nama lengkap komunitas atau yayasan."],
      ["email_komunitas", "Tidak", "Email aktif komunitas (opsional)."],
      ["status_kepemilikan", "Ya", "Negeri, Swasta, Yayasan, atau Lainnya."],
      ["nama_penanggung_jawab", "Tidak", "Nama representatif (opsional)."],
      ["nomor_telepon", "Tidak", "Nomor telepon (opsional)."],
      ["kelurahan_desa", "Ya", "Kelurahan / Desa."],
      ["kecamatan", "Ya", "Kecamatan."],
      ["kabupaten", "Ya", "Kabupaten / Kota."],
      ["provinsi", "Ya", "Provinsi."]
    ];
    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk");
    XLSX.writeFile(wb, "Template_Komunitas.xlsx");
  };

  const columns = [
    {
      key: "name",
      label: "Nama Mitra / Komunitas",
      render: (_: any, row: Community) => (
        <div>
          <div style={{ fontWeight: 600, color: "#102e50" }}>{row.name}</div>
          <div style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 500 }}>
            {row.status_kepemilikan ? `${row.status_kepemilikan}` : ""}
          </div>
          <div style={{ fontSize: "0.8rem", color: "black" }}>
            {[row.village, row.district, row.city, row.province].filter(Boolean).join(", ") || row.address || "Tidak ada alamat"}
          </div>
        </div>
      ),
    },
    {
      key: "code",
      label: "Akun Akses",
      render: (val: any, row: any) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
          <div><span style={{ color: "black" }}>Kode:</span> <code style={{ background: "#f1f3f5", padding: "0.1rem 0.3rem", borderRadius: 4 }}>{String(val)}</code></div>
          <div><span style={{ color: "black" }}>Username:</span> <strong>{row.username || `admin_${String(val)}`}</strong></div>
          <div><span style={{ color: "black" }}>Password:</span> <code style={{ color: "#a8281c" }}>Password123!</code> <span style={{ fontSize: "0.7rem", color: "black" }}>(bawaan)</span></div>
        </div>
      ),
    },
    {
      key: "contact_name",
      label: "Kontak Representatif",
      render: (_: any, row: Community) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.contact_name || "-"}</div>
          <div style={{ fontSize: "0.75rem", color: "black" }}>
            {row.contact_email ? `${row.contact_email}` : ""}
            {row.contact_phone ? ` • ${row.contact_phone}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (val: any, row: Community) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-start" }}>
          <Badge variant={val ? "success" : "danger"}>
            {val ? "Aktif" : "Nonaktif"}
          </Badge>
          {row.is_sandbox && (
            <span style={{ backgroundColor: "#ffc107", color: "#000", padding: "0.15rem 0.45rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, display: "inline-block" }}>
              Sandbox
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Aksi",
      render: (_: any, row: Community) => (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(row)}>
            Edit
          </Button>
          <Button
            variant={row.is_active ? "danger" : "primary"}
            size="sm"
            onClick={() => handleToggleActive(row)}
          >
            {row.is_active ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleResetPassword(row)}>
            Reset Sandi
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDeleteCommunity(row)}>
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "260px", maxWidth: "400px" }}>
          <input
            type="text"
            placeholder="Cari komunitas berdasarkan nama, kode..."
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.4rem", display: "inline-block", verticalAlign: "middle" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download Template
          </Button>
          <Button variant="outline" onClick={() => setIsBulkModalOpen(true)}>
            Import Komunitas
          </Button>
          <Button variant="primary" onClick={handleOpenAddModal}>
            + Tambah Komunitas
          </Button>
        </div>
      </div>

      <div className="card">
        <Table columns={columns} data={paginatedCommunities} emptyMessage="Tidak ada komunitas terdaftar" />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={totalCount}
          startIndex={startIndex}
          endIndex={endIndex}
          className="px-4 pb-4"
        />
      </div>

      {/* Add / Edit Community Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingComm ? "Ubah Komunitas / Mitra" : "Tambah Komunitas Baru"}
        size="md"
      >
        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="comm-name">
              Nama Komunitas / Mitra <span style={{ color: "#a8281c" }}>*</span>
            </label>
            <input
              id="comm-name"
              name="name"
              type="text"
              className="form-input"
              required
              placeholder="Contoh: Yayasan Pendidikan Anak Bangsa"
              defaultValue={editingComm?.name || ""}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comm-code">
              Kode Unik Komunitas <span style={{ color: "#a8281c" }}>*</span>
            </label>
            <input
              id="comm-code"
              name="code"
              type="text"
              className="form-input"
              required
              disabled={!!editingComm}
              placeholder="Contoh: ypab (huruf kecil & angka saja)"
              defaultValue={editingComm?.code || ""}
            />
            {!editingComm && (
              <span style={{ fontSize: "0.75rem", color: "black", marginTop: "0.25rem" }}>
                Kode ini digunakan sebagai prefix username otomatis dan tidak dapat diubah nanti.
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comm-contact-name">
              Nama Kontak Representatif
            </label>
            <input
              id="comm-contact-name"
              name="contact_name"
              type="text"
              className="form-input"
              placeholder="Nama penanggung jawab"
              defaultValue={editingComm?.contact_name || ""}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="comm-contact-email">
                Email Kontak
              </label>
              <input
                id="comm-contact-email"
                name="contact_email"
                type="email"
                className="form-input"
                placeholder="mitra@domain.com"
                defaultValue={editingComm?.contact_email || ""}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="comm-contact-phone">
                No. Telepon Kontak
              </label>
              <input
                id="comm-contact-phone"
                name="contact_phone"
                type="text"
                className="form-input"
                placeholder="0812xxxxxxxx"
                defaultValue={editingComm?.contact_phone || ""}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comm-status-kepemilikan">
              Status Kepemilikan <span style={{ color: "#a8281c" }}>*</span>
            </label>
            <select
              id="comm-status-kepemilikan"
              name="status_kepemilikan"
              className="form-input"
              required
              defaultValue={editingComm?.status_kepemilikan || ""}
            >
              <option value="">-- Pilih --</option>
              <option value="Negeri">Negeri</option>
              <option value="Swasta">Swasta</option>
              <option value="Yayasan">Yayasan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Kelurahan / Desa <span style={{ color: "#a8281c" }}>*</span></label>
              <input type="text" name="village" className="form-input" required defaultValue={editingComm?.village || ""} />
            </div>
            <div className="form-group">
              <label className="form-label">Kecamatan <span style={{ color: "#a8281c" }}>*</span></label>
              <input type="text" name="district" className="form-input" required defaultValue={editingComm?.district || ""} />
            </div>
            <div className="form-group">
              <label className="form-label">Kabupaten / Kota <span style={{ color: "#a8281c" }}>*</span></label>
              <input type="text" name="city" className="form-input" required defaultValue={editingComm?.city || ""} />
            </div>
            <div className="form-group">
              <label className="form-label">Provinsi <span style={{ color: "#a8281c" }}>*</span></label>
              <input type="text" name="province" className="form-input" required defaultValue={editingComm?.province || ""} />
            </div>
          </div>

          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              id="comm-is-active"
              name="is_active"
              type="checkbox"
              value="true"
              defaultChecked={editingComm ? editingComm.is_active : true}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="comm-is-active" style={{ fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>
              Aktifkan komunitas ini langsung
            </label>
          </div>

          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input
              id="comm-is-sandbox"
              name="is_sandbox"
              type="checkbox"
              value="true"
              defaultChecked={editingComm ? editingComm.is_sandbox : false}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="comm-is-sandbox" style={{ fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", color: "#a8281c" }}>
              Mode Sandbox (Komunitas Uji Coba)
            </label>
          </div>
          
          {!editingComm && (
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
              * Sistem akan meng-generate <b>Username</b> dari Nama Komunitas + 3 angka acak. Password default adalah <b>Password123!</b>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "0.5rem",
              borderTop: "1px solid #e9ecef",
              paddingTop: "1rem",
            }}
          >
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <BulkUploadModal
          title="Import Data Komunitas"
          description="Download template di luar ini, isi data, dan upload kembali. Sistem akan otomatis membuat akun untuk setiap komunitas yang di-upload dengan password default (Password123!)."
          templateFileName="Template_Komunitas"
          templateHeaders={[]}
          onDownloadTemplate={handleDownloadTemplate}
          onUpload={handleBulkUpload}
          onRollback={handleRollback}
          onClose={() => setIsBulkModalOpen(false)}
        />
      )}

      {/* Deep Delete Double Confirmation Modal */}
      <Modal
        open={!!deletingComm}
        onClose={() => !isDeleting && setDeletingComm(null)}
        title="Hapus Komunitas Permanen"
        size="md"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {isFetchingStats ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <div className="btn-spinner" style={{ borderColor: "#0874aa", borderRightColor: "transparent", width: 24, height: 24, margin: "0 auto 1rem" }} />
              <p>Menganalisis data terkait...</p>
            </div>
          ) : deleteStats ? (
            <>
              <div style={{ 
                backgroundColor: "#fef2f2", 
                border: "1px solid #f87171", 
                borderRadius: "0.5rem", 
                padding: "1rem" 
              }}>
                <h4 style={{ color: "#991b1b", margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  Peringatan: Tindakan Tidak Dapat Dibatalkan
                </h4>
                <p style={{ color: "#b91c1c", fontSize: "0.9rem", marginBottom: "1rem" }}>
                  Anda akan menghapus komunitas <strong>{deletingComm?.name}</strong> secara permanen beserta seluruh data di dalamnya:
                </p>
                <ul style={{ color: "#7f1d1d", fontSize: "0.85rem", paddingLeft: "1.5rem", marginBottom: 0 }}>
                  <li><strong>{deleteStats.schools}</strong> Sekolah Binaan</li>
                  <li><strong>{deleteStats.users}</strong> Akun Guru / Admin</li>
                  <li><strong>{deleteStats.students}</strong> Siswa</li>
                  <li><strong>{deleteStats.sessions}</strong> Sesi Asesmen (beserta jawabannya)</li>
                </ul>
              </div>

              <div className="form-group" style={{ marginTop: "0.5rem" }}>
                <label className="form-label">
                  Untuk melanjutkan, ketik persis nama komunitas: <strong>{deletingComm?.name}</strong>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ketik nama komunitas di sini..."
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={isDeleting}
                  autoComplete="off"
                />
              </div>

              {isDeleting && (
                <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ width: "100%", backgroundColor: "#e5e7eb", borderRadius: "999px", height: "8px", overflow: "hidden" }}>
                    <div style={{ 
                      width: "100%", 
                      height: "100%", 
                      backgroundColor: "#ef4444", 
                      animation: "indeterminate-progress 1.5s infinite linear",
                      transformOrigin: "left"
                    }} />
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "#6b7280", textAlign: "center", margin: 0 }}>
                    Sedang memproses penghapusan... Mohon jangan tutup jendela ini.
                  </p>
                </div>
              )}

              <style>{`
                @keyframes indeterminate-progress {
                  0% { transform: translateX(-100%) scaleX(0.2); }
                  50% { transform: translateX(0%) scaleX(0.5); }
                  100% { transform: translateX(100%) scaleX(0.2); }
                }
              `}</style>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <Button 
                  variant="outline" 
                  onClick={() => setDeletingComm(null)} 
                  disabled={isDeleting}
                >
                  Batal
                </Button>
                <Button 
                  variant="danger" 
                  onClick={executeDeepDelete}
                  disabled={isDeleting || deleteConfirmText !== deletingComm?.name}
                >
                  {isDeleting ? "Menghapus..." : "Ya, Hapus Permanen"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>
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
