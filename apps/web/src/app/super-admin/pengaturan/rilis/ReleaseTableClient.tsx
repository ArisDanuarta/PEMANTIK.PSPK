"use client";

import React, { useState } from "react";
import { Button, DataTable, useToast, Modal, ActionMenu } from "@pemantik/ui";
import type { ColumnDef } from "@pemantik/ui";
import { useRouter } from "next/navigation";
import { updateRelease, deleteRelease } from "@/app/actions/releases";

export default function ReleaseTableClient({ initialReleases }: { initialReleases: any[] }) {
  const { success, error } = useToast();
  const router = useRouter();
  
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Edit Modal State
  const [editingRelease, setEditingRelease] = useState<any>(null);
  const [editData, setEditData] = useState({
    version_name: "",
    version_code: "",
    download_url: "",
    is_mandatory: false,
    is_active: false,
    release_notes: ""
  });

  const handleDelete = async (id: string, versionName: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus rilis versi ${versionName}? Tindakan ini tidak dapat dibatalkan.`)) {
      setLoadingId(id);
      try {
        const res = await deleteRelease(id);
        if (res.error) throw new Error(res.error);
        success("Berhasil", "Rilis berhasil dihapus.");
        router.refresh();
      } catch (err: any) {
        error("Gagal", err.message || "Gagal menghapus rilis.");
      } finally {
        setLoadingId(null);
      }
    }
  };

  const openEditModal = (release: any) => {
    setEditingRelease(release);
    setEditData({
      version_name: release.version_name,
      version_code: release.version_code.toString(),
      download_url: release.download_url,
      is_mandatory: release.is_mandatory,
      is_active: release.is_active,
      release_notes: release.release_notes || ""
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRelease) return;
    
    setLoadingId("update");
    try {
      const res = await updateRelease(editingRelease.id, {
        version_name: editData.version_name,
        version_code: parseInt(editData.version_code),
        download_url: editData.download_url,
        is_mandatory: editData.is_mandatory,
        is_active: editData.is_active,
        release_notes: editData.release_notes
      });
      if (res.error) throw new Error(res.error);
      
      success("Berhasil", "Rilis berhasil diperbarui.");
      setEditingRelease(null);
      router.refresh();
    } catch (err: any) {
      error("Gagal", err.message || "Gagal memperbarui rilis.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div className="card" style={{ maxWidth: "100%", overflowX: "auto" }}>
        <h2 style={{ marginBottom: "1rem" }}>Riwayat Rilis</h2>
      {(() => {
          const releaseCols: ColumnDef<any>[] = [
            {
              key: "version_name",
              label: "Versi",
              sortable: true,
              render: (_v, r) => <span style={{ fontWeight: 600 }}>{r.version_name}</span>,
            },
            { key: "version_code", label: "Code", render: (_v, r) => <span>{r.version_code}</span> },
            {
              key: "created_at",
              label: "Tanggal Rilis",
              sortable: true,
              render: (_v, r) => (
                <span>{new Date(r.created_at).toLocaleString("id-ID", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              ),
            },
            {
              key: "is_active",
              label: "Status",
              render: (_v, r) => (
                <span className={`badge ${r.is_active ? "badge-success" : "badge-secondary"}`}>
                  {r.is_active ? "Aktif" : "Non-Aktif"}
                </span>
              ),
            },
            {
              key: "is_mandatory",
              label: "Wajib?",
              render: (_v, r) => <span>{r.is_mandatory ? "Ya" : "Tidak"}</span>,
            },
            {
              key: "download_url",
              label: "Link Download",
              render: (_v, r) => (
                <a href={r.download_url} target="_blank" rel="noreferrer" style={{ color: "var(--clr-biru)", textDecoration: "underline", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                  Download APK
                </a>
              ),
            },
            {
              key: "actions",
              label: "Aksi",
              align: "right" as const,
              render: (_v, r) => (
                <ActionMenu 
                  actions={[
                    { label: "Edit", onClick: () => openEditModal(r), disabled: loadingId === r.id },
                    { label: loadingId === r.id ? "..." : "Hapus", onClick: () => handleDelete(r.id, r.version_name), disabled: loadingId === r.id, variant: "danger" }
                  ]} 
                />
              ),
            },
          ];
          return (
            <DataTable
              columns={releaseCols}
              data={initialReleases || []}
              emptyMessage="Belum ada versi rilis aplikasi yang diunggah."
              minWidth="700px"
              striped
            />
          );
        })()}
      </div>

      <Modal open={!!editingRelease} onClose={() => setEditingRelease(null)} title="Edit Rilis">
        <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="form-label">Versi Aplikasi</label>
            <input
              type="text"
              className="form-input"
              value={editData.version_name}
              onChange={(e) => setEditData({ ...editData, version_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Version Code</label>
            <input
              type="number"
              className="form-input"
              value={editData.version_code}
              onChange={(e) => setEditData({ ...editData, version_code: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Link Download</label>
            <input
              type="url"
              className="form-input"
              value={editData.download_url}
              onChange={(e) => setEditData({ ...editData, download_url: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Catatan Rilis</label>
            <textarea
              className="form-input"
              rows={3}
              value={editData.release_notes}
              onChange={(e) => setEditData({ ...editData, release_notes: e.target.value })}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              id="editIsMandatory"
              checked={editData.is_mandatory}
              onChange={(e) => setEditData({ ...editData, is_mandatory: e.target.checked })}
            />
            <label htmlFor="editIsMandatory">Wajib Diperbarui (Mandatory Update)</label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              id="editIsActive"
              checked={editData.is_active}
              onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
            />
            <label htmlFor="editIsActive">Aktif (Tersedia untuk Pengguna)</label>
          </div>
          
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <Button type="button" variant="outline" onClick={() => setEditingRelease(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={loadingId === "update"}>
              {loadingId === "update" ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
