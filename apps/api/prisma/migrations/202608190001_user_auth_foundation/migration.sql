-- Authentication foundation. Passwords must only be stored as slow password hashes.
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'IT', 'HCNS', 'USER');
CREATE TYPE "AuthSource" AS ENUM ('LOCAL', 'LDAP', 'ENTRA_ID');

ALTER TABLE "users"
  ADD COLUMN "passwordHash" VARCHAR(255),
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "authSource" "AuthSource" NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

COMMENT ON COLUMN "users"."passwordHash" IS 'Argon2id or equivalent slow password hash; never plaintext';
COMMENT ON COLUMN "users"."mustChangePassword" IS 'Blocks normal application access until the initial password is replaced';

CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");
CREATE INDEX "auth_sessions_userId_expiresAt_idx" ON "auth_sessions"("userId", "expiresAt");
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
