CREATE TYPE "DirectoryProvider" AS ENUM ('M365', 'LDAP');
CREATE TYPE "DirectorySyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

ALTER TABLE "users" ADD COLUMN "externalId" VARCHAR(255);
CREATE UNIQUE INDEX "users_authSource_externalId_key" ON "users"("authSource", "externalId");

CREATE TABLE "directory_configurations" (
  "id" UUID NOT NULL,
  "provider" "DirectoryProvider" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "tenantId" VARCHAR(100),
  "clientId" VARCHAR(100),
  "ldapUrl" VARCHAR(500),
  "baseDn" VARCHAR(1000),
  "bindDn" VARCHAR(1000),
  "secretEncrypted" TEXT,
  "caCertificate" TEXT,
  "userFilter" VARCHAR(2000),
  "useTls" BOOLEAN NOT NULL DEFAULT true,
  "schedule" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
  "syncDisabled" BOOLEAN NOT NULL DEFAULT false,
  "groupMapping" JSONB NOT NULL DEFAULT '{}',
  "departmentAttribute" VARCHAR(100) NOT NULL DEFAULT 'department',
  "emailAttribute" VARCHAR(100) NOT NULL DEFAULT 'mail',
  "employeeCodeAttribute" VARCHAR(100) NOT NULL DEFAULT 'employeeID',
  "usernameAttribute" VARCHAR(100) NOT NULL DEFAULT 'sAMAccountName',
  "lastTestAt" TIMESTAMP(3),
  "lastTestOk" BOOLEAN,
  "lastTestMessage" TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "directory_configurations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "directory_configurations_provider_key" ON "directory_configurations"("provider");

CREATE TABLE "directory_sync_runs" (
  "id" UUID NOT NULL,
  "configurationId" UUID NOT NULL,
  "status" "DirectorySyncStatus" NOT NULL DEFAULT 'RUNNING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "discovered" INTEGER NOT NULL DEFAULT 0,
  "created" INTEGER NOT NULL DEFAULT 0,
  "updated" INTEGER NOT NULL DEFAULT 0,
  "disabled" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "triggeredBy" VARCHAR(100),
  CONSTRAINT "directory_sync_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "directory_sync_runs_configurationId_startedAt_idx" ON "directory_sync_runs"("configurationId", "startedAt");
ALTER TABLE "directory_sync_runs" ADD CONSTRAINT "directory_sync_runs_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "directory_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
