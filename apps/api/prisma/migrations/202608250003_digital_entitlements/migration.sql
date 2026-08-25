CREATE TYPE "DigitalEntitlementType" AS ENUM ('LICENSE','SSL_CERTIFICATE','DOMAIN');
CREATE TYPE "DigitalEntitlementStatus" AS ENUM ('ACTIVE','EXPIRING','EXPIRED','SUSPENDED','RETIRED');
CREATE TYPE "DigitalAssignmentStatus" AS ENUM ('ACTIVE','REVOKED');
CREATE TYPE "DigitalRenewalStatus" AS ENUM ('PLANNED','APPROVED','COMPLETED','CANCELLED');
CREATE TYPE "RenewalAlertStatus" AS ENUM ('OPEN','ACKNOWLEDGED','RESOLVED','DISMISSED');

CREATE TABLE "digital_entitlements" (
  "id" UUID NOT NULL,
  "code" VARCHAR(60) NOT NULL,
  "name" VARCHAR(250) NOT NULL,
  "type" "DigitalEntitlementType" NOT NULL,
  "status" "DigitalEntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
  "productName" VARCHAR(200), "edition" VARCHAR(120), "subscriptionIdentifier" VARCHAR(255),
  "domainName" VARCHAR(253), "commonName" VARCHAR(253), "registrar" VARCHAR(200), "issuer" VARCHAR(200),
  "licenseMetric" VARCHAR(80), "totalQuantity" INTEGER NOT NULL DEFAULT 1,
  "startDate" DATE, "expiryDate" DATE NOT NULL, "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "renewalPeriodMonths" INTEGER NOT NULL DEFAULT 12, "cancellationDeadline" DATE,
  "purchaseCost" DECIMAL(18,2), "renewalCost" DECIMAL(18,2), "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
  "purchaseOrderNo" VARCHAR(100), "contractNo" VARCHAR(100), "managementUrl" VARCHAR(1000),
  "accountName" VARCHAR(255), "secretReference" VARCHAR(500), "technicalContact" VARCHAR(255),
  "businessOwner" VARCHAR(255), "notes" TEXT, "vendorId" UUID, "ownerDepartmentId" UUID,
  "ownerUserId" UUID, "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "digital_entitlements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "digital_entitlements_quantity_check" CHECK ("totalQuantity" > 0),
  CONSTRAINT "digital_entitlements_period_check" CHECK ("startDate" IS NULL OR "expiryDate" >= "startDate"),
  CONSTRAINT "digital_entitlements_renewal_period_check" CHECK ("renewalPeriodMonths" > 0),
  CONSTRAINT "digital_entitlements_type_fields_check" CHECK (
    ("type" = 'LICENSE') OR
    ("type" = 'DOMAIN' AND "domainName" IS NOT NULL) OR
    ("type" = 'SSL_CERTIFICATE' AND ("commonName" IS NOT NULL OR "domainName" IS NOT NULL))
  )
);
CREATE UNIQUE INDEX "digital_entitlements_code_key" ON "digital_entitlements"("code");
CREATE INDEX "digital_entitlements_type_status_expiryDate_idx" ON "digital_entitlements"("type","status","expiryDate");
CREATE INDEX "digital_entitlements_ownerDepartmentId_expiryDate_idx" ON "digital_entitlements"("ownerDepartmentId","expiryDate");
CREATE INDEX "digital_entitlements_vendorId_idx" ON "digital_entitlements"("vendorId");

CREATE TABLE "digital_assignments" (
  "id" UUID NOT NULL, "entitlementId" UUID NOT NULL, "personId" UUID, "assetId" UUID,
  "departmentId" UUID, "quantity" INTEGER NOT NULL DEFAULT 1,
  "status" "DigitalAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expectedEndAt" DATE,
  "revokedAt" TIMESTAMP(3), "assignedBy" UUID NOT NULL, "revokedBy" UUID,
  "assignmentNote" TEXT, "revokeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "digital_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "digital_assignments_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "digital_assignments_target_check" CHECK (
    (("personId" IS NOT NULL)::int + ("assetId" IS NOT NULL)::int + ("departmentId" IS NOT NULL)::int) = 1
  ),
  CONSTRAINT "digital_assignments_revoke_check" CHECK (
    ("status" = 'ACTIVE' AND "revokedAt" IS NULL) OR ("status" = 'REVOKED' AND "revokedAt" IS NOT NULL)
  )
);
CREATE INDEX "digital_assignments_entitlementId_status_idx" ON "digital_assignments"("entitlementId","status");
CREATE INDEX "digital_assignments_personId_status_idx" ON "digital_assignments"("personId","status");
CREATE INDEX "digital_assignments_assetId_status_idx" ON "digital_assignments"("assetId","status");
CREATE UNIQUE INDEX "digital_assignments_active_person_idx" ON "digital_assignments"("entitlementId","personId") WHERE "status"='ACTIVE' AND "personId" IS NOT NULL;
CREATE UNIQUE INDEX "digital_assignments_active_asset_idx" ON "digital_assignments"("entitlementId","assetId") WHERE "status"='ACTIVE' AND "assetId" IS NOT NULL;
CREATE UNIQUE INDEX "digital_assignments_active_department_idx" ON "digital_assignments"("entitlementId","departmentId") WHERE "status"='ACTIVE' AND "departmentId" IS NOT NULL;

