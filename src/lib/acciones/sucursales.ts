"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import { esquemaSucursal } from "@/lib/esquemas/sucursales";
import type { Resultado } from "@/types";

export async function crearSucursal(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "sucursales.gestionar");

  const parseo = esquemaSucursal.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await db.sucursal.create({
    data: {
      ...parseo.data,
      // Cada sucursal nueva arranca con su contador de folios.
      folios: { create: { siguiente: 1 } },
    },
  });

  revalidatePath("/sucursales");
  return { ok: true };
}

export async function actualizarSucursal(
  id: string,
  datos: unknown
): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "sucursales.gestionar");

  const parseo = esquemaSucursal.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const existente = await db.sucursal.findUnique({ where: { id } });
  if (!existente) {
    return { ok: false, error: "La sucursal no existe." };
  }

  await db.sucursal.update({ where: { id }, data: parseo.data });

  revalidatePath("/sucursales");
  revalidatePath(`/sucursales/${id}`);
  return { ok: true };
}
