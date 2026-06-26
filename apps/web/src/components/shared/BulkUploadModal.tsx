"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@pemantik/ui";
import * as XLSX from "xlsx";

interface BulkUploadModalProps {
  title: string;
  description?: string;
  templateFileName: string;
  templateHeaders: string[];
  templateData?: any[][]; // Optional initial data for template
  onClose: () => void;
  onUpload: (data: any[]) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export default function BulkUploadModal({
  title,
  description,
  templateFileName,
  templateHeaders,
  templateData = [],
  onClose,
  onUpload,
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMsg("");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setErrorMsg("");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleProcessFile = () => {
    if (!file) {
      setErrorMsg("Pilih file terlebih dahulu.");
      return;
    }

    setIsUploading(true);
    setErrorMsg("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Gagal membaca file");

        const workbook = XLSX.read(data, { type: "array" });
        
        // Prefer sheet named "Template" or "Data" since templates put instructions on the first sheet
        let targetSheetName = workbook.SheetNames.find(name => {
          const lName = name.toLowerCase();
          return lName === "template" || lName === "data";
        });
        
        if (!targetSheetName) {
          // Fallback to the second sheet if it exists (assuming 1st is Petunjuk, 2nd is data)
          // or fallback to the first sheet if there is only one sheet
          targetSheetName = workbook.SheetNames.length > 1 ? workbook.SheetNames[1] : workbook.SheetNames[0];
        }
        
        const worksheet = workbook.Sheets[targetSheetName];
        
        // Convert sheet to json array of objects
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        if (jsonData.length === 0) {
          throw new Error("File Excel / CSV kosong atau format tidak valid.");
        }

        // Ensure data is completely plain (Next.js Server Actions strict requirement)
        const plainData = JSON.parse(JSON.stringify(jsonData));

        // Pass parsed data to parent
        const result = await onUpload(plainData);
        
        if (!result.success) {
          throw new Error(result.error || result.message || "Gagal mengunggah data.");
        }
        
        // Let parent handle success (e.g. reload or show toast)
      } catch (err: any) {
        setErrorMsg(err.message || "Terjadi kesalahan saat memproses file.");
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg("Gagal membaca file. Coba lagi.");
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    try {
      // Create worksheet from headers and initial data
      const worksheetData = [templateHeaders, ...(templateData || [])];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Auto-size columns based on header length
      const colWidths = templateHeaders.map(header => ({ wch: Math.max(header.length, 15) }));
      worksheet["!cols"] = colWidths;

      // Create a new workbook and append the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

      // Generate buffer and trigger download
      XLSX.writeFile(workbook, templateFileName.endsWith('.xlsx') ? templateFileName : `${templateFileName}.xlsx`);
    } catch (err) {
      console.error("Failed to generate template:", err);
      setErrorMsg("Gagal mengunduh template. Coba lagi.");
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(16, 46, 80, 0.5)",
      display: "flex",
      alignItems: "flex-start",
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
        maxWidth: "500px",
        margin: "auto",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }} className="animate-scale-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#102e50", margin: 0 }}>
            {title}
          </h2>
          <button 
            onClick={onClose}
            disabled={isUploading}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {description && (
          <p style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: "1rem", lineHeight: 1.5 }}>
            {description}
          </p>
        )}

        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "flex-start" }}>
          <Button 
            variant="outline" 
            onClick={handleDownloadTemplate} 
            disabled={isUploading}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#1d4ed8", borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download Template Excel
          </Button>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          {!file ? (
            <div 
              style={{ 
                padding: "2.5rem 1rem", 
                backgroundColor: "#f8fafc", 
                borderRadius: "0.5rem", 
                border: "2px dashed #cbd5e1", 
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#94a3b8"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <svg style={{ margin: "0 auto 1rem", color: "#64748b" }} width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                Pilih file Excel atau CSV
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Seret dan lepas file ke sini, atau klik untuk memilih file
              </p>
              
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading}
                style={{ display: "none" }}
              />
            </div>
          ) : (
            <div style={{ padding: "1.25rem", backgroundColor: "#f0fdf4", borderRadius: "0.5rem", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ padding: "0.75rem", backgroundColor: "#dcfce7", borderRadius: "0.5rem", color: "#166534" }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#166534" }}>{file.name}</h4>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#15803d", marginTop: "0.25rem" }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              
              <button 
                type="button" 
                onClick={() => setFile(null)} 
                disabled={isUploading}
                style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600, color: "#991b1b", backgroundColor: "#fee2e2", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
              >
                Ganti File
              </button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "0.5rem", fontSize: "0.85rem", marginBottom: "1.5rem", border: "1px solid #fca5a5" }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem" }}>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Batal
          </Button>
          <Button onClick={handleProcessFile} disabled={isUploading || !file} style={{ backgroundColor: "#102e50", color: "white" }}>
            {isUploading ? "Memproses..." : "Mulai Upload"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
