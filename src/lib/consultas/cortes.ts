import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { EstatusCorte, TipoMovimiento } from "@/generated/prisma/enums";

/** Corte ABIERTO de la sucursal, o null. (Único por índice parcial en BD.) */
export function corteAbierto(sucursalId: string) {
  return db.corteCaja.findFirst({
    where: { sucursalId, estatus: EstatusCorte.ABIERTO },
  });
}

export type TotalesCorte = {
  ingresos: Prisma.Decimal;
  egresos: Prisma.Decimal;
};

/** Suma de movimientos ACTIVOS del corte (los inactivos no cuentan). */
export async function totalesCorte(corteId: string): Promise<TotalesCorte> {
  const [ingresos, egresos] = await Promise.all([
    db.movimientoCorte.aggregate({
      where: { corteId, activo: true, tipo: TipoMovimiento.INGRESO },
      _sum: { monto: true },
    }),
    db.movimientoCorte.aggregate({
      where: { corteId, activo: true, tipo: TipoMovimiento.EGRESO },
      _sum: { monto: true },
    }),
  ]);
  return {
    ingresos: ingresos._sum.monto ?? new Prisma.Decimal(0),
    egresos: egresos._sum.monto ?? new Prisma.Decimal(0),
  };
}
