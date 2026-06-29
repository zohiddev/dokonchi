-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "deliveryId" INTEGER;

-- AlterTable
ALTER TABLE "SupplierPayment" ADD COLUMN     "deliveryId" INTEGER;

-- CreateTable
CREATE TABLE "Delivery" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Delivery_receivedDate_idx" ON "Delivery"("receivedDate");

-- CreateIndex
CREATE INDEX "Batch_deliveryId_idx" ON "Batch"("deliveryId");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: har bir mavjud Batch uchun bittadan Delivery yaratib, batchni unga bog'laymiz.
-- Shunda "har bir batch yetkazmaga tegishli" invarianti saqlanadi (sahifa faqat Delivery o'qiydi).
DO $$
DECLARE
  b RECORD;
  d_id INTEGER;
BEGIN
  FOR b IN SELECT "id", "supplierId", "receivedDate", "weekLabel", "createdAt" FROM "Batch" WHERE "deliveryId" IS NULL LOOP
    INSERT INTO "Delivery" ("supplierId", "receivedDate", "weekLabel", "createdAt")
    VALUES (b."supplierId", b."receivedDate", b."weekLabel", b."createdAt")
    RETURNING "id" INTO d_id;
    UPDATE "Batch" SET "deliveryId" = d_id WHERE "id" = b."id";
  END LOOP;
END $$;
