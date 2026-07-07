import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type ClienteTransaccion = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/**
 * Folio consecutivo por sucursal. El UPDATE con increment toma el candado de
 * fila en folio_contadores: dos ventas simultáneas nunca comparten folio.
 * Llamar SIEMPRE dentro de la transacción que crea la venta.
 */
export async function siguienteFolio(
  tx: ClienteTransaccion | Prisma.TransactionClient,
  sucursalId: string
): Promise<number> {
  const contador = await tx.folioContador.upsert({
    where: { sucursalId },
    create: { sucursalId, siguiente: 2 },
    update: { siguiente: { increment: 1 } },
  });
  return contador.siguiente - 1;
}
