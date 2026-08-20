-- AssetFlow lifecycle transactions. Snapshot columns on assets remain optimized read models;
-- these tables are the authoritative business history.
CREATE TYPE "AssetAssignmentType" AS ENUM ('ASSIGNMENT', 'LOAN');
CREATE TYPE "AssetAssignmentStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE "AssetReturnOutcome" AS ENUM ('READY', 'MAINTENANCE', 'BROKEN');
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MaintenanceOutcome" AS ENUM ('READY', 'BROKEN', 'DISPOSED');

-- Required lifecycle reference data must exist on a clean production install;
-- production startup intentionally does not run the demo seed.
INSERT INTO "asset_statuses" ("id","code","name","color","isAssignable","isDeployable","isArchived","sortOrder") VALUES
  ('10000000-0000-4000-8000-000000000001','READY','Sẵn sàng','#64748b',true,true,false,1),
  ('10000000-0000-4000-8000-000000000002','IN_USE','Đang sử dụng','#16803c',false,true,false,2),
  ('10000000-0000-4000-8000-000000000003','ON_LOAN','Đang mượn','#2563eb',false,true,false,3),
  ('10000000-0000-4000-8000-000000000004','RETURNED','Đã thu hồi','#64748b',false,false,false,4),
  ('10000000-0000-4000-8000-000000000005','RESERVED','Đã giữ chỗ','#a16207',false,false,false,5),
  ('10000000-0000-4000-8000-000000000006','MAINTENANCE','Bảo trì','#c56a00',false,false,false,6),
  ('10000000-0000-4000-8000-000000000007','LOST','Mất','#c62828',false,false,false,7),
  ('10000000-0000-4000-8000-000000000008','BROKEN','Hỏng','#dc2626',false,false,false,8),
  ('10000000-0000-4000-8000-000000000009','DISPOSED','Thanh lý','#475569',false,false,true,9)
ON CONFLICT ("code") DO UPDATE SET "name"=EXCLUDED."name","color"=EXCLUDED."color","isAssignable"=EXCLUDED."isAssignable","isDeployable"=EXCLUDED."isDeployable","isArchived"=EXCLUDED."isArchived","sortOrder"=EXCLUDED."sortOrder";

CREATE UNIQUE INDEX "assets_serialNumber_key" ON "assets"("serialNumber");

CREATE TABLE "asset_assignments" (
  "id" UUID NOT NULL,
  "assignmentNo" VARCHAR(50) NOT NULL,
  "assetId" UUID NOT NULL,
  "type" "AssetAssignmentType" NOT NULL,
  "assignedToId" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expectedReturnDate" DATE,
  "conditionOut" VARCHAR(100) NOT NULL,
  "note" TEXT,
  "assignedBy" UUID NOT NULL,
  "status" "AssetAssignmentStatus" NOT NULL DEFAULT 'OPEN',
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asset_returns" (
  "id" UUID NOT NULL,
  "returnNo" VARCHAR(50) NOT NULL,
  "assignmentId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "warehouseId" UUID,
  "locationId" UUID NOT NULL,
  "returnedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "conditionIn" VARCHAR(100) NOT NULL,
  "outcome" "AssetReturnOutcome" NOT NULL,
  "note" TEXT,
  "returnedBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asset_transfers" (
  "id" UUID NOT NULL,
  "transferNo" VARCHAR(50) NOT NULL,
  "assetId" UUID NOT NULL,
  "fromLocationId" UUID,
  "toLocationId" UUID NOT NULL,
  "fromWarehouseId" UUID,
  "toWarehouseId" UUID,
  "transferredDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "condition" VARCHAR(100),
  "reason" VARCHAR(1000) NOT NULL,
  "transferredBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_transfers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_records" (
  "id" UUID NOT NULL,
  "maintenanceNo" VARCHAR(50) NOT NULL,
  "assetId" UUID NOT NULL,
  "warehouseId" UUID,
  "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "issue" VARCHAR(2000) NOT NULL,
  "resolution" TEXT,
  "outcome" "MaintenanceOutcome",
  "cost" DECIMAL(18,2),
  "performedBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asset_assignments_assignmentNo_key" ON "asset_assignments"("assignmentNo");
CREATE UNIQUE INDEX "asset_assignments_one_open_per_asset" ON "asset_assignments"("assetId") WHERE "status" = 'OPEN';
CREATE INDEX "asset_assignments_assetId_status_idx" ON "asset_assignments"("assetId", "status");
CREATE INDEX "asset_assignments_assignedToId_status_idx" ON "asset_assignments"("assignedToId", "status");
CREATE INDEX "asset_assignments_expectedReturnDate_status_idx" ON "asset_assignments"("expectedReturnDate", "status");
CREATE UNIQUE INDEX "asset_returns_returnNo_key" ON "asset_returns"("returnNo");
CREATE UNIQUE INDEX "asset_returns_assignmentId_key" ON "asset_returns"("assignmentId");
CREATE INDEX "asset_returns_assetId_returnedDate_idx" ON "asset_returns"("assetId", "returnedDate");
CREATE UNIQUE INDEX "asset_transfers_transferNo_key" ON "asset_transfers"("transferNo");
CREATE INDEX "asset_transfers_assetId_transferredDate_idx" ON "asset_transfers"("assetId", "transferredDate");
CREATE UNIQUE INDEX "maintenance_records_maintenanceNo_key" ON "maintenance_records"("maintenanceNo");
CREATE UNIQUE INDEX "maintenance_records_one_open_per_asset" ON "maintenance_records"("assetId") WHERE "status" = 'OPEN';
CREATE INDEX "maintenance_records_assetId_status_idx" ON "maintenance_records"("assetId", "status");

ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "asset_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_returnedBy_fkey" FOREIGN KEY ("returnedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_transferredBy_fkey" FOREIGN KEY ("transferredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
