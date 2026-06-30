-- CreateTable
CREATE TABLE "DebtCharge" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "chargeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebtCharge_customerId_idx" ON "DebtCharge"("customerId");

-- AddForeignKey
ALTER TABLE "DebtCharge" ADD CONSTRAINT "DebtCharge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
