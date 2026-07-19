import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  COOKIE_SESION,
  HORAS_SESION,
  expiracionSesion,
  hashearTokenSesion,
} from "@/lib/sesiones";
import { Rol } from "@/generated/prisma/enums";

export const COOKIE_SUCURSAL = "sucursal_activa";

export type Sesion = {
  usuario: { id: string; nombre: string; rol: Rol };
  rol: Rol;
  sucursalId: string;
};

/**
 * Usuario autenticado con perfil activo, sin exigir sucursal seleccionada.
 * Para /seleccionar-sucursal y las acciones de sesión. Redirige a /login si
 * no hay sesión válida en BD o el perfil está inactivo.
 */
export const getPerfilAutenticado = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESION)?.value;
  if (!token) {
    redirect("/login");
  }

  const ahora = new Date();
  const sesionBd = await db.sesion.findUnique({
    where: { tokenHash: hashearTokenSesion(token) },
    include: {
      usuario: { include: { sucursales: { include: { sucursal: true } } } },
    },
  });
  if (
    !sesionBd ||
    sesionBd.revocadaAt ||
    sesionBd.expiraAt <= ahora ||
    !sesionBd.usuario.activo
  ) {
    redirect("/login");
  }

  // Expiración deslizante: se extiende a 12 h desde el último uso, pero solo
  // cuando ya se consumió más de una hora (evita un UPDATE por cada request).
  const msRestantes = sesionBd.expiraAt.getTime() - ahora.getTime();
  if (msRestantes < (HORAS_SESION - 1) * 60 * 60 * 1000) {
    await db.sesion.update({
      where: { id: sesionBd.id },
      data: { expiraAt: expiracionSesion(ahora) },
    });
  }

  return sesionBd.usuario;
});

/** Sucursales donde el usuario puede laborar (admin: todas las activas). */
export async function sucursalesDisponibles(
  perfil: Awaited<ReturnType<typeof getPerfilAutenticado>>
) {
  if (perfil.rol === Rol.ADMINISTRADOR) {
    return db.sucursal.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
    });
  }
  return perfil.sucursales
    .map((us) => us.sucursal)
    .filter((s) => s.activa)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Sesión completa para operar: usuario + rol + sucursal activa validada.
 * Redirige a /login sin sesión y a /seleccionar-sucursal si la cookie falta
 * o quedó obsoleta (sucursal inactiva o ya no asignada).
 */
export const getSesion = cache(async (): Promise<Sesion> => {
  const perfil = await getPerfilAutenticado();

  const cookieStore = await cookies();
  const sucursalId = cookieStore.get(COOKIE_SUCURSAL)?.value;
  if (!sucursalId) {
    redirect("/seleccionar-sucursal");
  }

  const disponibles = await sucursalesDisponibles(perfil);
  if (!disponibles.some((s) => s.id === sucursalId)) {
    redirect("/seleccionar-sucursal");
  }

  return {
    usuario: { id: perfil.id, nombre: perfil.nombre, rol: perfil.rol },
    rol: perfil.rol,
    sucursalId,
  };
});
