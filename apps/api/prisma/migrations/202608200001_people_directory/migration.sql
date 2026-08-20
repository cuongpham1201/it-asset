CREATE TABLE "people" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employeeCode" VARCHAR(50) NOT NULL,
  "fullName" VARCHAR(150) NOT NULL,
  "email" VARCHAR(255),
  "phone" VARCHAR(30),
  "jobTitle" VARCHAR(150),
  "departmentId" UUID NOT NULL,
  "locationId" UUID,
  "linkedUserId" UUID,
  "source" "AuthSource" NOT NULL DEFAULT 'LOCAL',
  "externalId" VARCHAR(255),
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "people_employeeCode_key" ON "people"("employeeCode");
CREATE UNIQUE INDEX "people_email_key" ON "people"("email");
CREATE UNIQUE INDEX "people_linkedUserId_key" ON "people"("linkedUserId");
CREATE UNIQUE INDEX "people_source_externalId_key" ON "people"("source", "externalId");
CREATE INDEX "people_departmentId_status_idx" ON "people"("departmentId", "status");
ALTER TABLE "people" ADD CONSTRAINT "people_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "people" ADD CONSTRAINT "people_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "people" ADD CONSTRAINT "people_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "people" ("employeeCode","fullName","email","phone","departmentId","linkedUserId","source","externalId","status","createdAt","updatedAt")
SELECT u."employeeCode",u."fullName",u."email",u."phone",u."departmentId",u."id",u."authSource",u."externalId",u."status",u."createdAt",CURRENT_TIMESTAMP
FROM "users" u WHERE u."departmentId" IS NOT NULL
ON CONFLICT ("employeeCode") DO NOTHING;

ALTER TABLE "assets" ADD COLUMN "currentCustodianId" UUID;
UPDATE "assets" a SET "currentCustodianId"=p."id" FROM "people" p WHERE p."linkedUserId"=a."assignedUserId";
ALTER TABLE "assets" ADD CONSTRAINT "assets_currentCustodianId_fkey" FOREIGN KEY ("currentCustodianId") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "assets_currentCustodianId_idx" ON "assets"("currentCustodianId");
