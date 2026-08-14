"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  startIndex?: number;
  endIndex?: number;
  className?: string;
}

/**
 * Komponen Pagination terpusat - PSPK Brand.
 * Desain: pill container navy, Previous/Next rounded, halaman aktif putih,
 * ellipsis (...) untuk halaman tengah yang tersembunyi.
 * Warna: Navy #102e50 (primer), Biru #0874aa (aksen/Next button).
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Hitung range halaman yang ditampilkan
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    const delta = 1; // Jumlah halaman di sekitar halaman aktif

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Selalu tampilkan halaman 1
    pages.push(1);

    const leftBound = currentPage - delta;
    const rightBound = currentPage + delta;

    if (leftBound > 2) pages.push("...");

    for (let i = Math.max(2, leftBound); i <= Math.min(totalPages - 1, rightBound); i++) {
      pages.push(i);
    }

    if (rightBound < totalPages - 1) pages.push("...");

    // Selalu tampilkan halaman terakhir
    pages.push(totalPages);

    return pages;
  };

  const pages = getPageNumbers();
  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        paddingTop: "1rem",
      }}
    >
      {/* Info total items */}
      {totalItems !== undefined && startIndex !== undefined && endIndex !== undefined && (
        <p
          style={{
            fontSize: "0.8rem",
            color: "#6b7280",
            margin: 0,
            fontFamily: "'Inter', 'PT Sans', sans-serif",
          }}
        >
          Menampilkan{" "}
          <strong style={{ color: "#102e50" }}>
            {totalItems === 0 ? 0 : startIndex + 1}-{endIndex}
          </strong>{" "}
          dari <strong style={{ color: "#102e50" }}>{totalItems}</strong> data
        </p>
      )}

      {/* Pill container */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          background: "#102e50",
          borderRadius: "100px",
          padding: "0.3rem 0.4rem",
          boxShadow: "0 2px 8px rgba(16,46,80,0.18)",
        }}
      >
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isPrevDisabled}
          title="Halaman sebelumnya"
          style={{
            padding: "0.45rem 1rem",
            borderRadius: "100px",
            border: "none",
            cursor: isPrevDisabled ? "not-allowed" : "pointer",
            background: isPrevDisabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
            color: isPrevDisabled ? "rgba(255,255,255,0.35)" : "#ffffff",
            fontWeight: 600,
            fontSize: "0.85rem",
            fontFamily: "'Inter', 'PT Sans', sans-serif",
            transition: "background 0.15s, transform 0.1s",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            whiteSpace: "nowrap",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            if (!isPrevDisabled) {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.25)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = isPrevDisabled
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.15)";
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        {/* Page Numbers */}
        {pages.map((page, idx) =>
          page === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              style={{
                color: "rgba(255,255,255,0.55)",
                padding: "0 0.25rem",
                fontSize: "0.9rem",
                lineHeight: 1,
                userSelect: "none",
                minWidth: "2rem",
                textAlign: "center",
              }}
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              title={`Halaman ${page}`}
              style={{
                width: "2.2rem",
                height: "2.2rem",
                borderRadius: "50%",
                border: "none",
                cursor: page === currentPage ? "default" : "pointer",
                background:
                  page === currentPage
                    ? "#ffffff"
                    : "transparent",
                color:
                  page === currentPage
                    ? "#102e50"
                    : "rgba(255,255,255,0.75)",
                fontWeight: page === currentPage ? 700 : 500,
                fontSize: "0.88rem",
                fontFamily: "'Inter', 'PT Sans', sans-serif",
                transition: "background 0.15s, color 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (page !== currentPage) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.2)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (page !== currentPage) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)";
                }
              }}
            >
              {page}
            </button>
          )
        )}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isNextDisabled}
          title="Halaman berikutnya"
          style={{
            padding: "0.45rem 1rem",
            borderRadius: "100px",
            border: "none",
            cursor: isNextDisabled ? "not-allowed" : "pointer",
            background: isNextDisabled ? "rgba(255,255,255,0.08)" : "#0874aa",
            color: isNextDisabled ? "rgba(255,255,255,0.35)" : "#ffffff",
            fontWeight: 600,
            fontSize: "0.85rem",
            fontFamily: "'Inter', 'PT Sans', sans-serif",
            transition: "background 0.15s, transform 0.1s",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            whiteSpace: "nowrap",
            lineHeight: 1,
            boxShadow: isNextDisabled ? "none" : "0 2px 6px rgba(8,116,170,0.35)",
          }}
          onMouseEnter={(e) => {
            if (!isNextDisabled) {
              (e.currentTarget as HTMLButtonElement).style.background = "#065f8d";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = isNextDisabled
              ? "rgba(255,255,255,0.08)"
              : "#0874aa";
          }}
        >
          Next
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
