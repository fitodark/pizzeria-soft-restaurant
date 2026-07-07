"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import { esquemaProducto } from "@/lib/esquemas/productos";
import { Prisma } from "@/generated/prisma/client";
import type { Resultado } from "@/types";

function esTamanoDuplicado(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

export async function crearProducto(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "productos.gestionar");

  const parseo = esquemaProducto.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { variantes, descripcion, ...producto } = parseo.data;

  await db.producto.create({
    data: {
      ...producto,
      descripcion: descripcion || null,
      variantes: {
        create: variantes.map((v) => ({
          tamano: v.tamano,
          precio: v.precio,
          maxSabores: v.maxSabores,
          activa: v.activa,
        })),
      },
    },
  });

  revalidatePath("/productos");
  return { ok: true };
}

export async function actualizarProducto(
  id: string,
  datos: unknown
): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "productos.gestionar");

  const parseo = esquemaProducto.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { variantes, descripcion, ...producto } = parseo.data;

  const existente = await db.producto.findUnique({
    where: { id },
    include: { variantes: true },
  });
  if (!existente) {
    return { ok: false, error: "El producto no existe." };
  }

  // Las variantes pueden estar referenciadas por ventas pasadas (snapshot):
  // nunca se borran físicamente — las que ya no vienen se desactivan.
  const idsEnviados = new Set(
    variantes.filter((v) => v.id).map((v) => v.id as string)
  );

  try {
    await db.$transaction(async (tx) => {
      await tx.producto.update({
        where: { id },
        data: { ...producto, descripcion: descripcion || null },
      });
      for (const variante of variantes) {
        if (variante.id) {
          await tx.productoVariante.update({
            where: { id: variante.id },
            data: {
              tamano: variante.tamano,
              precio: variante.precio,
              maxSabores: variante.maxSabores,
              activa: variante.activa,
            },
          });
        } else {
          await tx.productoVariante.create({
            data: {
              productoId: id,
              tamano: variante.tamano,
              precio: variante.precio,
              maxSabores: variante.maxSabores,
              activa: variante.activa,
            },
          });
        }
      }
      const aDesactivar = existente.variantes.filter(
        (v) => !idsEnviados.has(v.id) && v.activa
      );
      if (aDesactivar.length > 0) {
        await tx.productoVariante.updateMany({
          where: { id: { in: aDesactivar.map((v) => v.id) } },
          data: { activa: false },
        });
      }
    });
  } catch (e) {
    if (esTamanoDuplicado(e)) {
      return {
        ok: false,
        error:
          "Ese tamaño ya existe en el producto (quizá en una variante desactivada).",
      };
    }
    throw e;
  }

  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  return { ok: true };
}
