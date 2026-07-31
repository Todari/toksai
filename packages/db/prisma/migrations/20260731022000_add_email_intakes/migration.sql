CREATE TYPE "EmailIntakeStatus" AS ENUM ('WAITING', 'PROCESSING', 'READY', 'FAILED');

CREATE TABLE "EmailIntake" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "EmailIntakeStatus" NOT NULL DEFAULT 'WAITING',
    "sourceEmailId" TEXT,
    "analysisId" TEXT,
    "errorCode" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailIntake_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailIntake_token_key" ON "EmailIntake"("token");
CREATE UNIQUE INDEX "EmailIntake_sourceEmailId_key" ON "EmailIntake"("sourceEmailId");
CREATE UNIQUE INDEX "EmailIntake_analysisId_key" ON "EmailIntake"("analysisId");
CREATE INDEX "EmailIntake_status_expiresAt_idx" ON "EmailIntake"("status", "expiresAt");

ALTER TABLE "EmailIntake"
ADD CONSTRAINT "EmailIntake_analysisId_fkey"
FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
