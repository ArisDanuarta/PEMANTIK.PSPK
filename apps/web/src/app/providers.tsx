"use client";

/**
 * AppProviders - Client Component wrapper untuk semua global providers.
 * Digunakan di root layout (Server Component) agar providers bisa pakai hooks
 * tanpa membuat layout.tsx menjadi Client Component.
 */
import { ToastProvider } from "@pemantik/ui";
import { ConfirmProvider } from "@pemantik/ui";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
