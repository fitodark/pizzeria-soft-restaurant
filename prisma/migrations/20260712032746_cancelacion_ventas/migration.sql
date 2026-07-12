-- AlterEnum
ALTER TYPE "OrigenMovimiento" ADD VALUE 'CANCELACION';

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "cancelada_at" TIMESTAMP(3),
ADD COLUMN     "motivo_cancelacion" TEXT,
ADD COLUMN     "usuario_cancela_id" UUID;
