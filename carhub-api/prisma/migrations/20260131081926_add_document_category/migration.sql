/*
  Warnings:

  - A unique constraint covering the columns `[vehicleId,type]` on the table `Obligation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('GO', 'GTP', 'VIGNETTE', 'TAX', 'CREDIT', 'SERVICE', 'OTHER');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE UNIQUE INDEX "Obligation_vehicleId_type_key" ON "Obligation"("vehicleId", "type");
