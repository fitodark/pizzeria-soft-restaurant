-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "grupo_extras" TEXT[] DEFAULT ARRAY[]::TEXT[];
