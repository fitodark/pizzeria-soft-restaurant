"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import {
  esquemaConfiguracion,
  esquemaPrueba,
} from "@/lib/esquemas/configuracion";
import { enviarBuffer } from "@/lib/impresion/escpos";
import { ticketPrueba } from "@/lib/impresion/tickets";
import type { Resultado } from "@/types";

/** Guarda (upsert) la configuración de impresión de la sucursal activa. */
export async function guardarConfiguracion(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "configuracion.gestionar");

  const parseo = esquemaConfiguracion.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const config = {
    ...parseo.data,
    logoUrl: parseo.data.logoUrl || null,
    leyendaPie: parseo.data.leyendaPie || null,
  };

  await db.configuracionSucursal.upsert({
    where: { sucursalId: sesion.sucursalId },
    create: { sucursalId: sesion.sucursalId, ...config },
    update: config,
  });

  revalidatePath("/configuracion");
  return { ok: true };
}

/**
 * Imprime un ticket de prueba con los valores del formulario (sin guardar):
 * permite verificar la impresora antes de confirmar la configuración.
 */
export async function probarImpresora(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "configuracion.gestionar");

  const parseo = esquemaPrueba.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const sucursal = await db.sucursal.findUnique({
    where: { id: sesion.sucursalId },
    select: { nombre: true },
  });

  const buffer = ticketPrueba({
    sucursal: sucursal?.nombre ?? "Sucursal",
    impresora: parseo.data.impresora,
    fecha: new Date(),
  });
  try {
    await enviarBuffer(parseo.data.modo, parseo.data.ruta, buffer);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo imprimir la prueba.",
    };
  }
}
