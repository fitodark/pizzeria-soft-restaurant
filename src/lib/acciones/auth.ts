"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { crearClienteSupabaseServer } from "@/lib/supabase/server";
import { COOKIE_SUCURSAL, getPerfilAutenticado, sucursalesDisponibles } from "@/lib/auth";
import { Rol } from "@/generated/prisma/enums";

export type EstadoLogin = { error: string } | null;

const esquemaLogin = z.object({
  email: z.email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

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

  const supabase = await crearClienteSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(datos.data);
  if (error || !data.user) {
    return { error: "Correo o contraseña incorrectos." };
  }

  const perfil = await db.perfil.findUnique({
    where: { id: data.user.id },
    include: { sucursales: { include: { sucursal: true } } },
  });
  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut();
    return { error: "Tu usuario está inactivo. Contacta al administrador." };
  }

  const tieneSucursalActiva = perfil.sucursales.some((us) => us.sucursal.activa);
  if (perfil.rol !== Rol.ADMINISTRADOR && !tieneSucursalActiva) {
    await supabase.auth.signOut();
    return { error: "Sin sucursal asignada, contacta al administrador." };
  }

  redirect("/seleccionar-sucursal");
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

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SUCURSAL, datos.data.sucursalId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // El POS corre en la LAN por http (sin TLS); secure bloquearía la cookie.
    secure: false,
    maxAge: 60 * 60 * 24, // el turno se elige al menos una vez al día
  });

  redirect("/");
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteSupabaseServer();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_SUCURSAL);
  redirect("/login");
}
