import React from "react";

type StatGridProps = {
  columns?: { base?: number; md?: number; lg?: number };
  children: React.ReactNode;
  className?: string;
};

const getColClass = (cols?: number, prefix: string = "") => {
  if (!cols) return "";
  if (prefix === "md") {
    const mdClasses: Record<number, string> = {
      1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4", 5: "md:grid-cols-5", 6: "md:grid-cols-6",
    };
    return mdClasses[cols] || "md:grid-cols-1";
  }
  if (prefix === "lg") {
    const lgClasses: Record<number, string> = {
      1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6",
    };
    return lgClasses[cols] || "lg:grid-cols-1";
  }
  const baseClasses: Record<number, string> = {
    1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6",
  };
  return baseClasses[cols] || "grid-cols-1";
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
