-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifySentAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifyToken" TEXT;
