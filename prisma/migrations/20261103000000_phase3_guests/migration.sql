-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN     "dayOfToken" TEXT;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "attendingCount" INTEGER,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "remindedAt" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "SeatingTable" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "weddingId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatingTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeatingTable_weddingId_name_key" ON "SeatingTable"("weddingId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_dayOfToken_key" ON "Wedding"("dayOfToken");

-- AddForeignKey
ALTER TABLE "SeatingTable" ADD CONSTRAINT "SeatingTable_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tables already typed on guests become seating tables
INSERT INTO "SeatingTable" ("weddingId", "name", "sortOrder")
SELECT "weddingId", "name", (ROW_NUMBER() OVER (PARTITION BY "weddingId" ORDER BY "name") - 1)::int
FROM (SELECT DISTINCT "weddingId", TRIM("tableAssignment") AS "name" FROM "Guest" WHERE TRIM(COALESCE("tableAssignment", '')) <> '') t
ON CONFLICT DO NOTHING;
