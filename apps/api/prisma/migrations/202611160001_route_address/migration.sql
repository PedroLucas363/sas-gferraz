-- Structured address (CEP lookup) kept beside the single-line address used by routes.
ALTER TABLE "Client" ADD COLUMN "addressData" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Appointment" ADD COLUMN "addressData" JSONB NOT NULL DEFAULT '{}';

-- CreateTable: travel estimate between two addresses, reused by the daily route.
CREATE TABLE "RouteLeg" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "originKey" TEXT NOT NULL,
    "destinationKey" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "distanceKm" DECIMAL(10,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteLeg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RouteLeg_organizationId_originKey_destinationKey_key" ON "RouteLeg"("organizationId", "originKey", "destinationKey");

-- AddForeignKey
ALTER TABLE "RouteLeg" ADD CONSTRAINT "RouteLeg_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id");

ALTER TABLE "RouteLeg" ADD CONSTRAINT "RouteLeg_valid" CHECK ("minutes" >= 0 AND "minutes" <= 1440 AND "distanceKm" >= 0);
