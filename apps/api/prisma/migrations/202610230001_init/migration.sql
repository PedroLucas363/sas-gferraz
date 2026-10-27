-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "birthday" DATE,
    "address" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "preferences" TEXT NOT NULL DEFAULT '',
    "consentPhotos" BOOLEAN NOT NULL DEFAULT false,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "duration" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "eventId" UUID,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "actualDuration" INTEGER,
    "address" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL,
    "extra" DECIMAL(14,2) NOT NULL,
    "travelFee" DECIMAL(14,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentItem" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "serviceName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "AppointmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "receivedAt" DATE NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "fee" DECIMAL(14,2) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "allocationId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "refundedOn" DATE NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "appointmentId" UUID,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "incurredOn" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidOn" DATE,
    "kind" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "fuel" TEXT NOT NULL,
    "kmPerLiter" DECIMAL(10,3) NOT NULL,
    "fuelPrice" DECIMAL(14,2) NOT NULL,
    "annualKm" INTEGER NOT NULL,
    "insurance" DECIMAL(14,2) NOT NULL,
    "maintenance" DECIMAL(14,2) NOT NULL,
    "tires" DECIMAL(14,2) NOT NULL,
    "oil" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,
    "depreciation" DECIMAL(14,2) NOT NULL,
    "other" DECIMAL(14,2) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "distanceKm" DECIMAL(10,2) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "parking" DECIMAL(14,2) NOT NULL,
    "toll" DECIMAL(14,2) NOT NULL,
    "estimatedCost" DECIMAL(14,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "appointmentId" UUID,
    "relativePath" TEXT NOT NULL,
    "thumbnailPath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "report" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportReceipt" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,

    CONSTRAINT "ImportReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_organizationId_id_key" ON "User"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Client_organizationId_name_idx" ON "Client"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Client_organizationId_id_key" ON "Client"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Service_organizationId_category_idx" ON "Service"("organizationId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Service_organizationId_id_key" ON "Service"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Event_organizationId_id_key" ON "Event"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_startsAt_idx" ON "Appointment"("organizationId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_organizationId_id_key" ON "Appointment"("organizationId", "id");

-- CreateIndex
CREATE INDEX "AppointmentItem_organizationId_appointmentId_idx" ON "AppointmentItem"("organizationId", "appointmentId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_receivedAt_idx" ON "Payment"("organizationId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_organizationId_id_key" ON "Payment"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Allocation_organizationId_id_key" ON "Allocation"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Allocation_paymentId_appointmentId_key" ON "Allocation"("paymentId", "appointmentId");

-- CreateIndex
CREATE INDEX "Refund_organizationId_refundedOn_idx" ON "Refund"("organizationId", "refundedOn");

-- CreateIndex
CREATE INDEX "Expense_organizationId_incurredOn_idx" ON "Expense"("organizationId", "incurredOn");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_organizationId_id_key" ON "Expense"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_organizationId_id_key" ON "Vehicle"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Trip_organizationId_appointmentId_idx" ON "Trip"("organizationId", "appointmentId");

-- CreateIndex
CREATE INDEX "Media_organizationId_clientId_idx" ON "Media"("organizationId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_organizationId_id_key" ON "Media"("organizationId", "id");

-- CreateIndex
CREATE INDEX "SavedView_organizationId_entity_idx" ON "SavedView"("organizationId", "entity");

-- CreateIndex
CREATE INDEX "Audit_organizationId_createdAt_idx" ON "Audit"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_organizationId_checksum_key" ON "ImportBatch"("organizationId", "checksum");

-- CreateIndex
CREATE UNIQUE INDEX "ImportReceipt_organizationId_sourceKey_key" ON "ImportReceipt"("organizationId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "ImportReceipt_organizationId_fingerprint_key" ON "ImportReceipt"("organizationId", "fingerprint");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_clientId_fkey" FOREIGN KEY ("organizationId", "clientId") REFERENCES "Client"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_eventId_fkey" FOREIGN KEY ("organizationId", "eventId") REFERENCES "Event"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentItem" ADD CONSTRAINT "AppointmentItem_organizationId_appointmentId_fkey" FOREIGN KEY ("organizationId", "appointmentId") REFERENCES "Appointment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentItem" ADD CONSTRAINT "AppointmentItem_organizationId_serviceId_fkey" FOREIGN KEY ("organizationId", "serviceId") REFERENCES "Service"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_clientId_fkey" FOREIGN KEY ("organizationId", "clientId") REFERENCES "Client"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_organizationId_paymentId_fkey" FOREIGN KEY ("organizationId", "paymentId") REFERENCES "Payment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_organizationId_appointmentId_fkey" FOREIGN KEY ("organizationId", "appointmentId") REFERENCES "Appointment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_organizationId_paymentId_fkey" FOREIGN KEY ("organizationId", "paymentId") REFERENCES "Payment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_organizationId_allocationId_fkey" FOREIGN KEY ("organizationId", "allocationId") REFERENCES "Allocation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_appointmentId_fkey" FOREIGN KEY ("organizationId", "appointmentId") REFERENCES "Appointment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_organizationId_appointmentId_fkey" FOREIGN KEY ("organizationId", "appointmentId") REFERENCES "Appointment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_organizationId_vehicleId_fkey" FOREIGN KEY ("organizationId", "vehicleId") REFERENCES "Vehicle"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_organizationId_clientId_fkey" FOREIGN KEY ("organizationId", "clientId") REFERENCES "Client"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_organizationId_appointmentId_fkey" FOREIGN KEY ("organizationId", "appointmentId") REFERENCES "Appointment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Organization boundaries are also enforced in PostgreSQL, including tables without ORM relations.
ALTER TABLE "User" ADD CONSTRAINT "User_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id");
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id");
ALTER TABLE "Service" ADD CONSTRAINT "Service_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id");
ALTER TABLE "Event" ADD CONSTRAINT "Event_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id");
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id");
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id");
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id");
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id");
ALTER TABLE "ImportReceipt" ADD CONSTRAINT "ImportReceipt_batch_fk" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id");
ALTER TABLE "Service" ADD CONSTRAINT "Service_price_positive" CHECK (price >= 0 AND duration > 0);
ALTER TABLE "AppointmentItem" ADD CONSTRAINT "Item_amount_positive" CHECK ("unitPrice" >= 0 AND quantity > 0);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_valid" CHECK (discount >= 0 AND extra >= 0 AND "travelFee" >= 0 AND duration > 0 AND status IN ('quote','pending','confirmed','in_progress','completed','cancelled','no_show'));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive" CHECK (amount > 0 AND fee >= 0 AND fee <= amount);
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_amount_positive" CHECK (amount > 0);
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK (amount > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_positive" CHECK (amount > 0);
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_valid" CHECK ("kmPerLiter" > 0 AND "annualKm" > 0);
