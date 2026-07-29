/*
  Warnings:

  - You are about to drop the `lead_vendors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `resources` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "resources" DROP CONSTRAINT "resources_uploadedById_fkey";

-- DropTable
DROP TABLE "lead_vendors";

-- DropTable
DROP TABLE "resources";
