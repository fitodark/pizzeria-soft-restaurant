"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import { esquemaPromocion, type DatosPromocion } from "@/lib/esquemas/promociones";
import { TipoPromocion } from "@/generated/prisma/enums";
import type { Resultado } from "@/types";

/** Normaliza el payload validado al shape de BD según el tipo de promoción. */
function aDatosBd(datos: DatosPromocion) {
  const esPaquete = datos.tipo === TipoPromocion.PAQUETE;
  const esDosPorUno = datos.tipo === TipoPromocion.DOS_POR_UNO;
  return {
    promocion: {
      nombre: datos.nombre,
      descripcion: datos.descripcion || null,
      tipo: datos.tipo,
      precioEspecial: esDosPorUno ? null : datos.precioEspecial,
      ventaDomicilio: datos.ventaDomicilio,
      ventaEstablecimiento: datos.ventaEstablecimiento,
      // PAQUETE se vende todos los días: sin temporada ni días.
      fechaInicio:
        !esPaquete && datos.fechaInicio
          ? new Date(`${datos.fechaInicio}T00:00:00.000Z`)
          : null,
      fechaFin:
        !esPaquete && datos.fechaFin
          ? new Date(`${datos.fechaFin}T00:00:00.000Z`)
          : null,
      diasSemana: esPaquete ? [] : datos.diasSemana,
      activa: datos.activa,
    },
    productos: datos.productos.map((p) => ({
      rol: p.rol,
      productoId: p.productoId,
      varianteId: p.varianteId,
      cantidad: Number(p.cantidad),
    })),
  };
}

export async function crearPromocion(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "promociones.gestionar");

  const parseo = esquemaPromocion.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { promocion, productos } = aDatosBd(parseo.data);

  await db.promocion.create({
    data: { ...promocion, productos: { create: productos } },
  });

  revalidatePath("/promociones");
  return { ok: true };
}

export async function actualizarPromocion(
  id: string,
  datos: unknown
): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "promociones.gestionar");

  const parseo = esquemaPromocion.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const existente = await db.promocion.findUnique({ where: { id } });
  if (!existente) {
    return { ok: false, error: "La promoción no existe." };
  }

  const { promocion, productos } = aDatosBd(parseo.data);

  // Las ventas referencian a la promoción (no a sus filas de producto):
  // recrear la composición es seguro.
  await db.$transaction([
    db.promocion.update({ where: { id }, data: promocion }),
    db.promocionProducto.deleteMany({ where: { promocionId: id } }),
    db.promocionProducto.createMany({
      data: productos.map((p) => ({ ...p, promocionId: id })),
    }),
  ]);

  revalidatePath("/promociones");
  revalidatePath(`/promociones/${id}`);
  return { ok: true };
}
