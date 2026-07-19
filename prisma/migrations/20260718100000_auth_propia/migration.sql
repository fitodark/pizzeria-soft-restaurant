-- AlterTable: credenciales locales en perfiles (Fase 1 local-first)
ALTER TABLE "perfiles" ADD COLUMN     "email" TEXT;
ALTER TABLE "perfiles" ADD COLUMN     "password_hash" TEXT;
ALTER TABLE "perfiles" ADD COLUMN     "intentos_fallidos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "perfiles" ADD COLUMN     "bloqueado_hasta" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_email_key" ON "perfiles"("email");

-- CreateTable
CREATE TABLE "sesiones" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "expira_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocada_at" TIMESTAMP(3),

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_token_hash_key" ON "sesiones"("token_hash");
CREATE INDEX "sesiones_usuario_id_idx" ON "sesiones"("usuario_id");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "perfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS (consistente con el resto del esquema; el dueño de la tabla la omite)
ALTER TABLE "sesiones" ENABLE ROW LEVEL SECURITY;
