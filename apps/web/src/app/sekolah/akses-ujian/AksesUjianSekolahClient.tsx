"use client";

import React, { useState, useTransition } from "react";
import { Button, Badge, useToast, useConfirm } from "@pemantik/ui";
import { submitPhaseRequestForIndependentSchoolAction } from "@/app/actions/phaseRequests";

interface PackageOption { id: string; name: string; subject_area: string; phase?: string; valid_from?: string; valid_until?: string; }
interface ClassOption { id: string; name: string; grade: number; students: { count: number }[]; }
interface StudentOption { id: string; name: string; class_id: string; }
interface CategoryOption { id: string; name: string; subject_area: string; }
interface PhaseRequestOption {
  id: string;
  phase: string;
  valid_from: string;
  valid_until: string;
  status: string;
  rejection_reason?: string | null;
  created_at: string;
  question_categories?: { name: string; subject_area: string } | null;
}

interface Props {
  packages: PackageOption[];
  classes: ClassOption[];
  students: StudentOption[];
  schoolId: string;
  hasCommunity?: boolean;
  currentStage?: string;
  allCategories?: CategoryOption[];
  phaseRequests?: PhaseRequestOption[];
}

export default function AksesUjianSekolahClient({
  packages,
  classes,
  students,
  schoolId,
  hasCommunity,
  currentStage = "persiapan_akun",
  allCategories = [],
  phaseRequests = [],
}: Props) {
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [isPending, startTransition] = useTransition();
  const { success: showSuccess, error: showError, info: showInfo } = useToast();
  const { confirm } = useConfirm();

  // State untuk form pengajuan independen
  const [showModalRequest, setShowModalRequest] = useState(false);
  const [reqPhase, setReqPhase] = useState("");
  const [reqCategory, setReqCategory] = useState("");
  const [reqValidFrom, setReqValidFrom] = useState("");
  const [reqValidUntil, setReqValidUntil] = useState("");
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqPhase || !reqCategory || !reqValidFrom || !reqValidUntil) {
      showInfo("Lengkapi Form", "Mohon isi nama fase, kategori ujian, dan tanggal mulai/selesai asesmen.");
      return;
    }
    if (new Date(reqValidFrom) >= new Date(reqValidUntil)) {
      showError("Tanggal Tidak Valid", "Tanggal mulai asesmen harus sebelum tanggal selesai.");
      return;
    }

    setIsSubmittingReq(true);
    try {
      const res = await submitPhaseRequestForIndependentSchoolAction({
        schoolId,
        categoryId: reqCategory,
        phase: reqPhase.trim(),
        validFrom: reqValidFrom,
        validUntil: reqValidUntil,
      });

      if (res.success) {
        showSuccess("Pengajuan Berhasil", `Fase "${reqPhase}" berhasil diajukan ke Superadmin.`);
        setShowModalRequest(false);
        setReqPhase("");
        setReqCategory("");
        setReqValidFrom("");
        setReqValidUntil("");
      } else {
        showError("Gagal Mengajukan", res.error || "Terjadi kesalahan.");
      }
    } catch (err: any) {
      showError("Error", err.message || "Terjadi kesalahan saat mengajukan fase.");
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleUjianUlang = async () => {
    if (!selectedPackageId || !selectedClassId) {
      showInfo("Lengkapi Pilihan", "Pilih kategori ujian dan kelas terlebih dahulu.");
      return;
    }

    const pkg = packages.find((p) => p.id === selectedPackageId);
    const cls = classes.find((c) => c.id === selectedClassId);
    const std = students.find((s) => s.id === selectedStudentId);

    const targetName = std ? `siswa "${std.name}"` : `seluruh kelas "${cls?.name}"`;

    const ok = await confirm({
      title: "Ijinkan Ujian Ulang",
      description: `Ini akan me-void semua sesi ujian aktif pada ${targetName} untuk kategori "${pkg?.name}", sehingga bisa mengulang dari awal. Apakah Anda yakin?`,
      confirmLabel: "Ya, Buka Ujian Ulang",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/sekolah/ujian-ulang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            class_id: selectedClassId,
            student_id: selectedStudentId || undefined,
            category_id: selectedPackageId,
            school_id: schoolId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Server error");
        showSuccess(
          "Ujian Ulang Diaktifkan",
          `${data.voidedCount ?? 0} sesi lama di-void. ${std ? `Anak "${std.name}"` : `Kelas "${cls?.name}"`} kini bisa mengulang ujian.`
        );
        setSelectedPackageId("");
        setSelectedClassId("");
        setSelectedStudentId("");
      } catch (err: any) {
        showError("Gagal", err.message || "Terjadi kesalahan.");
      }
    });
  };

  const subjectColor = (subject: string) =>
    subject === "literasi" ? "#2d9e5f" : subject === "numerasi" ? "#0874aa" : "#6c757d";

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Disetujui / Aktif</Badge>;
      case "rejected":
        return <Badge variant="danger">Ditolak</Badge>;
      default:
        return <Badge variant="warning">Menunggu ACC Superadmin</Badge>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>
      {/* ── Status Kendali (Independen vs Komunitas) ── */}
      {!hasCommunity ? (
        // ── Sekolah Independen ──────────────────────────────────────────────
        currentStage === "persiapan_akun" ? (
          // Tahap 1 masih berjalan → tampilkan banner terkunci
          <div style={{
            backgroundColor: "#fefce8",
            border: "1px solid #fde68a",
            borderRadius: "1.25rem",
            padding: "1.75rem",
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
          }}>
            <div style={{ fontSize: "2.5rem" }}>🔒</div>
            <div>
              <div style={{ marginBottom: "0.4rem" }}>
                <Badge variant="warning">Tahap 1 — Persiapan Akun</Badge>
              </div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#92400e" }}>
                Pengajuan Asesmen Belum Tersedia
              </h2>
              <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.88rem", color: "#78350f", lineHeight: 1.6 }}>
                Sekolah Anda masih berada di <strong>Tahap 1: Persiapan Akun &amp; Dapodik</strong>.
                Konfirmasi ke Tahap 2 diperlukan terlebih dahulu melalui halaman <strong>Dashboard → Timeline Asesmen</strong> sebelum Anda dapat mengajukan fase asesmen.
              </p>
            </div>
          </div>
        ) : (
          // Tahap 2 ke atas → tampilkan form pengajuan
          <div style={{
            backgroundColor: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "1.25rem",
            padding: "1.75rem",
            boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.25rem",
          }}>
            <div>
              <div style={{ marginBottom: "0.5rem" }}>
                <Badge variant="info">🏢 Sekolah Independen</Badge>
              </div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0369a1" }}>
                Tahap 2: Pengajuan Fase Asesmen ke Superadmin
              </h2>
              <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.88rem", color: "#334155" }}>
                Karena sekolah Anda bersifat independen (tidak di bawah naungan komunitas), Anda memiliki kendali penuh untuk mengajukan jadwal dan paket asesmen langsung ke Superadmin.
              </p>
            </div>
            <Button
              onClick={() => setShowModalRequest(true)}
              style={{
                backgroundColor: "#0284c7",
                color: "white",
                fontWeight: 700,
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
              }}
            >
              + Ajukan Fase Asesmen Baru
            </Button>
          </div>
        )
      ) : (
        // ── Sekolah Binaan Komunitas ────────────────────────────────────────
        <div style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #cbd5e1",
          borderRadius: "1.25rem",
          padding: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}>
          <div style={{ fontSize: "2rem" }}>🏛️</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <Badge variant="info">Sekolah Binaan Komunitas</Badge>
            </div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e293b" }}>
              Jadwal dan Pengajuan Asesmen Dikelola oleh Komunitas Induk
            </h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Seluruh hak akses, rentang waktu asesmen, dan konfirmasi timeline berada di bawah kendali Admin Komunitas Induk Anda. Di bawah ini adalah daftar asesmen aktif dan riwayat yang telah dilalui sekolah Anda.
            </p>
          </div>
        </div>
      )}

      {/* ── Modal Pengajuan Fase Baru (Sekolah Independen) ── */}
      {showModalRequest && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem",
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "1.25rem",
            padding: "2rem",
            width: "100%",
            maxWidth: "520px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            border: "1px solid #e2e8f0",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                Pengajuan Fase Asesmen Baru
              </h3>
              <button
                onClick={() => setShowModalRequest(false)}
                style={{ border: "none", background: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                  Nama Fase Asesmen <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Fase 1 - Evaluasi Semester Ganjil 2026"
                  value={reqPhase}
                  onChange={(e) => setReqPhase(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.65rem 0.85rem" }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                  Pilih Kategori / Paket Ujian <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-input"
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.65rem 0.85rem" }}
                >
                  <option value="">— Pilih Kategori —</option>
                  {allCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.subject_area.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                    Tanggal Mulai <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={reqValidFrom}
                    onChange={(e) => setReqValidFrom(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.65rem 0.85rem" }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                    Tanggal Akhir <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={reqValidUntil}
                    onChange={(e) => setReqValidUntil(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.65rem 0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a", padding: "0.85rem", borderRadius: "0.65rem", fontSize: "0.82rem", color: "#92400e", lineHeight: 1.5 }}>
                ⚠️ <strong>Catatan:</strong> Walaupun pengajuan berhasil dikirim, siswa di sekolah Anda baru dapat mengakses dan mengerjakan soal setelah pengajuan di-ACC oleh Superadmin.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModalRequest(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingReq}
                  style={{ backgroundColor: "#0284c7", color: "white", fontWeight: 700 }}
                >
                  {isSubmittingReq ? "Sedang Mengirim..." : "Kirim Pengajuan ke Superadmin"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Riwayat Pengajuan & Asesmen Aktif ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: "1.25rem", border: "1px solid #e2e8f0" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", backgroundColor: "#f8fafc" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Daftar & Riwayat Fase Asesmen
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.25rem 0 0" }}>
            Daftar seluruh fase ujian yang aktif maupun yang masih dalam proses pengajuan atau sudah dilalui.
          </p>
        </div>

        {packages.length === 0 && phaseRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 2rem", color: "#64748b" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
            <strong style={{ display: "block", fontSize: "1.05rem", color: "#0f172a", marginBottom: "0.25rem" }}>
              Belum ada riwayat asesmen
            </strong>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
              {!hasCommunity
                ? "Tekan tombol '+ Ajukan Fase Asesmen Baru' di atas untuk memulai pengajuan ke Superadmin."
                : "Komunitas Anda belum menjadwalkan atau mengajukan fase asesmen untuk sekolah ini."}
            </p>
          </div>
        ) : (
          <table className="pemantik-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", backgroundColor: "white", textAlign: "left", color: "#475569", fontSize: "0.85rem" }}>
                <th style={{ padding: "1rem 1.5rem" }}>Nama Fase</th>
                <th style={{ padding: "1rem 1.5rem" }}>Kategori & Mata Ujian</th>
                <th style={{ padding: "1rem 1.5rem" }}>Rentang Waktu</th>
                <th style={{ padding: "1rem 1.5rem" }}>Status & Akses Anak</th>
              </tr>
            </thead>
            <tbody>
              {/* Tampilkan dulu pengajuan (phaseRequests) yang belum/sudah direview */}
              {phaseRequests.map((req) => (
                <tr key={`req-${req.id}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "#0f172a" }}>
                    {req.phase}
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 400, marginTop: "0.2rem" }}>
                      Diajukan: {new Date(req.created_at).toLocaleDateString("id-ID")}
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>
                      {req.question_categories?.name || "Kategori Terpilih"}
                    </div>
                    {req.question_categories?.subject_area && (
                      <span style={{
                        display: "inline-block",
                        marginTop: "0.25rem",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "1rem",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        backgroundColor: `${subjectColor(req.question_categories.subject_area)}15`,
                        color: subjectColor(req.question_categories.subject_area),
                        textTransform: "capitalize",
                      }}>
                        {req.question_categories.subject_area}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "1rem 1.5rem", fontSize: "0.85rem", color: "#475569" }}>
                    {new Date(req.valid_from).toLocaleDateString("id-ID")} — {new Date(req.valid_until).toLocaleDateString("id-ID")}
                  </td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    {statusBadge(req.status)}
                    {req.rejection_reason && req.status === "rejected" && (
                      <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.35rem", fontStyle: "italic" }}>
                        Alasan: {req.rejection_reason}
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {/* Tampilkan juga paket dari assessment_access jika belum tercover di atas */}
              {packages
                .filter((p) => !phaseRequests.some((r) => r.phase === p.phase && r.question_categories?.name === p.name))
                .map((pkg) => (
                  <tr key={`pkg-${pkg.id}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "#0f172a" }}>
                      {pkg.phase || "Asesmen Langsung"}
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>{pkg.name}</div>
                      <span style={{
                        display: "inline-block",
                        marginTop: "0.25rem",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "1rem",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        backgroundColor: `${subjectColor(pkg.subject_area)}15`,
                        color: subjectColor(pkg.subject_area),
                        textTransform: "capitalize",
                      }}>
                        {pkg.subject_area}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.85rem", color: "#475569" }}>
                      {pkg.valid_from ? new Date(pkg.valid_from).toLocaleDateString("id-ID") : "—"} — {pkg.valid_until ? new Date(pkg.valid_until).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <Badge variant="success">Disetujui / Aktif</Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Form Ujian Ulang ── */}
      {packages.length > 0 && (
        <div className="card" style={{ padding: "1.75rem", borderRadius: "1.25rem", border: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
            🔄 Reset Sesi / Ujian Ulang Kelas
          </h2>
          <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: "1.5rem" }}>
            Gunakan fitur ini jika terdapat kendala teknis dan siswa dalam suatu kelas perlu mengulang ujian dari awal. Fitur ini akan me-reset seluruh progres ujian aktif pada kelas tersebut.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "1.25rem", alignItems: "flex-end" }}>
            <div>
              <label className="form-label" style={{ fontWeight: 700, color: "#334155" }}>Kategori Ujian</label>
              <select className="form-input" value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}>
                <option value="">— Pilih Kategori —</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 700, color: "#334155" }}>Kelas / Rombel</label>
              <select
                className="form-input"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedStudentId("");
                }}
              >
                <option value="">— Pilih Kelas —</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Kelas {cls.grade} - {cls.name} ({cls.students?.[0]?.count ?? 0} Anak)
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleUjianUlang}
              disabled={isPending || !selectedPackageId || !selectedClassId}
              variant="danger"
              style={{ padding: "0.65rem 1.5rem", fontWeight: 700 }}
            >
              {isPending ? "Memproses..." : "⚠️ Void & Buka Ujian Ulang"}
            </Button>
          </div>

          {selectedClassId && (
            <div style={{ marginTop: "1rem" }}>
              <label className="form-label" style={{ fontSize: "0.82rem", color: "#64748b" }}>
                (Opsional) Pilih satu siswa tertentu saja (biarkan kosong jika ingin mengulang 1 kelas penuh):
              </label>
              <select
                className="form-input"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{ maxWidth: "400px" }}
              >
                <option value="">— Seluruh Anak di Kelas Ini —</option>
                {students
                  .filter((s) => s.class_id === selectedClassId)
                  .map((std) => (
                    <option key={std.id} value={std.id}>{std.name}</option>
                  ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
