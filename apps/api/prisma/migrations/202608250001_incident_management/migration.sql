CREATE TYPE "IncidentCategory" AS ENUM ('POWER','NETWORK','MALWARE','HARDWARE','SOFTWARE','SECURITY','ACCESS','CLOUD','TELEPHONY','OTHER');
CREATE TYPE "IncidentStatus" AS ENUM ('NEW','ACKNOWLEDGED','IN_PROGRESS','MONITORING','RESOLVED','CLOSED','CANCELLED');
CREATE TYPE "IncidentPriority" AS ENUM ('P1','P2','P3','P4');
CREATE TYPE "IncidentImpact" AS ENUM ('CRITICAL','HIGH','MEDIUM','LOW');
CREATE TYPE "IncidentUrgency" AS ENUM ('HIGH','MEDIUM','LOW');

CREATE TABLE "incidents" (
  "id" UUID NOT NULL,
  "incidentNo" VARCHAR(50) NOT NULL,
  "title" VARCHAR(250) NOT NULL,
  "category" "IncidentCategory" NOT NULL,
  "status" "IncidentStatus" NOT NULL DEFAULT 'NEW',
  "priority" "IncidentPriority" NOT NULL,
  "impact" "IncidentImpact" NOT NULL,
  "urgency" "IncidentUrgency" NOT NULL,
  "description" TEXT NOT NULL,
  "businessImpact" TEXT,
  "initialAssessment" TEXT,
  "containmentAction" TEXT,
  "resolution" TEXT,
  "rootCause" TEXT,
  "correctiveAction" TEXT,
  "preventiveAction" TEXT,
  "lessonsLearned" TEXT,
  "serviceName" VARCHAR(200),
  "reporterName" VARCHAR(150) NOT NULL,
  "reporterContact" VARCHAR(255),
  "reportedById" UUID,
  "assignedToId" UUID,
  "createdBy" UUID NOT NULL,
  "departmentId" UUID,
  "locationId" UUID,
  "assetId" UUID,
  "affectedUsers" INTEGER NOT NULL DEFAULT 0,
  "downtimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "isSecurityIncident" BOOLEAN NOT NULL DEFAULT false,
  "isBusinessContinuityEvent" BOOLEAN NOT NULL DEFAULT false,
  "detectedAt" TIMESTAMP(3) NOT NULL,
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "responseStartedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "slaResponseDueAt" TIMESTAMP(3) NOT NULL,
  "slaResolutionDueAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incidents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "incidents_affectedUsers_check" CHECK ("affectedUsers" >= 0),
  CONSTRAINT "incidents_downtimeMinutes_check" CHECK ("downtimeMinutes" >= 0),
  CONSTRAINT "incidents_detected_before_reported_check" CHECK ("detectedAt" <= "reportedAt" + INTERVAL '5 minutes')
);

CREATE TABLE "incident_activities" (
  "id" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "type" VARCHAR(40) NOT NULL,
  "note" TEXT NOT NULL,
  "fromStatus" "IncidentStatus",
  "toStatus" "IncidentStatus",
  "performedBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "incidents_incidentNo_key" ON "incidents"("incidentNo");
CREATE INDEX "incidents_status_priority_reportedAt_idx" ON "incidents"("status","priority","reportedAt");
CREATE INDEX "incidents_category_reportedAt_idx" ON "incidents"("category","reportedAt");
CREATE INDEX "incidents_departmentId_reportedAt_idx" ON "incidents"("departmentId","reportedAt");
CREATE INDEX "incidents_assetId_reportedAt_idx" ON "incidents"("assetId","reportedAt");
CREATE INDEX "incident_activities_incidentId_createdAt_idx" ON "incident_activities"("incidentId","createdAt");

ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incident_activities" ADD CONSTRAINT "incident_activities_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incident_activities" ADD CONSTRAINT "incident_activities_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
