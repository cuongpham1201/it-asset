CREATE TYPE "IncidentAssignmentRole" AS ENUM ('PRIMARY','SUPPORT');

ALTER TABLE "departments"
  ADD COLUMN "isIncidentResponseTeam" BOOLEAN NOT NULL DEFAULT false;

-- Preserve existing assignees during upgrade, and recognize conventional IT codes.
UPDATE "departments"
SET "isIncidentResponseTeam" = true
WHERE UPPER("code") IN ('IT','CNTT','ICT')
   OR "id" IN (
     SELECT DISTINCT u."departmentId"
     FROM "users" u
     JOIN "incidents" i ON i."assignedToId" = u."id"
     WHERE u."departmentId" IS NOT NULL
   );

ALTER TABLE "incidents" ADD COLUMN "assignedDepartmentId" UUID;

UPDATE "incidents" i
SET "assignedDepartmentId" = u."departmentId"
FROM "users" u
WHERE i."assignedToId" = u."id";

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_assignedDepartmentId_fkey"
  FOREIGN KEY ("assignedDepartmentId") REFERENCES "departments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "incidents_assignedDepartmentId_assignedToId_status_idx"
  ON "incidents"("assignedDepartmentId","assignedToId","status");

CREATE TABLE "incident_assignments" (
  "id" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "assignedToId" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "assignedBy" UUID NOT NULL,
  "role" "IncidentAssignmentRole" NOT NULL DEFAULT 'PRIMARY',
  "note" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "acceptedById" UUID,
  "releasedAt" TIMESTAMP(3),
  "releasedById" UUID,
  "releaseReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "incident_assignments_time_check"
    CHECK ("releasedAt" IS NULL OR "releasedAt" >= "assignedAt")
);

CREATE INDEX "incident_assignments_incidentId_assignedAt_idx"
  ON "incident_assignments"("incidentId","assignedAt");
CREATE INDEX "incident_assignments_assignedToId_releasedAt_idx"
  ON "incident_assignments"("assignedToId","releasedAt");
CREATE UNIQUE INDEX "incident_assignments_one_active_primary_idx"
  ON "incident_assignments"("incidentId")
  WHERE "role" = 'PRIMARY' AND "releasedAt" IS NULL;

ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_assignedBy_fkey"
  FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_acceptedById_fkey"
  FOREIGN KEY ("acceptedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_releasedById_fkey"
  FOREIGN KEY ("releasedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "incident_assignments" (
  "id","incidentId","assignedToId","departmentId","assignedBy","role",
  "note","assignedAt","acceptedAt","acceptedById","releasedAt","releasedById","releaseReason","createdAt"
)
SELECT
  gen_random_uuid(),i."id",i."assignedToId",i."assignedDepartmentId",i."createdBy",'PRIMARY',
  'Phân công được chuyển đổi từ dữ liệu trước migration',i."createdAt",i."acknowledgedAt",
  CASE WHEN i."acknowledgedAt" IS NOT NULL THEN i."createdBy" ELSE NULL END,
  CASE WHEN i."status" IN ('CLOSED','CANCELLED') THEN COALESCE(i."closedAt",i."updatedAt") ELSE NULL END,
  CASE WHEN i."status" IN ('CLOSED','CANCELLED') THEN i."createdBy" ELSE NULL END,
  CASE WHEN i."status" IN ('CLOSED','CANCELLED') THEN 'Kết thúc theo trạng thái hồ sơ được chuyển đổi' ELSE NULL END,
  i."createdAt"
FROM "incidents" i
WHERE i."assignedToId" IS NOT NULL AND i."assignedDepartmentId" IS NOT NULL;

CREATE OR REPLACE FUNCTION assetflow_validate_incident_assignee()
RETURNS trigger AS $$
DECLARE
  response_department UUID;
BEGIN
  IF NEW."assignedToId" IS NULL THEN
    NEW."assignedDepartmentId" := NULL;
    RETURN NEW;
  END IF;

  SELECT u."departmentId" INTO response_department
  FROM "users" u
  JOIN "departments" d ON d."id" = u."departmentId"
  WHERE u."id" = NEW."assignedToId"
    AND u."status" = 'ACTIVE'
    AND u."role" IN ('ADMIN','IT')
    AND d."status" = 'ACTIVE'
    AND d."isIncidentResponseTeam" = true;

  IF response_department IS NULL THEN
    RAISE EXCEPTION 'Incident assignee must be an active Admin/IT user in an incident response department'
      USING ERRCODE = '23514';
  END IF;

  NEW."assignedDepartmentId" := response_department;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "incidents_validate_assignee_trigger"
BEFORE INSERT OR UPDATE OF "assignedToId","assignedDepartmentId" ON "incidents"
FOR EACH ROW EXECUTE FUNCTION assetflow_validate_incident_assignee();

CREATE OR REPLACE FUNCTION assetflow_validate_incident_assignment()
RETURNS trigger AS $$
DECLARE
  response_department UUID;
BEGIN
  SELECT u."departmentId" INTO response_department
  FROM "users" u
  JOIN "departments" d ON d."id" = u."departmentId"
  WHERE u."id" = NEW."assignedToId"
    AND u."status" = 'ACTIVE'
    AND u."role" IN ('ADMIN','IT')
    AND d."status" = 'ACTIVE'
    AND d."isIncidentResponseTeam" = true;

  IF response_department IS NULL OR response_department <> NEW."departmentId" THEN
    RAISE EXCEPTION 'Incident assignment department does not match an eligible IT assignee'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "incident_assignments_validate_assignee_trigger"
BEFORE INSERT OR UPDATE OF "assignedToId","departmentId" ON "incident_assignments"
FOR EACH ROW EXECUTE FUNCTION assetflow_validate_incident_assignment();

CREATE OR REPLACE FUNCTION assetflow_protect_active_incident_assignee()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "incidents" i
    WHERE i."assignedToId" = OLD."id"
      AND i."status" IN ('NEW','ACKNOWLEDGED','IN_PROGRESS','MONITORING')
  ) AND (
    NEW."departmentId" IS DISTINCT FROM OLD."departmentId"
    OR NEW."status" <> 'ACTIVE'
    OR NEW."role" NOT IN ('ADMIN','IT')
    OR NEW."departmentId" IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM "departments" d
      WHERE d."id" = NEW."departmentId"
        AND d."status" = 'ACTIVE'
        AND d."isIncidentResponseTeam" = true
    )
  ) THEN
    RAISE EXCEPTION 'Reassign open incidents before changing this incident operator'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "users_protect_active_incident_assignee_trigger"
BEFORE UPDATE OF "departmentId","role","status" ON "users"
FOR EACH ROW EXECUTE FUNCTION assetflow_protect_active_incident_assignee();

CREATE OR REPLACE FUNCTION assetflow_protect_incident_response_department()
RETURNS trigger AS $$
BEGIN
  IF (NEW."isIncidentResponseTeam" = false OR NEW."status" <> 'ACTIVE')
     AND EXISTS (
       SELECT 1 FROM "incidents" i
       WHERE i."assignedDepartmentId" = OLD."id"
         AND i."status" IN ('NEW','ACKNOWLEDGED','IN_PROGRESS','MONITORING')
     ) THEN
    RAISE EXCEPTION 'Reassign open incidents before disabling this incident response department'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "departments_protect_incident_response_trigger"
BEFORE UPDATE OF "isIncidentResponseTeam","status" ON "departments"
FOR EACH ROW EXECUTE FUNCTION assetflow_protect_incident_response_department();
