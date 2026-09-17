-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "receiptNumberFormat" TEXT NOT NULL DEFAULT '{prefix}-{fy}-{seq}',
ADD COLUMN     "receiptPrefix" TEXT NOT NULL DEFAULT 'RCPT';

-- CreateTable
CREATE TABLE "ReceiptTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "layout" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptNumberCounter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptNumberCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptTemplate_organizationId_idx" ON "ReceiptTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "ReceiptTemplate_status_idx" ON "ReceiptTemplate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptTemplateVersion_templateId_versionNumber_key" ON "ReceiptTemplateVersion"("templateId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptNumberCounter_organizationId_prefix_financialYear_key" ON "ReceiptNumberCounter"("organizationId", "prefix", "financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_paymentId_key" ON "Receipt"("paymentId");

-- CreateIndex
CREATE INDEX "Receipt_organizationId_idx" ON "Receipt"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_organizationId_receiptNumber_key" ON "Receipt"("organizationId", "receiptNumber");

-- AddForeignKey
ALTER TABLE "ReceiptTemplate" ADD CONSTRAINT "ReceiptTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptTemplate" ADD CONSTRAINT "ReceiptTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptTemplateVersion" ADD CONSTRAINT "ReceiptTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReceiptTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptTemplateVersion" ADD CONSTRAINT "ReceiptTemplateVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptNumberCounter" ADD CONSTRAINT "ReceiptNumberCounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReceiptTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "ReceiptTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

