-- CreateEnum
CREATE TYPE "BankTransferStatus" AS ENUM ('PENDING', 'CHECKING', 'VERIFIED', 'COMPLETED', 'EXPIRED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "bank_transfers" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "transfer_content" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "BankTransferStatus" NOT NULL DEFAULT 'PENDING',
    "bank_name" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "qr_code_url" TEXT,
    "qr_data" TEXT,
    "sepay_account_id" TEXT,
    "sepay_transaction_id" TEXT,
    "sepay_webhook_data" JSONB,
    "verified_at" TIMESTAMP(3),
    "verified_amount" DECIMAL(10,2),
    "verified_content" TEXT,
    "bank_transaction_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfers_payment_id_key" ON "bank_transfers"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfers_sepay_transaction_id_key" ON "bank_transfers"("sepay_transaction_id");

-- CreateIndex
CREATE INDEX "bank_transfers_member_id_idx" ON "bank_transfers"("member_id");

-- CreateIndex
CREATE INDEX "bank_transfers_status_idx" ON "bank_transfers"("status");

-- CreateIndex
CREATE INDEX "bank_transfers_sepay_transaction_id_idx" ON "bank_transfers"("sepay_transaction_id");

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
