/// <reference path="./phantom-ui.d.ts" />
// ─── Shared UI Components — Pemantik Platform ────────────────────────────────
// All exports from the shared UI package

export { PhantomSkeleton } from "./Skeleton/PhantomSkeleton";
export { Button } from "./Button/Button";
export { Table } from "./Table/Table";
export { Modal } from "./Modal/Modal";
export { Badge, SesBadge, StatusBadge } from "./Badge/Badge";

// ── Global feedback components ───────────────────────────────────────────────
export { ToastProvider, useToast } from "./toast";
export type { Toast, ToastType } from "./toast";

export { ConfirmProvider, useConfirm } from "./confirm-dialog";
export type { ConfirmOptions, ConfirmVariant } from "./confirm-dialog";
