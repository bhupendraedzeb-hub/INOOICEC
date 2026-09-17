import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

type WriteAuditEventInput = {
  // actorId is nullable (the inbound gateway webhook receiver has no
  // session actor) so organizationId can't be derived from it — every
  // call site passes it explicitly, sourced from the entity being acted on.
  organizationId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditEvent(input: WriteAuditEventInput) {
  try {
    await db.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    // Audit logging must never take down the request it's attached to, but a
    // failure here is itself significant for a financial system — log loudly.
    logger.error({ err, ...input }, "failed to write audit log entry");
  }
}
