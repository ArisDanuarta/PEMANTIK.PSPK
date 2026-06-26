"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@pemantik/ui";

export interface AssignPackageData {
  packageIds: string[];
  targetId: string;
  targetType: "community" | "school";
  phase: string;
  validFrom: string;
  validUntil: string;
}

interface AssignPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: "super_admin" | "community" | "school";
  packages: { id: string; name: string; subject_area: string }[];
  communities?: { id: string; name: string; code?: string }[];
  schools?: { id: string; name: string; npsn?: string; communities?: { name: string } }[];
  onSubmit: (data: AssignPackageData) => Promise<{ success: boolean; error?: string }>;
}

export default function AssignPackageModal({
  isOpen,
  onClose,
  role,
  packages,
  communities = [],
  schools = [],
  onSubmit,
}: AssignPackageModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [formData, setFormData] = useState<{
    packageIds: string[];
    targetType: "community" | "school";
    targetId: string;
    phase: string;
    validFrom: string;
    validUntil: string;
  }>({
    packageIds: [],
    targetType: role === "community" ? "school" : "community",
    targetId: "",
    phase: "Tahap 1",
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Reset target when changing type
  useEffect(() => {
    setFormData((prev) => ({ ...prev, targetId: "" }));
    setSearchQuery("");
  }, [formData.targetType]);

  // Derived targets based on targetType
  const availableTargets = useMemo(() => {
    if (formData.targetType === "community") {
      return communities.map(c => ({ id: c.id, label: `${c.name} ${c.code ? `(${c.code})` : ''}` }));
    } else {
      return schools.map(s => ({ 
        id: s.id, 
        label: `${s.name} ${s.npsn ? `(NPSN: ${s.npsn})` : ''} - ${s.communities?.name || 'Sekolah Mandiri'}` 
      }));
    }
  }, [formData.targetType, communities, schools]);

  const filteredTargets = useMemo(() => {
    if (!searchQuery) return availableTargets;
    const lowerQuery = searchQuery.toLowerCase();
    return availableTargets.filter(t => t.label.toLowerCase().includes(lowerQuery));
  }, [availableTargets, searchQuery]);

  const selectedTargetLabel = useMemo(() => {
    if (!formData.targetId) return "";
    const t = availableTargets.find(t => t.id === formData.targetId);
    return t ? t.label : "";
  }, [formData.targetId, availableTargets]);

  if (!mounted || !isOpen) return null;

  const handlePackageToggle = (pkgId: string) => {
    setFormData(prev => {
      const isSelected = prev.packageIds.includes(pkgId);
      if (isSelected) {
        return { ...prev, packageIds: prev.packageIds.filter(id => id !== pkgId) };
      } else {
        return { ...prev, packageIds: [...prev.packageIds, pkgId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.packageIds.length === 0) {
      setErrorMsg("Harap pilih setidaknya satu paket ujian.");
      return;
    }
    if (!formData.targetId) {
      setErrorMsg("Harap pilih target penerima akses.");
      return;
    }
    if (role === "super_admin" && !formData.phase) {
      setErrorMsg("Harap lengkapi fase ujian.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const result = await onSubmit(formData);
      if (!result.success) {
        throw new Error(result.error || "Gagal memberikan akses.");
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(16, 46, 80, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "2rem 1rem",
      overflowY: "auto"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "0.75rem",
        padding: "2rem",
        width: "100%",
        maxWidth: "600px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }} className="animate-scale-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#102e50", margin: 0 }}>
            Berikan Akses Ujian
          </h2>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {errorMsg && (
            <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "0.5rem", fontSize: "0.85rem", border: "1px solid #fca5a5" }}>
              {errorMsg}
            </div>
          )}

          {/* Pemilihan Paket (Multi-Select Checkboxes) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>Pilih Paket Ujian * (Bisa Lebih Dari Satu)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", backgroundColor: "#f9fafb", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
              {packages.map(pkg => (
                <label key={pkg.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={formData.packageIds.includes(pkg.id)}
                    onChange={() => handlePackageToggle(pkg.id)}
                    disabled={isSubmitting}
                    style={{ width: "1.1rem", height: "1.1rem", accentColor: "#102e50" }}
                  />
                  <span style={{ fontSize: "0.9rem", color: "#1f2937", fontWeight: 500 }}>
                    {pkg.name} <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>({pkg.subject_area})</span>
                  </span>
                </label>
              ))}
              {packages.length === 0 && (
                <div style={{ gridColumn: "1 / -1", fontSize: "0.85rem", color: "#6b7280", fontStyle: "italic" }}>
                  Tidak ada paket ujian yang tersedia.
                </div>
              )}
            </div>
          </div>

          {/* Radio Button Jenis Target */}
          {role === "super_admin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>Berikan Akses Kepada *</label>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="targetType" 
                    value="community"
                    checked={formData.targetType === "community"}
                    onChange={() => setFormData({ ...formData, targetType: "community" })}
                    disabled={isSubmitting}
                    style={{ accentColor: "#102e50" }}
                  />
                  <span style={{ fontSize: "0.9rem", color: "#374151" }}>Komunitas (Grup)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="targetType" 
                    value="school"
                    checked={formData.targetType === "school"}
                    onChange={() => setFormData({ ...formData, targetType: "school" })}
                    disabled={isSubmitting}
                    style={{ accentColor: "#102e50" }}
                  />
                  <span style={{ fontSize: "0.9rem", color: "#374151" }}>Sekolah Mandiri</span>
                </label>
              </div>
            </div>
          )}

          {/* Searchable Target Dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative" }} ref={dropdownRef}>
            <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>
              Pilih {formData.targetType === "community" ? "Komunitas" : "Sekolah"} *
            </label>
            
            <div 
              style={{
                padding: "0.75rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", 
                backgroundColor: isSubmitting ? "#f3f4f6" : "white", cursor: isSubmitting ? "not-allowed" : "text",
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}
              onClick={() => {
                if (!isSubmitting) {
                  setIsDropdownOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }
              }}
            >
              <span style={{ color: formData.targetId ? "#111827" : "#9ca3af", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {formData.targetId ? selectedTargetLabel : `Ketik untuk mencari ${formData.targetType === "community" ? "Komunitas" : "Sekolah"}...`}
              </span>
              <span style={{ color: "#6b7280" }}>▼</span>
            </div>

            {isDropdownOpen && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, marginTop: "0.25rem",
                backgroundColor: "white", borderRadius: "0.375rem", border: "1px solid #d1d5db",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", zIndex: 10, maxHeight: "250px", display: "flex", flexDirection: "column"
              }}>
                <div style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Ketik nama untuk memfilter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%", padding: "0.5rem", borderRadius: "0.25rem", border: "1px solid #d1d5db",
                      fontSize: "0.85rem", outline: "none"
                    }}
                  />
                </div>
                <div style={{ overflowY: "auto", flex: 1, padding: "0.25rem 0" }}>
                  {filteredTargets.length === 0 ? (
                    <div style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#6b7280", fontStyle: "italic", textAlign: "center" }}>
                      Tidak ditemukan hasil untuk "{searchQuery}"
                    </div>
                  ) : (
                    filteredTargets.map(t => (
                      <div
                        key={t.id}
                        style={{
                          padding: "0.5rem 1rem", fontSize: "0.85rem", color: "#1f2937", cursor: "pointer",
                          backgroundColor: formData.targetId === t.id ? "#eef8ff" : "transparent"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = formData.targetId === t.id ? "#eef8ff" : "transparent")}
                        onClick={() => {
                          setFormData({ ...formData, targetId: t.id });
                          setIsDropdownOpen(false);
                          setSearchQuery("");
                        }}
                      >
                        {t.label}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Input Fase Ujian - Hanya Super Admin */}
          {role === "super_admin" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>
                  Fase Ujian (Tracking) *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Tahap 1, Pre-test, dsb."
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  style={{ padding: "0.75rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", width: "100%" }}
                  disabled={isSubmitting}
                />
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280" }}>Penamaan ini akan digunakan untuk melacak progres siswa antar ujian yang sama.</p>
              </div>

              {/* Rentang Waktu */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>Berlaku Dari *</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    style={{ padding: "0.75rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", width: "100%" }}
                    disabled={isSubmitting}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>Berlaku Sampai *</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    style={{ padding: "0.75rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", width: "100%" }}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem", marginTop: "0.5rem" }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: "#102e50", color: "white" }}>
              {isSubmitting ? "Menyimpan..." : "Berikan Akses"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
