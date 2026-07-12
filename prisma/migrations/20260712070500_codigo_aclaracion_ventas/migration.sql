-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "codigo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ventas_codigo_key" ON "ventas"("codigo");
