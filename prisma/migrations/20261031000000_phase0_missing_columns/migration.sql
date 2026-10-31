-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN     "whatsappBusinessNumber" TEXT;

-- AlterTable
ALTER TABLE "BudgetItem" ADD COLUMN     "unitPrice" DECIMAL(65,30),
ADD COLUMN     "units" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'B',
ADD COLUMN     "whatsappNumber" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "priceEstimate" DECIMAL(65,30),
ADD COLUMN     "pricingType" TEXT,
ADD COLUMN     "pricingUnit" TEXT,
ALTER COLUMN "status" SET DEFAULT 'researching';

-- AlterTable
ALTER TABLE "DirectoryVendor" ADD COLUMN     "priceEstimate" DECIMAL(65,30),
ADD COLUMN     "pricingType" TEXT,
ADD COLUMN     "pricingUnit" TEXT;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "link" TEXT;


-- Data fix: the vendor UI only knows researching/contacted/hired/declined
UPDATE "Vendor" SET "status" = 'researching' WHERE "status" = 'pending';
UPDATE "Vendor" SET "status" = 'hired' WHERE "status" IN ('booked', 'paid');
