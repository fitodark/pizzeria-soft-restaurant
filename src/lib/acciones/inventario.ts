"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import { esquemaAjusteInventario } from "@/lib/esquemas/inventario";
import { Prisma } from "@/generated/prisma/client";
import type { Resultado } from "@/types";

export async function ajustarInventario(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "inventario.ajustar");

  const parseo = esquemaAjusteInventario.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { productoId, nuevaExistencia, motivo } = parseo.data;

  const producto = await db.producto.findUnique({ where: { id: productoId } });
  if (!producto || !producto.inventariable) {
    return { ok: false, error: "El producto no existe o no es inventariable." };
  }

  await db.$transaction(async (tx) => {
    const actual = await tx.inventario.findUnique({
      where: {
        sucursalId_productoId: { sucursalId: sesion.sucursalId, productoId },
      },
    });
    const existenciaActual = actual?.existencia ?? new Prisma.Decimal(0);
    const nueva = new Prisma.Decimal(nuevaExistencia);

    await tx.inventario.upsert({
      where: {
        sucursalId_productoId: { sucursalId: sesion.sucursalId, productoId },
      },
      create: {
        sucursalId: sesion.sucursalId,
        productoId,
        existencia: nueva,
      },
      update: { existencia: nueva },
    });

    // La cantidad del movimiento siempre es positiva; la dirección y el
    // conteo anterior quedan en la referencia para auditoría.
    await tx.movimientoInventario.create({
      data: {
        sucursalId: sesion.sucursalId,
        productoId,
        tipo: "AJUSTE",
        cantidad: nueva.minus(existenciaActual).abs(),
        referencia: `${motivo} (${existenciaActual.toString()} → ${nueva.toString()})`,
        usuarioId: sesion.usuario.id,
      },
    });
  });

  revalidatePath("/inventario");
  return { ok: true };
}
