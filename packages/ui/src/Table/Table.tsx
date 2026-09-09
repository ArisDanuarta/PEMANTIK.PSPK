"use client";

import React, { useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc" | null;

export interface ColumnDef<T> {
  /** Unique key – used as React key and to read `row[key]` */
  key: keyof T | string;
  /** Column header label */
  label: string;
  /** Custom cell renderer. Falls back to `String(value)` */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Extra CSS class on `<th>` and `<td>` */
  className?: string;
  /** Column width hint (CSS value, e.g. "120px", "10%") */
  width?: string;
  /** Allow sorting on this column. Sorting is client-side only. */
  sortable?: boolean;
  /** Text align for this column */
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T extends { id: string }> {
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Row data */
  data: T[];
  /** Show skeleton shimmer rows instead of data */
  loading?: boolean;
  /** Number of skeleton rows to show when `loading` is true */
  skeletonRows?: number;
  /** Message / node shown when `data` is empty */
  emptyMessage?: React.ReactNode;
  /** Extra CSS class on the root wrapper */
  className?: string;
  /** Compact padding mode */
  size?: "default" | "sm";
  /** Enable zebra-striping on tbody rows */
  striped?: boolean;
  /** Callback when a data row is clicked */
  onRowClick?: (row: T) => void;
  /** `min-width` CSS for the inner `<table>` – overrides the CSS default */
  minWidth?: string;
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: SortDirection }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        marginLeft: "0.5rem",
        verticalAlign: "middle",
        lineHeight: 1,
        opacity: dir ? 1 : 0.4,
        color: dir ? "var(--color-primary, #0874aa)" : "currentColor",
        transform: "translateY(-2px)",
      }}
    >
      {dir === "desc" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      ) : dir === "asc" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 15l5 5 5-5" />
          <path d="M7 9l5-5 5 5" />
        </svg>
      )}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} style={{ padding: "0.875rem 1rem" }}>
              <div
                className="table-skeleton-row"
                style={{
                  height: "16px",
                  borderRadius: "4px",
                  width: ci === 0 ? "70%" : ci % 2 === 0 ? "50%" : "85%",
                  marginBottom: 0,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  cols,
  message,
}: {
  cols: number;
  message: React.ReactNode;
}) {
  return (
    <tbody>
      <tr>
        <td colSpan={cols}>
          <div className="dt-empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#ced4da", flexShrink: 0 }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span>{message}</span>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  skeletonRows = 5,
  emptyMessage = "Tidak ada data",
  className = "",
  size = "default",
  striped = false,
  onRowClick,
  minWidth,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir(null);
      }
    },
    [sortKey, sortDir]
  );

  // Client-side sort
  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      const as = av == null ? "" : String(av).toLowerCase();
      const bs = bv == null ? "" : String(bv).toLowerCase();
      if (as < bs) return sortDir === "asc" ? -1 : 1;
      if (as > bs) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const sizeClass = size === "sm" ? "dt-sm" : "";
  const stripedClass = striped ? "dt-striped" : "";
  const clickableClass = onRowClick ? "dt-clickable-rows" : "";

  return (
    <div className={`dt-wrapper ${className}`}>
      <div
        className="dt-scroll-container"
        style={minWidth ? { minWidth } : undefined}
      >
        <table
          className={`pemantik-table dt-table ${sizeClass} ${stripedClass} ${clickableClass}`}
          style={minWidth ? { minWidth } : undefined}
        >
          <thead className="dt-thead">
            <tr>
              {columns.map((col) => {
                const isActive = sortKey === String(col.key);
                return (
                  <th
                    key={String(col.key)}
                    className={`${col.className ?? ""} ${col.sortable ? "dt-sortable-th" : ""}`}
                    style={{
                      width: col.width,
                      textAlign: col.align ?? "left",
                      cursor: col.sortable ? "pointer" : undefined,
                      userSelect: col.sortable ? "none" : undefined,
                    }}
                    onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                    aria-sort={
                      isActive
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {col.label}
                    {col.sortable && (
                      <SortIcon dir={isActive ? sortDir : null} />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {loading ? (
            <TableSkeleton rows={skeletonRows} cols={columns.length} />
          ) : sortedData.length === 0 ? (
            <EmptyState cols={columns.length} message={emptyMessage} />
          ) : (
            <tbody>
              {sortedData.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: "pointer" } : undefined}
                >
                  {columns.map((col) => {
                    const value = (row as Record<string, unknown>)[
                      String(col.key)
                    ];
                    return (
                      <td
                        key={String(col.key)}
                        className={col.className}
                        style={{ textAlign: col.align ?? "left" }}
                      >
                        {col.render
                          ? col.render(value, row, rowIndex)
                          : value == null
                          ? "—"
                          : String(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}

// ─── Legacy shim – keeps `<Table>` working for existing consumers ─────────────
interface LegacyColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface LegacyTableProps<T extends { id: string }> {
  columns: LegacyColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T extends { id: string }>(props: LegacyTableProps<T>) {
  const columns: ColumnDef<T>[] = props.columns.map((c) => ({
    key: c.key,
    label: c.label,
    render: c.render
      ? (v: unknown, row: T) => (c.render as (v: unknown, r: T) => React.ReactNode)(v, row)
      : undefined,
    className: c.className,
  }));
  return (
    <DataTable
      columns={columns}
      data={props.data}
      loading={props.loading}
      emptyMessage={props.emptyMessage}
      className={props.className}
    />
  );
}
