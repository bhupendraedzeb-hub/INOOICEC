import { db } from "@/lib/db";
import { generateApiKeySecret, hashApiKeySecret } from "@/lib/auth/apiKeyAuth";
import type { CreateApiKeyInput } from "@/lib/validation/schemas/apiKey";

export async function listApiKeys() {
  return db.apiKey.findMany({
    select: {
      id: true,
      label: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApiKey(id: string) {
  return db.apiKey.findUnique({ where: { id } });
}

// The plaintext secret is generated, hashed, and returned here — this is
// the only place it ever exists outside the caller's own memory. It is not
// stored (only its argon2 hash is) and this function is never called again
// for the same key, so losing the plaintext means generating a new key.
// The returned object deliberately omits `hashedKey` — even though it's a
// hash, not the secret itself, there's no reason for it to ever leave the
// DB, including in this one-time creation response.
export async function createApiKey(input: CreateApiKeyInput, actorId: string) {
  const { plaintext, prefix } = generateApiKeySecret();
  const hashedKey = await hashApiKeySecret(plaintext);

  const key = await db.apiKey.create({
    data: { label: input.label, scopes: input.scopes, prefix, hashedKey, createdById: actorId },
    select: { id: true, label: true, prefix: true, scopes: true, createdAt: true, createdById: true },
  });

  return { ...key, plaintext };
}

export async function revokeApiKey(id: string) {
  return db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
}
