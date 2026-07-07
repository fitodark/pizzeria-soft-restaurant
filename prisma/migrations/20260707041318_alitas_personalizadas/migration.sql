-- AlterEnum
ALTER TYPE "TipoLinea" ADD VALUE 'ALITAS_PERSONALIZADAS';

-- AlterTable
ALTER TABLE "producto_variantes" ADD COLUMN     "max_sabores" INTEGER NOT NULL DEFAULT 1;
