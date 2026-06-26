import { redirect } from "next/navigation";

/**
 * Root page — redirects to login.
 * Actual role-based redirect is handled by middleware after auth.
 */
export default function RootPage() {
  redirect("/login");
}
