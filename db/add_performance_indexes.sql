-- Indexes for the per-wedding lookups every dashboard page makes.
-- Names match Prisma's convention, so `prisma db push` treats them as already applied.

CREATE INDEX IF NOT EXISTS "Wedding_createdById_idx" ON "Wedding" ("createdById");
CREATE INDEX IF NOT EXISTS "Collaborator_userId_idx" ON "Collaborator" ("userId");
CREATE INDEX IF NOT EXISTS "BudgetItem_weddingId_category_idx" ON "BudgetItem" ("weddingId", "category");
CREATE INDEX IF NOT EXISTS "Guest_weddingId_rsvpStatus_idx" ON "Guest" ("weddingId", "rsvpStatus");
CREATE INDEX IF NOT EXISTS "ChecklistItem_weddingId_isCompleted_dueDate_idx" ON "ChecklistItem" ("weddingId", "isCompleted", "dueDate");
CREATE INDEX IF NOT EXISTS "Vendor_weddingId_category_idx" ON "Vendor" ("weddingId", "category");
CREATE INDEX IF NOT EXISTS "DirectoryVendor_userId_idx" ON "DirectoryVendor" ("userId");
CREATE INDEX IF NOT EXISTS "InventoryItem_weddingId_idx" ON "InventoryItem" ("weddingId");
CREATE INDEX IF NOT EXISTS "Event_weddingId_startTime_idx" ON "Event" ("weddingId", "startTime");
CREATE INDEX IF NOT EXISTS "Invitation_weddingId_idx" ON "Invitation" ("weddingId");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription" ("userId");
CREATE INDEX IF NOT EXISTS "Client_plannerId_idx" ON "Client" ("plannerId");
