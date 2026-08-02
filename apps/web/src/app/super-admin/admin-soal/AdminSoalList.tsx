"use client";

import React, { useState } from "react";
import { Table, Button, Modal, Badge, useToast, useConfirm } from "@pemantik/ui";
import {
  createQuestionAdminAction,
  updateQuestionAdminAction,
  deleteQuestionAdminAction,
  resetQuestionAdminPasswordAction,
} from "@/app/actions/questionAdmins";

export default function AdminSoalList({ initialAdmins }: { initialAdmins: any[] }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { success, error } = useToast();
  const { confirm } = useConfirm();

  const [editId, setEditId] = useState<string | null>(null);
  
  // Form State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  const openAddModal = () => {
    setEditId(null);
    setFullName("");
    setUsername("");
    setPassword("");
    setIsActive(true);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (admin: any) => {
    setEditId(admin.id);
    setFullName(admin.full_name);
    setUsername(admin.username);
    setIsActive(admin.is_active);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("full_name", fullName);
    formData.append("username", username);
    formData.append("is_active", isActive.toString());

    let res;
    if (editId) {
      res = await updateQuestionAdminAction(editId, formData);
    } else {
      res = await createQuestionAdminAction(formData);
    }

    if (res.success) {
      success("Berhasil", "Data admin soal berhasil disimpan!");
      setIsModalOpen(false);
      // Untuk update lokal agar tak perlu reload (sementara, revalidatePath handle server)
      if (editId) {
        setAdmins(prev => prev.map(a => a.id === editId ? { ...a, full_name: fullName, is_active: isActive } : a));
      } else {
        window.location.reload(); // Hard reload untuk simplifikasi nambah id baru
      }
    } else {
      setErrorMsg(res.error || "Gagal menyimpan data.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Hapus Admin Soal",
      description: "Apakah Anda yakin ingin menghapus akun admin ini? Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      variant: "danger",
    });

    if (isConfirmed) {
      const res = await deleteQuestionAdminAction(id);
      if (res.success) {
        setAdmins((prev) => prev.filter((a) => a.id !== id));
        success("Berhasil", "Akun admin berhasil dihapus.");
      } else {
        error("Gagal Menghapus", res.error || "Terjadi kesalahan.");
      }
    }
  };

  const handleResetPassword = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Reset Sandi",
      description: "Apakah Anda yakin ingin mereset kata sandi akun admin ini ke default (Password123!)?",
      confirmLabel: "Reset",
      cancelLabel: "Batal",
      variant: "warning",
    });

    if (isConfirmed) {
      const res = await resetQuestionAdminPasswordAction(id);
      if (res.success) {
        success("Berhasil", "Kata sandi berhasil di-reset.");
      } else {
        error("Gagal Reset", res.error || "Terjadi kesalahan.");
      }
    }
  };

  const columns = [
    {
      key: "full_name",
      label: "Nama Lengkap",
      render: (val: any, row: any) => <div style={{ fontWeight: 500 }}>{val}</div>
    },
    {
      key: "username",
      label: "Akun Akses",
      render: (val: any) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
          <div><span style={{ color: "black" }}>User:</span> <strong>{val}</strong></div>
          <div><span style={{ color: "black" }}>Pass:</span> <code style={{ color: "#a8281c" }}>Password123!</code></div>
        </div>
      )
    },
    {
      key: "is_active",
      label: "Status Akun",
      render: (val: any) => val ? <Badge variant="success">Aktif</Badge> : <Badge variant="danger">Non-Aktif</Badge>
    },
    {
      key: "actions",
      label: "Aksi",
      render: (_: any, admin: any) => (
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="outline" size="sm" onClick={() => openEditModal(admin)}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleResetPassword(admin.id)}>
            Reset Sandi
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(admin.id)}>
            Hapus
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>Daftar Pengguna</h3>
        <Button variant="primary" onClick={openAddModal}>
          + Tambah Admin Soal
        </Button>
      </div>

      <Table
        columns={columns}
        data={admins}
        emptyMessage="Belum ada akun Admin Soal terdaftar."
      />

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editId ? "Edit Admin Soal" : "Tambah Admin Soal"}
      >
        <form onSubmit={handleSubmit}>
          {errorMsg && (
            <div style={{ padding: "0.75rem", backgroundColor: "var(--color-danger-light)", color: "var(--color-danger-dark)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem" }}>
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-input" 
              required={!editId} 
              disabled={!!editId}
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="Hanya huruf kecil, angka, dan _"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <input 
              type="checkbox" 
              id="isActive" 
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              style={{ width: "18px", height: "18px", cursor: "pointer", margin: 0 }}
            />
            <label htmlFor="isActive" style={{ fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", margin: 0 }}>Akun Aktif</label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem", borderTop: "1px solid #e9ecef", paddingTop: "1rem" }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
