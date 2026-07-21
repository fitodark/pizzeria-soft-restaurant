"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import { esquemaDiaFestivo } from "@/lib/esquemas/festivos";
import type { Resultado } from "@/types";

/** Alta de un día festivo (catálogo global — aplica a todas las sucursales). */
export async function crearDiaFestivo(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "festivos.gestionar");

  const parseo = esquemaDiaFestivo.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  // @db.Date como medianoche UTC, igual que las temporadas de promociones
  const fecha = new Date(`${parseo.data.fecha}T00:00:00.000Z`);

  const existente = await db.diaFestivo.findUnique({ where: { fecha } });
  if (existente?.activo) {
    return { ok: false, error: "Esa fecha ya está registrada como día festivo." };
  }

  if (existente) {
    // Fecha reactivada tras una inactivación previa: reusar el registro
    // (fecha es única) en vez de duplicar, y limpiar el rastro de auditoría.
    await db.diaFestivo.update({
      where: { id: existente.id },
      data: {
        descripcion: parseo.data.descripcion,
        activo: true,
        usuarioInactivoId: null,
        fechaInactivacion: null,
      },
    });
  } else {
    await db.diaFestivo.create({
      data: { fecha, descripcion: parseo.data.descripcion },
    });
  }

  revalidatePath("/configuracion");
  return { ok: true };
}

/** Inactiva un día festivo del catálogo (las promociones vuelven a aplicar). */
export async function eliminarDiaFestivo(datos: {
  id: string;
}): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "festivos.gestionar");

  const festivo = await db.diaFestivo.findUnique({ where: { id: datos.id } });
  if (!festivo || !festivo.activo) {
    return { ok: false, error: "El día festivo no existe." };
  }

  await db.diaFestivo.update({
    where: { id: datos.id },
    data: {
      activo: false,
      usuarioInactivoId: sesion.usuario.id,
      fechaInactivacion: new Date(),
    },
  });

  revalidatePath("/configuracion");
  return { ok: true };
}
