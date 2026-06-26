import React from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>{children}</span>
  );
}

// ─── Status Badge for Assessment Status ───────────────────────────────────────

const statusMap = {
  not_started: { label: "Belum Ujian", variant: "default" as BadgeVariant },
  ready: { label: "Siap Ujian", variant: "primary" as BadgeVariant },
  in_progress: { label: "Sedang Ujian", variant: "warning" as BadgeVariant },
  completed: { label: "Selesai", variant: "success" as BadgeVariant },
  draft: { label: "Draft", variant: "default" as BadgeVariant },
  review: { label: "Review", variant: "warning" as BadgeVariant },
  published: { label: "Published", variant: "success" as BadgeVariant },
  archived: { label: "Arsip", variant: "info" as BadgeVariant },
};

interface StatusBadgeProps {
  status: keyof typeof statusMap;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, variant } = statusMap[status] ?? {
    label: status,
    variant: "default" as BadgeVariant,
  };
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

// ─── SES Badge for Socio-Economic Status ──────────────────────────────────────

export function SesBadge({ sesClass, className }: { sesClass?: string | null; className?: string }) {
  if (!sesClass) {
    return <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>Belum Dihitung</span>;
  }

  const normalized = sesClass.toLowerCase().trim();
  let variant: BadgeVariant = "default";

  if (normalized.includes("menengah_atas") || normalized.includes("menengah atas")) {
    variant = "primary"; // Blue
  } else if (normalized.includes("menengah_bawah") || normalized.includes("menengah bawah")) {
    variant = "warning"; // Yellow
  } else if (normalized.includes("atas")) {
    variant = "success"; // Green
  } else if (normalized.includes("bawah")) {
    variant = "danger"; // Red
  }

  const label = `SES ${sesClass.replace(/_/g, ' ').toUpperCase()}`;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

