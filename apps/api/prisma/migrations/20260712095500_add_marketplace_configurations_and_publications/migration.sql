-- CreateTable
CREATE TABLE "MarketplaceConfiguration" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "externalId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceConfiguration_listingId_marketplaceId_key"
ON "MarketplaceConfiguration"("listingId", "marketplaceId");

-- CreateIndex
CREATE INDEX "Publication_listingId_marketplaceId_idx"
ON "Publication"("listingId", "marketplaceId");

-- AddForeignKey
ALTER TABLE "MarketplaceConfiguration"
ADD CONSTRAINT "MarketplaceConfiguration_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication"
ADD CONSTRAINT "Publication_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
