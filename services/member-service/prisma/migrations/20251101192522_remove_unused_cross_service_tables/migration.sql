/*
  Warnings:

  - You are about to drop the `bookings_ref` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments_ref` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscriptions_ref` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookings_ref" DROP CONSTRAINT "bookings_ref_member_id_fkey";

-- DropForeignKey
ALTER TABLE "payments_ref" DROP CONSTRAINT "payments_ref_member_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions_ref" DROP CONSTRAINT "subscriptions_ref_member_id_fkey";

-- DropTable
DROP TABLE "bookings_ref";

-- DropTable
DROP TABLE "payments_ref";

-- DropTable
DROP TABLE "subscriptions_ref";
