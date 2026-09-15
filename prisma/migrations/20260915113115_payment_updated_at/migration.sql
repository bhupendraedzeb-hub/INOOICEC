-- AlterTable
-- DEFAULT CURRENT_TIMESTAMP backfills existing rows (this column is added
-- to an already-populated table, unlike every other @updatedAt field in
-- this schema, which existed since their table's creation).
ALTER TABLE "Payment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
