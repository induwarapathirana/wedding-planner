-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN     "calendarToken" TEXT;

-- AlterTable
ALTER TABLE "BudgetItem" ADD COLUMN     "vendorId" UUID;

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "assignee" TEXT,
ADD COLUMN     "vendorId" UUID;

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "weddingId" UUID NOT NULL,
    "budgetItemId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dueDate" DATE,
    "paidAt" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_weddingId_paidAt_dueDate_idx" ON "Payment"("weddingId", "paidAt", "dueDate");

-- CreateIndex
CREATE INDEX "Payment_budgetItemId_idx" ON "Payment"("budgetItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_calendarToken_key" ON "Wedding"("calendarToken");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetItem_vendorId_key" ON "BudgetItem"("vendorId");

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

