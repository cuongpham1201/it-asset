CREATE TYPE "DiscoverySource" AS ENUM ('AGENT', 'NETWORK_SNMP');
CREATE TYPE "DiscoveryStatus" AS ENUM ('PENDING', 'MATCHED', 'CONFLICT', 'LINKED', 'CREATED', 'IGNORED');

ALTER TABLE "assets" ADD COLUMN "systemUuid" VARCHAR(100);
CREATE UNIQUE INDEX "assets_systemUuid_key" ON "assets"("systemUuid");

CREATE TABLE "agent_enrollment_tokens" (
  "id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "siteCode" VARCHAR(100),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "maxEnrollments" INTEGER NOT NULL DEFAULT 100,
  "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_enrollment_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "endpoint_agents" (
  "id" UUID NOT NULL,
  "agentKey" VARCHAR(100) NOT NULL,
  "credentialHash" VARCHAR(64) NOT NULL,
  "enrollmentTokenId" UUID NOT NULL,
  "fingerprint" VARCHAR(64) NOT NULL,
  "hostname" VARCHAR(255) NOT NULL,
  "siteCode" VARCHAR(100),
  "agentVersion" VARCHAR(50) NOT NULL,
  "osFamily" VARCHAR(30) NOT NULL,
  "linkedAssetId" UUID,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "endpoint_agents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_inventory_snapshots" (
  "id" UUID NOT NULL,
  "agentId" UUID NOT NULL,
  "schemaVersion" VARCHAR(20) NOT NULL,
  "collectedAt" TIMESTAMP(3) NOT NULL,
  "hostname" VARCHAR(255) NOT NULL,
  "serialNumber" VARCHAR(150),
  "systemUuid" VARCHAR(100),
  "primaryMac" VARCHAR(64),
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_inventory_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discovery_inbox_items" (
  "id" UUID NOT NULL,
  "source" "DiscoverySource" NOT NULL DEFAULT 'AGENT',
  "status" "DiscoveryStatus" NOT NULL DEFAULT 'PENDING',
  "agentId" UUID NOT NULL,
  "suggestedAssetId" UUID,
  "resolvedAssetId" UUID,
  "matchConfidence" INTEGER NOT NULL DEFAULT 0,
  "conflictReason" VARCHAR(1000),
  "resolutionNote" VARCHAR(2000),
  "resolvedBy" UUID,
  "resolvedAt" TIMESTAMP(3),
  "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "discovery_inbox_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_enrollment_tokens_tokenHash_key" ON "agent_enrollment_tokens"("tokenHash");
CREATE INDEX "agent_enrollment_tokens_expiresAt_revokedAt_idx" ON "agent_enrollment_tokens"("expiresAt", "revokedAt");
CREATE UNIQUE INDEX "endpoint_agents_agentKey_key" ON "endpoint_agents"("agentKey");
CREATE UNIQUE INDEX "endpoint_agents_credentialHash_key" ON "endpoint_agents"("credentialHash");
CREATE UNIQUE INDEX "endpoint_agents_fingerprint_key" ON "endpoint_agents"("fingerprint");
CREATE UNIQUE INDEX "endpoint_agents_linkedAssetId_key" ON "endpoint_agents"("linkedAssetId");
CREATE INDEX "endpoint_agents_hostname_lastSeenAt_idx" ON "endpoint_agents"("hostname", "lastSeenAt");
CREATE UNIQUE INDEX "agent_inventory_snapshots_agentId_collectedAt_key" ON "agent_inventory_snapshots"("agentId", "collectedAt");
CREATE INDEX "agent_inventory_snapshots_serialNumber_idx" ON "agent_inventory_snapshots"("serialNumber");
CREATE INDEX "agent_inventory_snapshots_primaryMac_idx" ON "agent_inventory_snapshots"("primaryMac");
CREATE INDEX "agent_inventory_snapshots_createdAt_idx" ON "agent_inventory_snapshots"("createdAt");
CREATE UNIQUE INDEX "discovery_inbox_items_agentId_key" ON "discovery_inbox_items"("agentId");
CREATE INDEX "discovery_inbox_items_status_lastObservedAt_idx" ON "discovery_inbox_items"("status", "lastObservedAt");

ALTER TABLE "agent_enrollment_tokens" ADD CONSTRAINT "agent_enrollment_tokens_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "endpoint_agents" ADD CONSTRAINT "endpoint_agents_enrollmentTokenId_fkey" FOREIGN KEY ("enrollmentTokenId") REFERENCES "agent_enrollment_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "endpoint_agents" ADD CONSTRAINT "endpoint_agents_linkedAssetId_fkey" FOREIGN KEY ("linkedAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_inventory_snapshots" ADD CONSTRAINT "agent_inventory_snapshots_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "endpoint_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discovery_inbox_items" ADD CONSTRAINT "discovery_inbox_items_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "endpoint_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discovery_inbox_items" ADD CONSTRAINT "discovery_inbox_items_suggestedAssetId_fkey" FOREIGN KEY ("suggestedAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "discovery_inbox_items" ADD CONSTRAINT "discovery_inbox_items_resolvedAssetId_fkey" FOREIGN KEY ("resolvedAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "discovery_inbox_items" ADD CONSTRAINT "discovery_inbox_items_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
