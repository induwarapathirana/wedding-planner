-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calendarToken" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "guestCount" INTEGER,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "nextFollowUp" DATE,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "stageChangedAt" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "PlannerTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plannerId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannerTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannerTemplate_plannerId_kind_idx" ON "PlannerTemplate"("plannerId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "User_calendarToken_key" ON "User"("calendarToken");

-- AddForeignKey
ALTER TABLE "PlannerTemplate" ADD CONSTRAINT "PlannerTemplate_plannerId_fkey" FOREIGN KEY ("plannerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
