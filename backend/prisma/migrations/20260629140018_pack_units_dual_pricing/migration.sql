-- CreateEnum
CREATE TYPE "SaleMode" AS ENUM ('PIECE', 'PACK');

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "costPerPack" DECIMAL(14,2),
ADD COLUMN     "packSalePrice" DECIMAL(14,2),
ALTER COLUMN "costPricePerUnit" SET DATA TYPE DECIMAL(14,4);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "packSalePrice" DECIMAL(14,2),
ADD COLUMN     "packUnit" TEXT;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "packCount" DECIMAL(14,3),
ADD COLUMN     "saleMode" "SaleMode" NOT NULL DEFAULT 'PIECE';

