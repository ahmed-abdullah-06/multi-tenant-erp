-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "diff" JSONB;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1.000000;

-- AlterTable
ALTER TABLE "JournalLine" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "exchangeRate" DECIMAL(18,6) DEFAULT 1.000000;
