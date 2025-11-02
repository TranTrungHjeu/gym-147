-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'NOTIFIED', 'EXPIRED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('BROKEN', 'DAMAGED', 'DIRTY', 'MISSING_PARTS', 'UNSAFE', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateTable
CREATE TABLE "equipment_queue" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMP(3),
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_issue_reports" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "issue_type" "IssueType" NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "images" TEXT[],
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_issue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_queue_equipment_id_position_idx" ON "equipment_queue"("equipment_id", "position");

-- CreateIndex
CREATE INDEX "equipment_queue_member_id_idx" ON "equipment_queue"("member_id");

-- CreateIndex
CREATE INDEX "equipment_queue_status_idx" ON "equipment_queue"("status");

-- CreateIndex
CREATE INDEX "equipment_issue_reports_equipment_id_idx" ON "equipment_issue_reports"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_issue_reports_member_id_idx" ON "equipment_issue_reports"("member_id");

-- CreateIndex
CREATE INDEX "equipment_issue_reports_status_idx" ON "equipment_issue_reports"("status");

-- AddForeignKey
ALTER TABLE "equipment_queue" ADD CONSTRAINT "equipment_queue_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_queue" ADD CONSTRAINT "equipment_queue_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_issue_reports" ADD CONSTRAINT "equipment_issue_reports_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_issue_reports" ADD CONSTRAINT "equipment_issue_reports_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
