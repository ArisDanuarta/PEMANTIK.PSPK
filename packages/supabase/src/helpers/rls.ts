// ─── Supabase RLS Helpers ─────────────────────────────────────────────────────

/**
 * Extract entity_id from JWT payload for RLS filtering.
 * Server-side only - use in Server Components and Route Handlers.
 */
export function getEntityIdFromJWT(accessToken: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString()
    );
    return payload.entity_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Extract role from JWT payload.
 */
export function getRoleFromJWT(
  accessToken: string
): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString()
    );
    return payload.role ?? null;
  } catch {
    return null;
  }
}
