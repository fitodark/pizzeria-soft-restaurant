-- AlterTable
ALTER TABLE "dias_festivos" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fecha_inactivacion" TIMESTAMP(3),
ADD COLUMN     "usuario_inactivo_id" UUID;
