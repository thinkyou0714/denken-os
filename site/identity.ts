import { digest } from "./db.js";
import type { Env } from "./environment.js";

export async function authenticatedIdentity(request: Request, env: Env) {
  const id = request.headers.get("oai-authenticated-user-id")?.trim();
  if (id) return { id, method: "platform-id" as const };

  // Some dispatch sessions forward a verified email without a stable ID.
  // Compatibility is pinned to the independently confirmed, existing private-Site owner.
  // Never create an account or infer membership from an arbitrary email/name.
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const pinnedId = env.DENKEN_OWNER_FALLBACK_ID;
  const pinnedHash = env.DENKEN_OWNER_FALLBACK_EMAIL_SHA256;
  if (!email || !pinnedId || !pinnedHash || (await digest(email)) !== pinnedHash) return null;
  const owner = await env.DB.prepare("SELECT id FROM members WHERE id=? AND role='owner' AND status='active'")
    .bind(pinnedId)
    .first<{ id: string }>();
  return owner ? { id: owner.id, method: "owner-compatibility" as const } : null;
}
