-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PARSING', 'IDENTIFYING', 'ANALYZING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "viewToken" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "sourceType" TEXT NOT NULL DEFAULT 'upload',
    "jobStartedAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "nickname" TEXT,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawChat" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "encryptedText" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "timeline" JSONB NOT NULL,
    "affinitySeries" JSONB NOT NULL,
    "keywords" JSONB NOT NULL,
    "personas" JSONB NOT NULL,
    "badges" JSONB NOT NULL,
    "chemiScore" INTEGER NOT NULL,
    "relationType" JSONB NOT NULL,
    "highlights" JSONB NOT NULL,
    "extras" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_viewToken_key" ON "Analysis"("viewToken");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_adminToken_key" ON "Analysis"("adminToken");

-- CreateIndex
CREATE INDEX "Analysis_status_heartbeatAt_idx" ON "Analysis"("status", "heartbeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "RawChat_analysisId_key" ON "RawChat"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisResult_analysisId_key" ON "AnalysisResult"("analysisId");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawChat" ADD CONSTRAINT "RawChat_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
