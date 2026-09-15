import crypto from "node:crypto";
import argon2 from "argon2";

// "inv_live_xxxxxxxxx" per AGENTS.md §API authentication.
export const API_KEY_PREFIX = "inv_live_";

// How much of the plaintext secret is stored unhashed as a DB lookup key
// (ApiKey.prefix) — long enough that a `WHERE prefix = ...` query narrows to
// effectively one row without scanning every active key, short enough that
// it leaks negligible entropy toward guessing the rest of the secret. Shown
// in the UI for key identification, matching the schema comment's example
// ("inv_live_ab12").
const PREFIX_LOOKUP_LENGTH = API_KEY_PREFIX.length + 8;

export function generateApiKeySecret(): { plaintext: string; prefix: string } {
  const random = crypto.randomBytes(24).toString("base64url");
  const plaintext = `${API_KEY_PREFIX}${random}`;
  const prefix = plaintext.slice(0, PREFIX_LOOKUP_LENGTH);
  return { plaintext, prefix };
}

export function lookupPrefix(token: string): string {
  return token.slice(0, PREFIX_LOOKUP_LENGTH);
}

// Same argon2id hashing as user passwords (lib/auth/auth.ts) — the
// plaintext secret is returned to the caller exactly once, at creation
// time, and never stored or logged anywhere.
export function hashApiKeySecret(plaintext: string): Promise<string> {
  return argon2.hash(plaintext);
}

export function verifyApiKeySecret(hash: string, plaintext: string): Promise<boolean> {
  return argon2.verify(hash, plaintext);
}
