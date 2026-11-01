-- AlterTable
ALTER TABLE "User" ADD COLUMN     "payhereSubscriptionId" TEXT,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "planInterval" TEXT,
ADD COLUMN     "planStatus" TEXT,
ADD COLUMN     "proTrialEndsAt" TIMESTAMPTZ,
ADD COLUMN     "proUntil" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "weddingId" UUID,
    "interval" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payherePaymentId" TEXT,
    "subscriptionId" TEXT,
    "parentOrderId" UUID,
    "paidAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_payherePaymentId_key" ON "Order"("payherePaymentId");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_payhereSubscriptionId_key" ON "User"("payhereSubscriptionId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Planners already on the site get 60 days of Pro from launch
UPDATE "User" SET "proTrialEndsAt" = NOW() + INTERVAL '60 days'
WHERE "role" IN ('planner', 'vendor', 'pro') AND "proTrialEndsAt" IS NULL;
