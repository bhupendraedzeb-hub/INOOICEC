import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

type WriteAuditEventInput = {
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
