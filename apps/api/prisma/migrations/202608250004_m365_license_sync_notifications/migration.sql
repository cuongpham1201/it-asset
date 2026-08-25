CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING','SENT','FAILED');

ALTER TABLE "directory_configurations"
  ADD COLUMN "syncLicenses" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastLicenseSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastLicenseSyncStatus" VARCHAR(30),
  ADD COLUMN "lastLicenseSyncMessage" TEXT;

ALTER TABLE "digital_entitlements"
  ALTER COLUMN "expiryDate" DROP NOT NULL,
  ADD COLUMN "externalProvider" VARCHAR(40),
  ADD COLUMN "externalTenantId" VARCHAR(100),
  ADD COLUMN "externalSkuId" VARCHAR(100),
  ADD COLUMN "externalSkuPartNumber" VARCHAR(150),
  ADD COLUMN "externalAssignedQuantity" INTEGER,
  ADD COLUMN "externalAvailableQuantity" INTEGER,
  ADD COLUMN "externalCapabilityStatus" VARCHAR(40),
  ADD COLUMN "externalLastSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "digital_entitlements_externalProvider_externalTenantId_externalSkuId_key"
  ON "digital_entitlements"("externalProvider","externalTenantId","externalSkuId");

CREATE TABLE "microsoft_license_assignments" (
  "id" UUID NOT NULL,
  "entitlementId" UUID NOT NULL,
  "externalUserId" VARCHAR(100) NOT NULL,
  "userPrincipalName" VARCHAR(255) NOT NULL,
  "displayName" VARCHAR(200),
  "assignedByGroup" VARCHAR(100),
  "assignmentState" VARCHAR(40),
  "assignmentError" VARCHAR(100),
  "personId" UUID,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "microsoft_license_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "microsoft_license_assignments_entitlementId_externalUserId_key" ON "microsoft_license_assignments"("entitlementId","externalUserId");
CREATE INDEX "microsoft_license_assignments_userPrincipalName_idx" ON "microsoft_license_assignments"("userPrincipalName");
CREATE INDEX "microsoft_license_assignments_personId_idx" ON "microsoft_license_assignments"("personId");
ALTER TABLE "microsoft_license_assignments" ADD CONSTRAINT "microsoft_license_assignments_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "digital_entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "microsoft_license_assignments" ADD CONSTRAINT "microsoft_license_assignments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "renewal_notification_configurations" (
  "id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "smtpHost" VARCHAR(255),
  "smtpPort" INTEGER NOT NULL DEFAULT 587,
  "secure" BOOLEAN NOT NULL DEFAULT false,
  "username" VARCHAR(255),
  "passwordEncrypted" TEXT,
  "fromName" VARCHAR(150),
  "fromAddress" VARCHAR(255),
  "replyTo" VARCHAR(255),
  "lastTestAt" TIMESTAMP(3),
  "lastTestOk" BOOLEAN,
  "lastTestMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "renewal_notification_configurations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "renewal_notification_configurations_port_check" CHECK ("smtpPort" BETWEEN 1 AND 65535)
);

CREATE TABLE "renewal_notification_deliveries" (
  "id" UUID NOT NULL,
  "alertId" UUID NOT NULL,
  "channel" VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
  "recipient" VARCHAR(255) NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "renewal_notification_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "renewal_notification_deliveries_alertId_channel_recipient_key" ON "renewal_notification_deliveries"("alertId","channel","recipient");
CREATE INDEX "renewal_notification_deliveries_status_nextAttemptAt_idx" ON "renewal_notification_deliveries"("status","nextAttemptAt");
ALTER TABLE "renewal_notification_deliveries" ADD CONSTRAINT "renewal_notification_deliveries_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "renewal_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
