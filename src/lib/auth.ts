import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { crearClienteSupabaseServer } from "@/lib/supabase/server";
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
 * no hay sesión o el perfil está inactivo.
 */
export const getPerfilAutenticado = cache(async () => {
  const supabase = await crearClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const perfil = await db.perfil.findUnique({
    where: { id: user.id },
    include: { sucursales: { include: { sucursal: true } } },
  });
  if (!perfil || !perfil.activo) {
    redirect("/login");
  }
  return perfil;
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
