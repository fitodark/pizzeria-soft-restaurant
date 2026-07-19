"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  COOKIE_SUCURSAL,
  getPerfilAutenticado,
  sucursalesDisponibles,
} from "@/lib/auth";
import {
  COOKIE_SESION,
  expiracionSesion,
  generarTokenSesion,
  hashearTokenSesion,
} from "@/lib/sesiones";
import { Rol } from "@/generated/prisma/enums";

export type EstadoLogin = { error: string } | null;

const esquemaLogin = z.object({
  email: z.email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

// Límite de intentos: tras 5 fallos seguidos el usuario espera 5 minutos.
const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 5;

export async function iniciarSesion(
  _estadoPrevio: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  const datos = esquemaLogin.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!datos.success) {
    return { error: datos.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const perfil = await db.perfil.findUnique({
    where: { email: datos.data.email.toLowerCase() },
    include: { sucursales: { include: { sucursal: true } } },
  });
  // Mensaje único para correo inexistente, sin credenciales locales o
  // contraseña errónea: no revelar cuál de los tres falló.
  if (!perfil || !perfil.passwordHash) {
    return { error: "Correo o contraseña incorrectos." };
  }

  const ahora = new Date();
  if (perfil.bloqueadoHasta && perfil.bloqueadoHasta > ahora) {
    const minutos = Math.ceil(
      (perfil.bloqueadoHasta.getTime() - ahora.getTime()) / 60000
    );
    return {
      error: `Demasiados intentos fallidos. Espera ${minutos} min e inténtalo de nuevo.`,
    };
  }

  const passwordCorrecta = await bcrypt.compare(
    datos.data.password,
    perfil.passwordHash
  );
  if (!passwordCorrecta) {
    const intentos = perfil.intentosFallidos + 1;
    await db.perfil.update({
      where: { id: perfil.id },
      data:
        intentos >= MAX_INTENTOS
          ? {
              intentosFallidos: 0,
              bloqueadoHasta: new Date(
                ahora.getTime() + MINUTOS_BLOQUEO * 60000
              ),
            }
          : { intentosFallidos: intentos },
    });
    return { error: "Correo o contraseña incorrectos." };
  }

  if (!perfil.activo) {
    return { error: "Tu usuario está inactivo. Contacta al administrador." };
  }

  const tieneSucursalActiva = perfil.sucursales.some((us) => us.sucursal.activa);
  if (perfil.rol !== Rol.ADMINISTRADOR && !tieneSucursalActiva) {
    return { error: "Sin sucursal asignada, contacta al administrador." };
  }

  // Credenciales válidas: crear la sesión propia (token en cookie, hash en BD)
  const token = generarTokenSesion();
  await db.$transaction([
    db.perfil.update({
      where: { id: perfil.id },
      data: { intentosFallidos: 0, bloqueadoHasta: null },
    }),
    db.sesion.create({
      data: {
        tokenHash: hashearTokenSesion(token),
        usuarioId: perfil.id,
        expiraAt: expiracionSesion(ahora),
      },
    }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // El POS corre en la LAN por http (sin TLS); secure bloquearía la cookie.
    secure: false,
    // La vigencia real (12 h deslizantes) la gobierna expira_at en BD; la
    // cookie solo debe sobrevivirla para que el deslizamiento surta efecto.
    maxAge: 60 * 60 * 24 * 30,
  });

  // Una sola sucursal disponible: entrar directo, sin preguntar
  const disponibles = await sucursalesDisponibles(perfil);
  if (disponibles.length === 1) {
    await activarSucursal(disponibles[0].id);
    redirect("/");
  }
  redirect("/seleccionar-sucursal");
}

/** Fija la sucursal activa del turno en la cookie que valida getSesion. */
async function activarSucursal(sucursalId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SUCURSAL, sucursalId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // El POS corre en la LAN por http (sin TLS); secure bloquearía la cookie.
    secure: false,
    maxAge: 60 * 60 * 24, // el turno se elige al menos una vez al día
  });
}

const esquemaSucursal = z.object({
  sucursalId: z.uuid("Sucursal inválida"),
});

export async function seleccionarSucursal(formData: FormData): Promise<void> {
  const perfil = await getPerfilAutenticado();

  const datos = esquemaSucursal.safeParse({
    sucursalId: formData.get("sucursalId"),
  });
  if (!datos.success) {
    redirect("/seleccionar-sucursal");
  }

  const disponibles = await sucursalesDisponibles(perfil);
  if (!disponibles.some((s) => s.id === datos.data.sucursalId)) {
    redirect("/seleccionar-sucursal");
  }

  await activarSucursal(datos.data.sucursalId);
  redirect("/");
}

export async function cerrarSesion(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESION)?.value;
  if (token) {
    // Revocar en BD: la cookie robada/duplicada deja de servir de inmediato
    await db.sesion.updateMany({
      where: { tokenHash: hashearTokenSesion(token), revocadaAt: null },
      data: { revocadaAt: new Date() },
    });
  }
  cookieStore.delete(COOKIE_SESION);
  cookieStore.delete(COOKIE_SUCURSAL);
  redirect("/login");
}
