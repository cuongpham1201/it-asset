CREATE TYPE "InventoryStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE "InventoryResult" AS ENUM ('PENDING', 'MATCHED', 'MISSING', 'UNEXPECTED', 'LOCATION_MISMATCH', 'CUSTODIAN_MISMATCH');
CREATE TYPE "AssetImportStatus" AS ENUM ('STAGED', 'COMMITTED', 'ROLLED_BACK', 'FAILED');
CREATE TYPE "AssetImportRowStatus" AS ENUM ('VALID', 'INVALID', 'COMMITTED', 'ROLLED_BACK');

CREATE TABLE "inventory_sessions" (
  "id" UUID NOT NULL,
  "inventoryNo" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "status" "InventoryStatus" NOT NULL DEFAULT 'OPEN',
  "scopeDepartmentId" UUID,
  "scopeLocationId" UUID,
  "scopeWarehouseId" UUID,
  "scopeCategoryId" UUID,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_items" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "expectedLocationId" UUID,
  "expectedCustodianId" UUID,
  "observedLocationId" UUID,
  "observedCustodianId" UUID,
  "scannedAt" TIMESTAMP(3),
  "scannedBy" UUID,
  "result" "InventoryResult" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asset_import_batches" (
  "id" UUID NOT NULL,
  "sourceFileName" VARCHAR(255) NOT NULL,
  "status" "AssetImportStatus" NOT NULL DEFAULT 'STAGED',
  "totalRows" INTEGER NOT NULL,
  "validRows" INTEGER NOT NULL DEFAULT 0,
  "invalidRows" INTEGER NOT NULL DEFAULT 0,
  "committedRows" INTEGER NOT NULL DEFAULT 0,
  "createdBy" UUID NOT NULL,
  "committedAt" TIMESTAMP(3),
  "rolledBackAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "asset_import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asset_import_rows" (
  "id" UUID NOT NULL,
  "batchId" UUID NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "AssetImportRowStatus" NOT NULL,
  "errors" JSONB NOT NULL DEFAULT '[]',
  "assetId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "asset_import_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_sessions_inventoryNo_key" ON "inventory_sessions"("inventoryNo");
CREATE INDEX "inventory_sessions_status_startedAt_idx" ON "inventory_sessions"("status", "startedAt");
CREATE UNIQUE INDEX "inventory_items_sessionId_assetId_key" ON "inventory_items"("sessionId", "assetId");
CREATE INDEX "inventory_items_sessionId_result_idx" ON "inventory_items"("sessionId", "result");
CREATE INDEX "asset_import_batches_status_createdAt_idx" ON "asset_import_batches"("status", "createdAt");
CREATE UNIQUE INDEX "asset_import_rows_batchId_rowNumber_key" ON "asset_import_rows"("batchId", "rowNumber");
CREATE INDEX "asset_import_rows_batchId_status_idx" ON "asset_import_rows"("batchId", "status");

ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_scopeDepartmentId_fkey" FOREIGN KEY ("scopeDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_scopeLocationId_fkey" FOREIGN KEY ("scopeLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_scopeWarehouseId_fkey" FOREIGN KEY ("scopeWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_scopeCategoryId_fkey" FOREIGN KEY ("scopeCategoryId") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_expectedLocationId_fkey" FOREIGN KEY ("expectedLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_observedLocationId_fkey" FOREIGN KEY ("observedLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_expectedCustodianId_fkey" FOREIGN KEY ("expectedCustodianId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_observedCustodianId_fkey" FOREIGN KEY ("observedCustodianId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_scannedBy_fkey" FOREIGN KEY ("scannedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_import_batches" ADD CONSTRAINT "asset_import_batches_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_import_rows" ADD CONSTRAINT "asset_import_rows_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "asset_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_import_rows" ADD CONSTRAINT "asset_import_rows_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
