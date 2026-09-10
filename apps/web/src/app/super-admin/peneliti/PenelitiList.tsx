"use client";

import React, { useState } from "react";
import { DataTable, Button, Modal, Badge, useToast, useConfirm, ActionMenu } from "@pemantik/ui";
import type { ColumnDef } from "@pemantik/ui";
import {
  createPenelitiAdminAction,
  updatePenelitiAdminAction,
  deletePenelitiAdminAction,
  resetPenelitiPasswordAction,
} from "@/app/actions/penelitiAdmins";
import CredentialModal, { Credentials } from "@/components/shared/CredentialModal";

export default function PenelitiList({ initialAdmins }: { initialAdmins: any[] }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [credentialModal, setCredentialModal] = useState<{isOpen: boolean; creds: Credentials | null; title: string}>({
    isOpen: false,
    creds: null,
    title: ""
  });
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
      res = await updatePenelitiAdminAction(editId, formData);
    } else {
      res = await createPenelitiAdminAction(formData);
    }

    if (res.success) {
      setIsModalOpen(false);
      if (editId) {
        success("Berhasil", "Data peneliti berhasil disimpan!");
        setAdmins(prev => prev.map(a => a.id === editId ? { ...a, full_name: fullName, is_active: isActive } : a));
      } else {
        if (res.credentials) {
          setCredentialModal({
            isOpen: true,
            creds: res.credentials,
            title: "Akun Peneliti Dibuat"
          });
        } else {
          success("Berhasil", "Data peneliti berhasil disimpan!");
          window.location.reload(); 
        }
      }
    } else {
      setErrorMsg(res.error || "Gagal menyimpan data.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Hapus Peneliti",
      description: "Apakah Anda yakin ingin menghapus akun peneliti ini? Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      variant: "danger",
    });

    if (isConfirmed) {
      const res = await deletePenelitiAdminAction(id);
      if (res.success) {
        setAdmins((prev) => prev.filter((a) => a.id !== id));
        success("Berhasil", "Akun peneliti berhasil dihapus.");
      } else {
        error("Gagal Menghapus", res.error || "Terjadi kesalahan.");
      }
    }
  };

  const handleResetPassword = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Reset Password",
      description: "Password peneliti ini akan direset. Lanjutkan?",
      confirmLabel: "Reset",
      cancelLabel: "Batal",
      variant: "danger",
    });

    if (isConfirmed) {
      const res = await resetPenelitiPasswordAction(id);
      if (res.success) {
        if (res.credentials) {
          setCredentialModal({
            isOpen: true,
            creds: res.credentials,
            title: "Password Berhasil Direset"
          });
        } else {
          success("Berhasil", res.message || "Password direset.");
        }
      } else {
        error("Gagal Reset", res.error || "Terjadi kesalahan.");
      }
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: "full_name", label: "Nama Lengkap", sortable: true, render: (val: any) => <div style={{ fontWeight: 600, color: "#102e50" }}>{val}</div> },
    { 
      key: "username", 
      label: "Akun Akses", 
      render: (val: any, row: any) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
          <div>
            <span style={{ color: "black" }}>User:</span>{" "}
            <strong 
              style={{ cursor: "pointer", textDecoration: "underline", color: "#0874aa" }} 
              onClick={() => { navigator.clipboard.writeText(val); success("Tersalin", "Username disalin ke clipboard"); }}
              title="Klik untuk menyalin"
            >{val}</strong>
          </div>
          <div>
            <span style={{ color: "black" }}>Pass:</span>{" "}
            <code 
              style={{ color: "#a8281c", cursor: "pointer", textDecoration: "underline" }} 
              onClick={() => { navigator.clipboard.writeText(row.plain_password || "-"); success("Tersalin", "Password disalin ke clipboard"); }}
              title="Klik untuk menyalin"
            >{row.plain_password || "-"}</code>
          </div>
        </div>
      ) 
    },
    { key: "is_active", label: "Status", render: (val: any) => <Badge variant={val ? "success" : "danger"}>{val ? "Aktif" : "Non-Aktif"}</Badge> },
    { key: "actions", label: "Aksi", align: "center" as const, render: (_: any, admin: any) => (
        <ActionMenu 
          actions={[
            { label: "Edit", onClick: () => openEditModal(admin) },
            { label: "Reset Password", onClick: () => handleResetPassword(admin.id) },
            { label: "Hapus", onClick: () => handleDelete(admin.id), variant: "danger" }
          ]} 
        />
      )
    }
  ];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#102e50" }}>Daftar Akun Peneliti</h2>
        <Button onClick={openAddModal} style={{ backgroundColor: "#0874aa", color: "white", gap: "0.5rem" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Tambah Peneliti
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={admins}
        emptyMessage="Belum ada akun peneliti."
        striped
      />

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Peneliti" : "Tambah Peneliti"}>
        <form onSubmit={handleSubmit}>
          {errorMsg && (
            <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "0.375rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>Nama Lengkap</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Cth: Dr. Budi Santoso"
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={!!editId} // Username tak bisa diedit
              placeholder="Cth: budi_s"
              style={editId ? { backgroundColor: "#f3f4f6" } : {}}
            />
            {!editId && (
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                Gunakan huruf kecil, angka, dan underscore (_). Password akan di-generate secara otomatis.
              </p>
            )}
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>Status Akun</label>
            <select
              className="form-input"
              value={isActive ? "true" : "false"}
              onChange={(e) => setIsActive(e.target.value === "true")}
            >
              <option value="true">Aktif (Bisa Login)</option>
              <option value="false">Non-Aktif (Diblokir)</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading} style={{ backgroundColor: "#0874aa", color: "white" }}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
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
