CREATE TABLE "application_settings" (
  "key" VARCHAR(50) NOT NULL,
  "value" JSONB NOT NULL,
  "updatedBy" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_settings_pkey" PRIMARY KEY ("key")
);
