"use client";

import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  name: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function SearchableSelect({ 
  options, 
  name, 
  required = false, 
  value, 
  onChange, 
  placeholder = "Pilih..." 
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);
  const filteredOptions = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Hidden input to hold the actual value for the form submission */}
      <input type="hidden" name={name} value={value || ""} required={required} />
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem",
          cursor: "pointer", backgroundColor: "#fff", minHeight: "38px", width: "100%"
        }}
      >
        <span style={{ color: selectedOption ? "inherit" : "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginLeft: "0.5rem" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, 
          marginTop: "0.25rem", backgroundColor: "#fff", border: "1px solid #e5e7eb",
          borderRadius: "0.375rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          zIndex: 50, maxHeight: "250px", display: "flex", flexDirection: "column"
        }}>
          <div style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <input 
              type="text" 
              placeholder="Cari..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", padding: "0.25rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem", fontSize: "0.85rem", outline: "none" }}
              autoFocus
            />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  style={{
                    padding: "0.5rem 0.75rem", cursor: "pointer", fontSize: "0.85rem",
                    backgroundColor: value === opt.value ? "#f3f4f6" : "transparent",
                    transition: "background-color 0.15s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = value === opt.value ? "#f3f4f6" : "transparent")}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div style={{ padding: "0.75rem", textAlign: "center", color: "#6b7280", fontSize: "0.85rem" }}>
                Tidak ada data ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
