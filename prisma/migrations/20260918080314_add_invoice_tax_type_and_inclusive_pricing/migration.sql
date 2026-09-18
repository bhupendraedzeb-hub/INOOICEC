-- CreateEnum
CREATE TYPE "TaxTypeOverride" AS ENUM ('AUTO', 'FORCE_IGST', 'FORCE_CGST_SGST');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxType" "TaxTypeOverride" NOT NULL DEFAULT 'AUTO';
