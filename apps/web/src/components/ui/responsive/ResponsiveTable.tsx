"use client";

import React, { useEffect, useState } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T, index: number) => React.ReactNode;
  hideBelow?: "md" | "lg";
  priority?: number;
};

export type ResponsiveTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  mode?: "scroll" | "card"; // Default: scroll (fallback on small screens)
  emptyState?: React.ReactNode;
};

export function ResponsiveTable<T>({
  columns,
  data,
  keyField,
  mode = "scroll",
  emptyState,
}: ResponsiveTableProps<T>) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const listener = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    listener(media);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  if (!data || data.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className="empty-state bg-white rounded-lg border border-gray-200">
        <div className="empty-state-title">Tidak ada data</div>
      </div>
    );
  }

  // Card mode for mobile
  if (isMobile && mode === "card") {
    // Sort columns by priority if specified (higher priority number comes first, default to 0 if undefined)
    const sortedColumns = [...columns].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return (
      <div className="flex flex-col gap-4">
        {data.map((row, index) => (
          <div key={String(row[keyField] || index)} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
            {sortedColumns.map((col) => {
              if (col.hideBelow === "md") return null;
              return (
                <div key={col.key} className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{col.header}</span>
                  <div className="text-sm text-gray-900 mt-1">{col.render(row, index)}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // Scroll mode (default for desktop/tablet, and optionally for mobile)
  return (
    <div className="table-wrapper w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="pemantik-table w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => {
              const hiddenClass = col.hideBelow === "lg" ? "max-lg:hidden" : col.hideBelow === "md" ? "max-md:hidden" : "";
              return (
                <th key={col.key} className={`bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider p-3 text-left border-b border-gray-200 whitespace-nowrap ${hiddenClass}`}>
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={String(row[keyField] || index)} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => {
                const hiddenClass = col.hideBelow === "lg" ? "max-lg:hidden" : col.hideBelow === "md" ? "max-md:hidden" : "";
                return (
                  <td key={col.key} className={`p-3 border-b border-gray-100 text-gray-800 align-middle ${hiddenClass}`}>
                    {col.render(row, index)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