CREATE TABLE "digital_renewals" (
  "id" UUID NOT NULL, "entitlementId" UUID NOT NULL,
  "status" "DigitalRenewalStatus" NOT NULL DEFAULT 'COMPLETED',
  "previousExpiryDate" DATE NOT NULL, "newExpiryDate" DATE NOT NULL,
  "renewalDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP, "amount" DECIMAL(18,2),
  "currency" VARCHAR(3) NOT NULL DEFAULT 'VND', "purchaseOrderNo" VARCHAR(100), "invoiceNo" VARCHAR(100),
  "approvedBy" UUID, "renewedBy" UUID NOT NULL, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "digital_renewals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "digital_renewals_expiry_check" CHECK ("newExpiryDate" > "previousExpiryDate")
);
CREATE INDEX "digital_renewals_entitlementId_renewalDate_idx" ON "digital_renewals"("entitlementId","renewalDate");

CREATE TABLE "renewal_alert_policies" (
  "id" UUID NOT NULL, "type" "DigitalEntitlementType" NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "warningDays" INTEGER[] NOT NULL DEFAULT ARRAY[90,60,30,14,7,1,0],
  "overdueEscalationDays" INTEGER[] NOT NULL DEFAULT ARRAY[1,3,7],
  "recipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "notifyOwner" BOOLEAN NOT NULL DEFAULT true,
  "updatedBy" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "renewal_alert_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "renewal_alert_policies_type_key" ON "renewal_alert_policies"("type");

CREATE TABLE "renewal_alerts" (
  "id" UUID NOT NULL, "entitlementId" UUID NOT NULL, "policyId" UUID NOT NULL, "thresholdDays" INTEGER NOT NULL,
  "dueDate" DATE NOT NULL, "status" "RenewalAlertStatus" NOT NULL DEFAULT 'OPEN',
  "firstTriggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastTriggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3), "acknowledgedBy" UUID, "resolvedAt" TIMESTAMP(3), "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "renewal_alerts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "renewal_alerts_entitlementId_dueDate_thresholdDays_key" ON "renewal_alerts"("entitlementId","dueDate","thresholdDays");
CREATE INDEX "renewal_alerts_status_dueDate_idx" ON "renewal_alerts"("status","dueDate");

ALTER TABLE "digital_entitlements" ADD CONSTRAINT "digital_entitlements_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_entitlements" ADD CONSTRAINT "digital_entitlements_ownerDepartmentId_fkey" FOREIGN KEY ("ownerDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_entitlements" ADD CONSTRAINT "digital_entitlements_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_entitlements" ADD CONSTRAINT "digital_entitlements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_assignments" ADD CONSTRAINT "digital_assignments_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "digital_entitlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_assignments" ADD CONSTRAINT "digital_assignments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_assignments" ADD CONSTRAINT "digital_assignments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_assignments" ADD CONSTRAINT "digital_assignments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_assignments" ADD CONSTRAINT "digital_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_assignments" ADD CONSTRAINT "digital_assignments_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_renewals" ADD CONSTRAINT "digital_renewals_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "digital_entitlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_renewals" ADD CONSTRAINT "digital_renewals_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_renewals" ADD CONSTRAINT "digital_renewals_renewedBy_fkey" FOREIGN KEY ("renewedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "renewal_alert_policies" ADD CONSTRAINT "renewal_alert_policies_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "renewal_alerts" ADD CONSTRAINT "renewal_alerts_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "digital_entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "renewal_alerts" ADD CONSTRAINT "renewal_alerts_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "renewal_alert_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "renewal_alerts" ADD CONSTRAINT "renewal_alerts_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "renewal_alert_policies" ("id","type","warningDays","overdueEscalationDays","recipients","notifyOwner","updatedAt") VALUES
  (gen_random_uuid(),'LICENSE',ARRAY[90,60,30,14,7,1,0],ARRAY[1,3,7],ARRAY[]::TEXT[],true,CURRENT_TIMESTAMP),
  (gen_random_uuid(),'SSL_CERTIFICATE',ARRAY[60,30,14,7,3,1,0],ARRAY[1,2,3],ARRAY[]::TEXT[],true,CURRENT_TIMESTAMP),
  (gen_random_uuid(),'DOMAIN',ARRAY[90,60,30,14,7,1,0],ARRAY[1,3,7],ARRAY[]::TEXT[],true,CURRENT_TIMESTAMP);
