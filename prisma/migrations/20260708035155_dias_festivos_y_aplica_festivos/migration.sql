-- AlterTable
ALTER TABLE "promociones" ADD COLUMN     "aplica_festivos" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "dias_festivos" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dias_festivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dias_festivos_fecha_key" ON "dias_festivos"("fecha");
