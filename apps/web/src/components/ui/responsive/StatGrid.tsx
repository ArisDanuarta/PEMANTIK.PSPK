import React from "react";

type StatGridProps = {
  columns?: { base?: number; md?: number; lg?: number };
  children: React.ReactNode;
  className?: string;
};

const getColClass = (cols?: number, prefix: string = "") => {
  if (!cols) return "";
  const gridClasses: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };
  const cls = gridClasses[cols] || "grid-cols-1";
  return prefix ? `${prefix}:${cls}` : cls;
};

export function StatGrid({
  columns = { base: 1, md: 2, lg: 4 },
  children,
  className = "",
}: StatGridProps) {
  const baseCols = getColClass(columns.base);
  const mdCols = getColClass(columns.md, "md");
  const lgCols = getColClass(columns.lg, "lg");

  return (
    <div className={`grid ${baseCols} ${mdCols} ${lgCols} gap-4 mb-6 ${className}`}>
      {children}
    </div>
  );
}
