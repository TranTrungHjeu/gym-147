-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "recipients" TEXT[],
    "filters" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_reports_is_active_idx" ON "scheduled_reports"("is_active");

-- CreateIndex
CREATE INDEX "scheduled_reports_next_run_at_idx" ON "scheduled_reports"("next_run_at");

-- CreateIndex
CREATE INDEX "scheduled_reports_created_at_idx" ON "scheduled_reports"("created_at");

