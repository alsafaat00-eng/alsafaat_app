BEGIN;

-- CreateEnum
CREATE TYPE "ButcherApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ButcherApplicationDocumentType" AS ENUM ('commercial_license', 'national_id', 'municipal_permit', 'shop_photo', 'other');

-- CreateEnum
CREATE TYPE "ButcherApplicationDocumentStatus" AS ENUM ('pending', 'uploaded', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "ButcherApplicationTimelineAction" AS ENUM ('application_created', 'draft_saved', 'document_added', 'document_updated', 'submitted', 'withdrawn', 'approved', 'rejected', 'admin_note', 'butcher_provisioned');

-- AlterTable
ALTER TABLE "Butcher" ADD COLUMN "sourceApplicationId" TEXT;

-- CreateTable
CREATE TABLE "ButcherApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationNumber" INTEGER NOT NULL,
    "status" "ButcherApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "nameAr" TEXT,
    "nameEn" TEXT,
    "phone" TEXT,
    "ownerName" TEXT,
    "commercialReg" TEXT,
    "country" "Country",
    "city" TEXT,
    "cityAr" TEXT,
    "address" TEXT,
    "addressAr" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "type" "ButcherType" NOT NULL DEFAULT 'regular',
    "bioAr" TEXT,
    "bioEn" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "openTime" TEXT NOT NULL DEFAULT '06:00',
    "closeTime" TEXT NOT NULL DEFAULT '22:00',
    "rejectionReason" TEXT,
    "butcherId" TEXT,
    "acceptedTermsAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ButcherApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ButcherApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "ButcherApplicationDocumentType" NOT NULL,
    "fileKey" TEXT,
    "status" "ButcherApplicationDocumentStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "originalFileName" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ButcherApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ButcherApplicationTimelineEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "action" "ButcherApplicationTimelineAction" NOT NULL,
    "comment" TEXT,
    "createdBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ButcherApplicationTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ButcherApplication_userId_status_idx" ON "ButcherApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "ButcherApplication_status_submittedAt_idx" ON "ButcherApplication"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "ButcherApplication_status_createdAt_idx" ON "ButcherApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ButcherApplication_country_status_idx" ON "ButcherApplication"("country", "status");

-- CreateIndex
CREATE INDEX "ButcherApplication_butcherId_idx" ON "ButcherApplication"("butcherId");

-- CreateIndex
CREATE INDEX "ButcherApplication_userId_createdAt_idx" ON "ButcherApplication"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ButcherApplication_userId_applicationNumber_key" ON "ButcherApplication"("userId", "applicationNumber");

-- CreateIndex
CREATE INDEX "ButcherApplicationDocument_applicationId_idx" ON "ButcherApplicationDocument"("applicationId");

-- CreateIndex
CREATE INDEX "ButcherApplicationDocument_applicationId_type_idx" ON "ButcherApplicationDocument"("applicationId", "type");

-- CreateIndex
CREATE INDEX "ButcherApplicationDocument_status_idx" ON "ButcherApplicationDocument"("status");

-- CreateIndex
CREATE INDEX "ButcherApplicationTimelineEvent_applicationId_createdAt_idx" ON "ButcherApplicationTimelineEvent"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ButcherApplicationTimelineEvent_createdBy_idx" ON "ButcherApplicationTimelineEvent"("createdBy");

-- CreateIndex
CREATE INDEX "ButcherApplicationTimelineEvent_action_idx" ON "ButcherApplicationTimelineEvent"("action");

-- CreateIndex
CREATE UNIQUE INDEX "Butcher_sourceApplicationId_key" ON "Butcher"("sourceApplicationId");

-- Partial unique: at most one DRAFT and one SUBMITTED application per user
CREATE UNIQUE INDEX "ButcherApplication_one_draft_per_user_key"
ON "ButcherApplication" ("userId")
WHERE status = 'DRAFT';

CREATE UNIQUE INDEX "ButcherApplication_one_submitted_per_user_key"
ON "ButcherApplication" ("userId")
WHERE status = 'SUBMITTED';

-- AddForeignKey
ALTER TABLE "Butcher" ADD CONSTRAINT "Butcher_sourceApplicationId_fkey" FOREIGN KEY ("sourceApplicationId") REFERENCES "ButcherApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ButcherApplication" ADD CONSTRAINT "ButcherApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ButcherApplication" ADD CONSTRAINT "ButcherApplication_butcherId_fkey" FOREIGN KEY ("butcherId") REFERENCES "Butcher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ButcherApplicationDocument" ADD CONSTRAINT "ButcherApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ButcherApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ButcherApplicationTimelineEvent" ADD CONSTRAINT "ButcherApplicationTimelineEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ButcherApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ButcherApplicationTimelineEvent" ADD CONSTRAINT "ButcherApplicationTimelineEvent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
