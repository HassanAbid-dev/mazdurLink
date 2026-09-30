/*
  Warnings:

  - You are about to drop the column `channel` on the `OtpToken` table. All the data in the column will be lost.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserStatus" ADD VALUE 'UNVERIFIED';
ALTER TYPE "UserStatus" ADD VALUE 'DISABLED';

-- AlterTable
ALTER TABLE "OtpToken" DROP COLUMN "channel";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "otpBlockedUntil" TIMESTAMP(3),
ADD COLUMN     "otpFailedRounds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'UNVERIFIED';

-- DropEnum
DROP TYPE "OtpChannel";
