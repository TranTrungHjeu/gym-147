-- AlterTable
ALTER TABLE "equipment_usage" ADD COLUMN     "session_id" TEXT;

-- AddForeignKey
ALTER TABLE "equipment_usage" ADD CONSTRAINT "equipment_usage_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "gym_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
