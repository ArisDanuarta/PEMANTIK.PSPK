"use client";

import React, { useState, useTransition } from "react";
import { Table, Button, Modal, Badge } from "@pemantik/ui";
import { useToast } from "@pemantik/ui";
import { useConfirm } from "@pemantik/ui";
import {
  createCommunityAction,
  updateCommunityAction,
  resetCommunityPasswordAction,
  toggleCommunityActiveAction,
  bulkCreateCommunitiesAction,
  deleteCommunityAction,
  bulkDeleteCommunitiesAction,
} from "../../actions/communities";
import * as XLSX from "xlsx";
import BulkUploadModal from "@/components/shared/BulkUploadModal";
import Pagination from "@/components/shared/Pagination";
import { usePagination } from "@/lib/usePagination";

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
  created_at: string;
  allowed_categories?: string[] | null;
}

interface CommunitiesManagerProps {
  initialCommunities: Community[];
}

export default function CommunitiesManager({
  initialCommunities,
}: CommunitiesManagerProps) {
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingComm, setEditingComm] = useState<Community | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { confirm } = useConfirm();

  // Filter communities based on search query
  const filteredCommunities = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const {
    paginatedData: paginatedCommunities,
    currentPage,
    totalPages,
    totalItems,
    setCurrentPage,
    startIndex,
    endIndex,
  } = usePagination(filteredCommunities, 20);

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
        } else {
          showSuccessToast("Komunitas berhasil dibuat!", result.message || "Akun login admin komunitas telah dibuat.");
        }
        setIsModalOpen(false);
        // Tampilkan info sesaat sebelum reload
        setTimeout(() => {
          window.location.reload();
        }, 3000);
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
        showSuccessToast("Berhasil", "Kata sandi admin komunitas berhasil di-reset.");
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
    const ok = await confirm({
      title: "Hapus Komunitas?",
      description: `Apakah Anda yakin ingin menghapus komunitas '${comm.name}' secara permanen? Peringatan: Proses ini tidak dapat dibatalkan, dan jika komunitas ini memiliki sekolah/akun tertaut, proses mungkin gagal.`,
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      variant: "danger",
    });

    if (!ok) return;

    startTransition(async () => {
      const result = await deleteCommunityAction(comm.id);
      if (result.success) {
        showSuccessToast("Berhasil", "Komunitas berhasil dihapus!");
        window.location.reload();
      } else {
        showErrorToast("Gagal menghapus komunitas", result.error || "");
      }
    });
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
          <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>
            {[row.village, row.district, row.city, row.province].filter(Boolean).join(", ") || row.address || "Tidak ada alamat"}
          </div>
        </div>
      ),
    },
    {
      key: "code",
      label: "Akun Akses",
      render: (val: any) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
          <div><span style={{ color: "#6c757d" }}>Kode:</span> <code style={{ background: "#f1f3f5", padding: "0.1rem 0.3rem", borderRadius: 4 }}>{String(val)}</code></div>
          <div><span style={{ color: "#6c757d" }}>User:</span> <strong>admin_{String(val)}</strong></div>
          <div><span style={{ color: "#6c757d" }}>Pass:</span> <code style={{ color: "#a8281c" }}>Password123!</code> <span style={{ fontSize: "0.7rem", color: "#adb5bd" }}>(bawaan)</span></div>
        </div>
      ),
    },
    {
      key: "contact_name",
      label: "Kontak Representatif",
      render: (_: any, row: Community) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.contact_name || "-"}</div>
          <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>
            {row.contact_email ? `${row.contact_email}` : ""}
            {row.contact_phone ? ` • ${row.contact_phone}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (val: any) => (
        <Badge variant={val ? "success" : "danger"}>
          {val ? "Aktif" : "Nonaktif"}
        </Badge>
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
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
          onPageChange={setCurrentPage}
          totalItems={totalItems}
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
              <span style={{ fontSize: "0.75rem", color: "#6c757d", marginTop: "0.25rem" }}>
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
    </div>
  );
}
