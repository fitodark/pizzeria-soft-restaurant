"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import { corteAbierto } from "@/lib/consultas/cortes";
import {
  esquemaAbrirCorte,
  esquemaCerrarCorte,
  esquemaGasto,
  esquemaSueldo,
} from "@/lib/esquemas/cortes";
import { Prisma } from "@/generated/prisma/client";
import {
  EstatusCorte,
  EstatusVenta,
  OrigenMovimiento,
  TipoMovimiento,
} from "@/generated/prisma/enums";
import type { Resultado } from "@/types";

export async function abrirCorte(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "cortes.abrir");

  const parseo = esquemaAbrirCorte.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    await db.corteCaja.create({
      data: {
        sucursalId: sesion.sucursalId,
        saldoInicial: parseo.data.saldoInicial,
        usuarioAperturaId: sesion.usuario.id,
      },
    });
  } catch (e) {
    // Índice único parcial: un solo corte ABIERTO por sucursal.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya hay un corte abierto en esta sucursal." };
    }
    throw e;
  }

  revalidatePath("/cortes");
  return { ok: true };
}

export async function registrarGasto(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "gastos.registrar");

  const parseo = esquemaGasto.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const corte = await corteAbierto(sesion.sucursalId);
  if (!corte) {
    return { ok: false, error: "Abra un corte de caja para registrar gastos." };
  }

  await db.movimientoCorte.create({
    data: {
      corteId: corte.id,
      tipo: TipoMovimiento.EGRESO,
      origen: OrigenMovimiento.GASTO,
      descripcion: parseo.data.descripcion,
      monto: parseo.data.monto,
      usuarioId: sesion.usuario.id,
    },
  });

  revalidatePath("/cortes");
  revalidatePath(`/cortes/${corte.id}`);
  return { ok: true };
}

export async function inactivarGasto(movimientoId: string): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "gastos.inactivar");

  const movimiento = await db.movimientoCorte.findUnique({
    where: { id: movimientoId },
    include: { corte: true },
  });
  if (!movimiento || movimiento.origen !== OrigenMovimiento.GASTO) {
    return { ok: false, error: "El gasto no existe." };
  }
  if (!movimiento.activo) {
    return { ok: false, error: "El gasto ya está inactivo." };
  }
  if (movimiento.corte.estatus !== EstatusCorte.ABIERTO) {
    return { ok: false, error: "El corte ya está cerrado; no se puede modificar." };
  }
  if (movimiento.corte.sucursalId !== sesion.sucursalId) {
    return { ok: false, error: "El gasto pertenece a otra sucursal." };
  }

  // Nada se borra: el monto regresa al corte y queda la auditoría.
  await db.movimientoCorte.update({
    where: { id: movimientoId },
    data: {
      activo: false,
      usuarioInactivoId: sesion.usuario.id,
      fechaInactivacion: new Date(),
    },
  });

  revalidatePath("/cortes");
  revalidatePath(`/cortes/${movimiento.corteId}`);
  return { ok: true };
}

export async function registrarSueldo(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "sueldos.registrar");

  const parseo = esquemaSueldo.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const corte = await corteAbierto(sesion.sucursalId);
  if (!corte) {
    return { ok: false, error: "Abra un corte de caja para registrar sueldos." };
  }

  const empleado = await db.perfil.findUnique({
    where: { id: parseo.data.empleadoId },
  });
  if (!empleado || !empleado.activo) {
    return { ok: false, error: "El empleado no existe o está inactivo." };
  }

  await db.movimientoCorte.create({
    data: {
      corteId: corte.id,
      tipo: TipoMovimiento.EGRESO,
      origen: OrigenMovimiento.SUELDO,
      descripcion: `Sueldo — ${empleado.nombre}`,
      monto: parseo.data.monto,
      usuarioId: sesion.usuario.id,
      empleadoId: empleado.id,
    },
  });

  revalidatePath("/cortes");
  revalidatePath(`/cortes/${corte.id}`);
  return { ok: true };
}

export async function cerrarCorte(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "cortes.cerrar");

  const parseo = esquemaCerrarCorte.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const corte = await corteAbierto(sesion.sucursalId);
  if (!corte) {
    return { ok: false, error: "No hay un corte abierto en esta sucursal." };
  }

  // Snapshot de totales dentro de la transacción para no perder movimientos
  // concurrentes entre el cálculo y el cierre.
  const resultado = await db.$transaction(async (tx) => {
    const ventasPendientes = await tx.venta.count({
      where: { corteId: corte.id, estatus: EstatusVenta.PENDIENTE },
    });
    if (ventasPendientes > 0) {
      return {
        ok: false as const,
        error: `Hay ${ventasPendientes} venta(s) pendiente(s) por cobrar o cancelar.`,
      };
    }

    const [ingresos, egresos] = await Promise.all([
      tx.movimientoCorte.aggregate({
        where: { corteId: corte.id, activo: true, tipo: TipoMovimiento.INGRESO },
        _sum: { monto: true },
      }),
      tx.movimientoCorte.aggregate({
        where: { corteId: corte.id, activo: true, tipo: TipoMovimiento.EGRESO },
        _sum: { monto: true },
      }),
    ]);
    const totalIngresos = ingresos._sum.monto ?? new Prisma.Decimal(0);
    const totalEgresos = egresos._sum.monto ?? new Prisma.Decimal(0);
    const saldoFinal = corte.saldoInicial.plus(totalIngresos).minus(totalEgresos);

    await tx.corteCaja.update({
      where: { id: corte.id },
      data: {
        estatus: EstatusCorte.CERRADO,
        usuarioCierreId: sesion.usuario.id,
        fechaCierre: new Date(),
        totalIngresos,
        totalEgresos,
        saldoFinal,
        notasCierre: parseo.data.notasCierre || null,
      },
    });
    return { ok: true as const };
  });

  if (!resultado.ok) {
    return resultado;
  }

  revalidatePath("/cortes");
  revalidatePath(`/cortes/${corte.id}`);
  return { ok: true };
}
