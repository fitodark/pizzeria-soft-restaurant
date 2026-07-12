import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  EstatusCorte,
  EstatusVenta,
  MetodoPago,
  TipoMovimiento,
} from "@/generated/prisma/enums";

/** Corte ABIERTO de la sucursal, o null. (Único por índice parcial en BD.) */
export function corteAbierto(sucursalId: string) {
  return db.corteCaja.findFirst({
    where: { sucursalId, estatus: EstatusCorte.ABIERTO },
  });
}

export type TotalesCorte = {
  ingresos: Prisma.Decimal;
  egresos: Prisma.Decimal;
  /** Ventas cobradas por transferencia: cuentan como ingreso pero NO están
   *  en el cajón — el efectivo esperado las descuenta. */
  transferencias: Prisma.Decimal;
  transferenciasPorValidar: number;
};

/** Suma de movimientos ACTIVOS del corte (los inactivos no cuentan). */
export async function totalesCorte(corteId: string): Promise<TotalesCorte> {
  const [ingresos, egresos, transferencias, porValidar] = await Promise.all([
    db.movimientoCorte.aggregate({
      where: { corteId, activo: true, tipo: TipoMovimiento.INGRESO },
      _sum: { monto: true },
    }),
    db.movimientoCorte.aggregate({
      where: { corteId, activo: true, tipo: TipoMovimiento.EGRESO },
      _sum: { monto: true },
    }),
    db.venta.aggregate({
      where: {
        corteId,
        estatus: EstatusVenta.COBRADA,
        metodoPago: MetodoPago.TRANSFERENCIA,
      },
      _sum: { total: true },
    }),
    db.venta.count({
      where: {
        corteId,
        estatus: EstatusVenta.COBRADA,
        metodoPago: MetodoPago.TRANSFERENCIA,
        transferenciaValidada: false,
      },
    }),
  ]);
  return {
    ingresos: ingresos._sum.monto ?? new Prisma.Decimal(0),
    egresos: egresos._sum.monto ?? new Prisma.Decimal(0),
    transferencias: transferencias._sum.total ?? new Prisma.Decimal(0),
    transferenciasPorValidar: porValidar,
  };
}

/** Efectivo que debe haber en el cajón: las transferencias no entran a caja. */
export function efectivoEsperado(
  saldoInicial: Prisma.Decimal,
  totales: Pick<TotalesCorte, "ingresos" | "egresos" | "transferencias">
): Prisma.Decimal {
  return saldoInicial
    .plus(totales.ingresos)
    .minus(totales.transferencias)
    .minus(totales.egresos);
}
