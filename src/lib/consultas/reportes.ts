import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  OrigenMovimiento,
  TipoMovimiento,
} from "@/generated/prisma/enums";

export const RANGOS = ["dia", "semana", "mes"] as const;
export type Rango = (typeof RANGOS)[number];

export function esRango(valor: string | undefined): valor is Rango {
  return RANGOS.includes(valor as Rango);
}

/** Límites del periodo actual según el rango (semana inicia lunes). */
export function limitesDeRango(rango: Rango, ahora = new Date()) {
  switch (rango) {
    case "dia":
      return { desde: startOfDay(ahora), hasta: endOfDay(ahora) };
    case "semana":
      return {
        desde: startOfWeek(ahora, { weekStartsOn: 1 }),
        hasta: endOfWeek(ahora, { weekStartsOn: 1 }),
      };
    case "mes":
      return { desde: startOfMonth(ahora), hasta: endOfMonth(ahora) };
  }
}

export type MovimientoReporte = {
  id: string;
  fecha: Date;
  sucursal: string;
  tipo: TipoMovimiento;
  origen: OrigenMovimiento;
  descripcion: string;
  monto: string;
  usuario: string;
};

export type ReporteMovimientos = {
  movimientos: MovimientoReporte[];
  totales: {
    ingresos: string;
    egresos: string;
    neto: string;
    /** Ventas cobradas por transferencia (parte de los ingresos, no en caja). */
    transferencias: string;
    /** Neto en efectivo: neto − transferencias. */
    netoEfectivo: string;
  };
  /** Monto por origen (VENTA es ingreso; el resto egresos). */
  porOrigen: Record<OrigenMovimiento, string>;
  nomina: {
    /** EGRESOs SUELDO del periodo. */
    pagado: string;
    /** Nómina activa proyectada a los días del periodo. */
    proyectada: string;
    empleados: number;
  };
};

const CERO = new Prisma.Decimal(0);

/** Sueldo de un empleado proyectado a `dias` (semana=7, mes=días del mes). */
function proyectarSueldo(
  sueldo: Prisma.Decimal,
  periodo: "DIARIO" | "SEMANAL" | "MENSUAL",
  dias: number
): Prisma.Decimal {
  switch (periodo) {
    case "DIARIO":
      return sueldo.times(dias);
    case "SEMANAL":
      return sueldo.div(7).times(dias);
    case "MENSUAL":
      return sueldo.div(30).times(dias);
  }
}

/**
 * Movimientos ACTIVOS de corte en el periodo (los inactivados no cuentan),
 * con totales, desglose por origen y comparativo de nómina.
 * `sucursalId` null = todas (solo ADMINISTRADOR llega así).
 */
export async function reporteMovimientos(
  rango: Rango,
  sucursalId: string | null
): Promise<ReporteMovimientos> {
  const { desde, hasta } = limitesDeRango(rango);

  const [movimientos, ventasTransferencia] = await Promise.all([
    db.movimientoCorte.findMany({
      where: {
        activo: true,
        createdAt: { gte: desde, lte: hasta },
        ...(sucursalId ? { corte: { sucursalId } } : {}),
      },
      include: { corte: { select: { sucursalId: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // Ingreso que no pasó por el cajón: ventas cobradas por transferencia
    db.venta.aggregate({
      where: {
        estatus: "COBRADA",
        metodoPago: "TRANSFERENCIA",
        cobradaAt: { gte: desde, lte: hasta },
        ...(sucursalId ? { sucursalId } : {}),
      },
      _sum: { total: true },
    }),
  ]);
  const transferencias = ventasTransferencia._sum.total ?? CERO;

  // MovimientoCorte no tiene relaciones a Perfil/Sucursal: cruce manual
  const idsUsuario = [...new Set(movimientos.map((m) => m.usuarioId))];
  const idsSucursal = [...new Set(movimientos.map((m) => m.corte.sucursalId))];
  const [usuarios, sucursales, empleados] = await Promise.all([
    db.perfil.findMany({
      where: { id: { in: idsUsuario } },
      select: { id: true, nombre: true },
    }),
    db.sucursal.findMany({
      where: { id: { in: idsSucursal } },
      select: { id: true, nombre: true },
    }),
    db.perfil.findMany({
      where: {
        activo: true,
        sueldo: { gt: 0 },
        ...(sucursalId ? { sucursales: { some: { sucursalId } } } : {}),
      },
      select: { sueldo: true, periodoSueldo: true },
    }),
  ]);
  const nombreUsuario = new Map(usuarios.map((u) => [u.id, u.nombre]));
  const nombreSucursal = new Map(sucursales.map((s) => [s.id, s.nombre]));

  let ingresos = CERO;
  let egresos = CERO;
  const porOrigen: Record<OrigenMovimiento, Prisma.Decimal> = {
    VENTA: CERO,
    GASTO: CERO,
    COMPRA_PROVEEDOR: CERO,
    SUELDO: CERO,
    CANCELACION: CERO,
  };
  for (const m of movimientos) {
    if (m.tipo === TipoMovimiento.INGRESO) {
      ingresos = ingresos.plus(m.monto);
    } else {
      egresos = egresos.plus(m.monto);
    }
    // CANCELACION es un par neto cero: el desglose solo cuenta la pérdida
    if (
      m.origen !== OrigenMovimiento.CANCELACION ||
      m.tipo === TipoMovimiento.EGRESO
    ) {
      porOrigen[m.origen] = porOrigen[m.origen].plus(m.monto);
    }
  }

  const dias = differenceInCalendarDays(hasta, desde) + 1;
  const proyectada = empleados.reduce(
    (suma, e) => suma.plus(proyectarSueldo(e.sueldo, e.periodoSueldo, dias)),
    CERO
  );

  return {
    movimientos: movimientos.map((m) => ({
      id: m.id,
      fecha: m.createdAt,
      sucursal: nombreSucursal.get(m.corte.sucursalId) ?? "?",
      tipo: m.tipo,
      origen: m.origen,
      descripcion: m.descripcion,
      monto: m.monto.toString(),
      usuario: nombreUsuario.get(m.usuarioId) ?? "?",
    })),
    totales: {
      ingresos: ingresos.toFixed(2),
      egresos: egresos.toFixed(2),
      neto: ingresos.minus(egresos).toFixed(2),
      transferencias: transferencias.toFixed(2),
      netoEfectivo: ingresos.minus(egresos).minus(transferencias).toFixed(2),
    },
    porOrigen: {
      VENTA: porOrigen.VENTA.toFixed(2),
      GASTO: porOrigen.GASTO.toFixed(2),
      COMPRA_PROVEEDOR: porOrigen.COMPRA_PROVEEDOR.toFixed(2),
      SUELDO: porOrigen.SUELDO.toFixed(2),
      CANCELACION: porOrigen.CANCELACION.toFixed(2),
    },
    nomina: {
      pagado: porOrigen.SUELDO.toFixed(2),
      proyectada: proyectada.toFixed(2),
      empleados: empleados.length,
    },
  };
}
