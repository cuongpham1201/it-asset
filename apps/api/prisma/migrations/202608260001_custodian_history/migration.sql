-- Asset history records who *held* the asset, not only who could log in.
--
-- Until now the only structured custodian reference was fromUserId/toUserId, which is set
-- solely when the person happens to have a system account. Most people holding IT assets do
-- not, so their name survived only inside the free-text description and could not be queried,
-- filtered or reported on. These columns fix that. The old columns are kept untouched so
-- existing readers keep working.

ALTER TABLE "asset_history" ADD COLUMN "fromCustodianId" UUID;
ALTER TABLE "asset_history" ADD COLUMN "toCustodianId" UUID;

ALTER TABLE "asset_history"
  ADD CONSTRAINT "asset_history_fromCustodianId_fkey"
  FOREIGN KEY ("fromCustodianId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "asset_history"
  ADD CONSTRAINT "asset_history_toCustodianId_fkey"
  FOREIGN KEY ("toCustodianId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "asset_history_fromCustodianId_idx" ON "asset_history"("fromCustodianId");
CREATE INDEX "asset_history_toCustodianId_idx" ON "asset_history"("toCustodianId");

-- Backfill from the transaction each history row already points at. Only relationships that
-- are certain are filled; anything ambiguous is deliberately left NULL rather than guessed.
-- The description text is never parsed.
--
-- asset_history is append-only by trigger, so the trigger is suspended for the duration of
-- this one-off migration and restored immediately afterwards.
ALTER TABLE "asset_history" DISABLE TRIGGER "asset_history_append_only";

-- Handover: the assignment names the person who received the asset.
UPDATE "asset_history" AS h
SET "toCustodianId" = a."assignedToId"
FROM "asset_assignments" AS a
WHERE h."referenceType" = 'AssetAssignment'
  AND h."referenceId" = a."id"
  AND h."action" = 'ASSIGNED'
  AND h."toCustodianId" IS NULL;

-- Return: the closed assignment names the person who gave the asset back.
UPDATE "asset_history" AS h
SET "fromCustodianId" = a."assignedToId"
FROM "asset_returns" AS r
JOIN "asset_assignments" AS a ON a."id" = r."assignmentId"
WHERE h."referenceType" = 'AssetReturn'
  AND h."referenceId" = r."id"
  AND h."action" = 'RETURNED'
  AND h."fromCustodianId" IS NULL;

-- Transfer moves an asset between places; the holder does not change. Both sides are set to
-- the same person so the timeline can state plainly that custody was unaffected. The holder
-- is resolved from the assignment that was open at that moment, which the state machine
-- guarantees to be at most one.
UPDATE "asset_history" AS h
SET "fromCustodianId" = a."assignedToId",
    "toCustodianId"   = a."assignedToId"
FROM "asset_transfers" AS t
JOIN "asset_assignments" AS a
  ON a."assetId" = t."assetId"
 AND a."assignedDate" <= t."transferredDate"
 AND (a."closedAt" IS NULL OR a."closedAt" >= t."transferredDate")
WHERE h."referenceType" = 'AssetTransfer'
  AND h."referenceId" = t."id"
  AND h."action" = 'TRANSFERRED'
  AND h."fromCustodianId" IS NULL
  AND h."toCustodianId" IS NULL;

ALTER TABLE "asset_history" ENABLE TRIGGER "asset_history_append_only";
