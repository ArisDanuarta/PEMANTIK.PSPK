import React from "react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = "Tidak ada data",
  className = "",
}: TableProps<T>) {
  if (loading) {
    return (
      <div className={`table-skeleton ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="table-skeleton-row" />
        ))}
      </div>
    );
  }

  return (
    <div className={`table-wrapper ${className}`}>
      <table className="pemantik-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className={col.className}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => {
                  const value = (row as Record<string, unknown>)[
                    String(col.key)
                  ];
                  return (
                    <td key={String(col.key)} className={col.className}>
                      {col.render ? col.render(value, row) : String(value ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
