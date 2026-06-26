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
} from "../../actions/communities";

interface Community {
  id: string;
  name: string;
  code: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
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

  const columns = [
    {
      key: "name",
      label: "Nama Mitra / Komunitas",
      render: (_: any, row: Community) => (
        <div>
          <div style={{ fontWeight: 600, color: "#102e50" }}>{row.name}</div>
          <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>{row.address || "Tidak ada alamat"}</div>
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
          <div style={{ fontWeight: 500 }}>{row.contact_name || "—"}</div>
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
        <Button variant="primary" onClick={handleOpenAddModal}>
          + Tambah Komunitas
        </Button>
      </div>

      <div className="card">
        <Table columns={columns} data={filteredCommunities} emptyMessage="Tidak ada komunitas terdaftar" />
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
            <label className="form-label" htmlFor="comm-address">
              Alamat Kantor
            </label>
            <textarea
              id="comm-address"
              name="address"
              className="form-input"
              placeholder="Alamat lengkap komunitas"
              rows={3}
              defaultValue={editingComm?.address || ""}
              style={{ resize: "vertical" }}
            />
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
    </div>
  );
}
