-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'LIKE_NEW', 'USED_GOOD', 'USED_ACCEPTABLE', 'FOR_PARTS');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'READY', 'PARTIALLY_PUBLISHED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ChannelValidationStatus" AS ENUM ('PENDING', 'VALID', 'INVALID');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('READY', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "condition" "ProductCondition" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementChannel" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "connectorCode" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB NOT NULL,
    "validationStatus" "ChannelValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationErrors" JSONB,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementPublication" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "announcementChannelId" TEXT NOT NULL,
    "connectorCode" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'READY',
    "externalListingId" TEXT,
    "externalUrl" TEXT,
    "lastError" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementPublication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementChannel_announcementId_connectorCode_key" ON "AnnouncementChannel"("announcementId", "connectorCode");

-- CreateIndex
CREATE INDEX "AnnouncementPublication_announcementId_idx" ON "AnnouncementPublication"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementPublication_announcementChannelId_idx" ON "AnnouncementPublication"("announcementChannelId");

-- AddForeignKey
ALTER TABLE "AnnouncementChannel" ADD CONSTRAINT "AnnouncementChannel_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementPublication" ADD CONSTRAINT "AnnouncementPublication_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementPublication" ADD CONSTRAINT "AnnouncementPublication_announcementChannelId_fkey" FOREIGN KEY ("announcementChannelId") REFERENCES "AnnouncementChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
