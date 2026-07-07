"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import { corteAbierto } from "@/lib/consultas/cortes";
import { esquemaCompra } from "@/lib/esquemas/compras";
import { Prisma } from "@/generated/prisma/client";
import {
  OrigenMovimiento,
  TipoMovimiento,
  TipoMovInventario,
} from "@/generated/prisma/enums";
import type { Resultado } from "@/types";

export async function registrarCompraProveedor(
  datos: unknown
): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "compras.registrar");

  const parseo = esquemaCompra.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { proveedor, folioNota, detalles } = parseo.data;

  const corte = await corteAbierto(sesion.sucursalId);
  if (!corte) {
    return { ok: false, error: "Abra un corte de caja para registrar compras." };
  }

  // Validar que las partidas con producto referencien productos reales.
  const productoIds = detalles
    .map((d) => d.productoId)
    .filter((id): id is string => Boolean(id));
  if (productoIds.length > 0) {
    const existentes = await db.producto.count({
      where: { id: { in: productoIds } },
    });
    if (existentes !== new Set(productoIds).size) {
      return { ok: false, error: "Alguna partida referencia un producto inexistente." };
    }
  }

  // El total SIEMPRE se calcula en servidor (Decimal, nunca float).
  const total = detalles.reduce(
    (suma, d) =>
      suma.plus(new Prisma.Decimal(d.cantidad).times(d.precioUnitario)),
    new Prisma.Decimal(0)
  );

  await db.$transaction(async (tx) => {
    const compra = await tx.compraProveedor.create({
      data: {
        corteId: corte.id,
        proveedor,
        folioNota: folioNota || null,
        total,
        usuarioId: sesion.usuario.id,
        detalles: {
          create: detalles.map((d) => ({
            productoId: d.productoId,
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            sumaInventario: d.sumaInventario,
          })),
        },
      },
    });

    await tx.movimientoCorte.create({
      data: {
        corteId: corte.id,
        tipo: TipoMovimiento.EGRESO,
        origen: OrigenMovimiento.COMPRA_PROVEEDOR,
        descripcion: `Compra proveedor — ${proveedor}`,
        monto: total,
        usuarioId: sesion.usuario.id,
        compraId: compra.id,
      },
    });

    for (const detalle of detalles) {
      if (!detalle.sumaInventario || !detalle.productoId) {
        continue;
      }
      await tx.inventario.upsert({
        where: {
          sucursalId_productoId: {
            sucursalId: sesion.sucursalId,
            productoId: detalle.productoId,
          },
        },
        create: {
          sucursalId: sesion.sucursalId,
          productoId: detalle.productoId,
          existencia: detalle.cantidad,
        },
        update: { existencia: { increment: detalle.cantidad } },
      });
      await tx.movimientoInventario.create({
        data: {
          sucursalId: sesion.sucursalId,
          productoId: detalle.productoId,
          tipo: TipoMovInventario.ENTRADA,
          cantidad: detalle.cantidad,
          referencia: compra.id,
          usuarioId: sesion.usuario.id,
        },
      });
    }
  });

  revalidatePath("/cortes");
  revalidatePath(`/cortes/${corte.id}`);
  revalidatePath("/inventario");
  return { ok: true };
}
