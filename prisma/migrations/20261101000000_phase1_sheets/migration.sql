-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "address" TEXT,
ADD COLUMN     "inviteStatus" TEXT NOT NULL DEFAULT 'not_sent',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "side" TEXT;

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "dueOffsetDays" INTEGER;

-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "weddingId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "allocated" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCategory_weddingId_name_key" ON "BudgetCategory"("weddingId", "name");

-- AddForeignKey
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: infer each household's side from its group ("Bride Family" → bride)
UPDATE "Guest" SET "side" = 'bride' WHERE "side" IS NULL AND "groupCategory" ILIKE 'bride%';
UPDATE "Guest" SET "side" = 'groom' WHERE "side" IS NULL AND "groupCategory" ILIKE 'groom%';
UPDATE "Guest" SET "side" = 'both' WHERE "side" IS NULL AND "groupCategory" ILIKE 'mutual%';

-- Backfill: one category row per category already used by budget items
INSERT INTO "BudgetCategory" ("weddingId", "name")
SELECT DISTINCT "weddingId", "category" FROM "BudgetItem"
ON CONFLICT ("weddingId", "name") DO NOTHING;
