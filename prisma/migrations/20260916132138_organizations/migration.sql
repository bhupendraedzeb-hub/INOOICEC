-- Multi-tenant organizations retrofit.
--
-- This is the first migration in this project that backfills a NOT NULL
-- column onto already-populated tables (every prior migration added new
-- tables or nullable/defaulted columns onto empty ones), so it's hand
-- written rather than plain `prisma migrate dev` output: add every
-- organizationId column as nullable, create one legacy Organization to
-- house all pre-existing data, backfill, THEN lock to NOT NULL and add
-- the real constraints/indexes.

-- Organization must exist before anything can reference it.
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- Add organizationId as NULLABLE first on every existing table.
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Product" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Template" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "InvoiceNumberCounter" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "PaymentLink" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "WebhookEndpoint" ADD COLUMN "organizationId" TEXT;

-- Payment.updatedAt no longer needs a DB-level default (Prisma's
-- @updatedAt sets it client-side on every write) — unrelated schema drift
-- surfaced by the same diff, folded in here rather than a separate migration.
ALTER TABLE "Payment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Dedup CompanySettings before relying on a one-row-per-org invariant:
-- this table has never had a DB constraint preventing more than one row
-- (see src/lib/services/companySettings.ts's findFirst() comment) — keep
-- the most-recently-updated row if more than one somehow exists.
DELETE FROM "CompanySettings"
WHERE "id" NOT IN (
  SELECT "id" FROM "CompanySettings" ORDER BY "updatedAt" DESC LIMIT 1
);

-- One legacy Organization houses all pre-existing data, named after the
-- surviving CompanySettings row if one exists, else a literal fallback.
DO $$
DECLARE
  legacy_org_id TEXT := gen_random_uuid()::text;
  legacy_org_name TEXT;
BEGIN
  SELECT "name" INTO legacy_org_name FROM "CompanySettings" LIMIT 1;
  IF legacy_org_name IS NULL THEN
    legacy_org_name := 'Default Organization';
  END IF;

  INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
  VALUES (legacy_org_id, legacy_org_name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

  UPDATE "User" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "CompanySettings" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "AuditLog" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "Customer" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "Product" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "Template" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "ApiKey" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "InvoiceNumberCounter" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "Invoice" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "Payment" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "PaymentLink" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
  UPDATE "WebhookEndpoint" SET "organizationId" = legacy_org_id WHERE "organizationId" IS NULL;
END $$;

-- Lock every backfilled column to NOT NULL now that every row has a value.
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "CompanySettings" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Template" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ApiKey" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "InvoiceNumberCounter" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "PaymentLink" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "WebhookEndpoint" ALTER COLUMN "organizationId" SET NOT NULL;

-- Drop the old global-uniqueness constraints these columns are replacing.
DROP INDEX "Invoice_invoiceNumber_key";
DROP INDEX "InvoiceNumberCounter_prefix_financialYear_key";

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_organizationId_key" ON "CompanySettings"("organizationId");

-- CreateIndex
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_idx" ON "Invoice"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_organizationId_invoiceNumber_key" ON "Invoice"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceNumberCounter_organizationId_prefix_financialYear_key" ON "InvoiceNumberCounter"("organizationId", "prefix", "financialYear");

-- CreateIndex
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");

-- CreateIndex
CREATE INDEX "PaymentLink_organizationId_idx" ON "PaymentLink"("organizationId");

-- CreateIndex
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");

-- CreateIndex
CREATE INDEX "Template_organizationId_idx" ON "Template"("organizationId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_organizationId_idx" ON "WebhookEndpoint"("organizationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceNumberCounter" ADD CONSTRAINT "InvoiceNumberCounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
