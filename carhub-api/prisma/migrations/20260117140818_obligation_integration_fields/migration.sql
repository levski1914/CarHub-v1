-- AlterTable
ALTER TABLE "Obligation" ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';
