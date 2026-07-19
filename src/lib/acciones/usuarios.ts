"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import {
  esquemaUsuarioEdicion,
  esquemaUsuarioNuevo,
} from "@/lib/esquemas/usuarios";
import { Prisma } from "@/generated/prisma/client";
import type { Resultado } from "@/types";

function esEmailDuplicado(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

export async function crearUsuario(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "usuarios.gestionar");

  const parseo = esquemaUsuarioNuevo.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { email, password, pin, sucursalIds, ...perfil } = parseo.data;

  try {
    await db.perfil.create({
      data: {
        ...perfil,
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10),
        pinHash: await bcrypt.hash(pin, 10),
        sucursales: {
          create: sucursalIds.map((sucursalId) => ({ sucursalId })),
        },
      },
    });
  } catch (e) {
    if (esEmailDuplicado(e)) {
      return { ok: false, error: "Ya existe un usuario con ese correo." };
    }
    throw e;
  }

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function actualizarUsuario(
  id: string,
  datos: unknown
): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "usuarios.gestionar");

  const parseo = esquemaUsuarioEdicion.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { password, pin, sucursalIds, ...perfil } = parseo.data;

  const existente = await db.perfil.findUnique({ where: { id } });
  if (!existente) {
    return { ok: false, error: "El usuario no existe." };
  }
  if (id === sesion.usuario.id && !parseo.data.activo) {
    return { ok: false, error: "No puedes desactivar tu propio usuario." };
  }

  await db.$transaction(async (tx) => {
    await tx.perfil.update({
      where: { id },
      data: {
        ...perfil,
        ...(pin ? { pinHash: await bcrypt.hash(pin, 10) } : {}),
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
    });
    await tx.usuarioSucursal.deleteMany({ where: { usuarioId: id } });
    if (sucursalIds.length > 0) {
      await tx.usuarioSucursal.createMany({
        data: sucursalIds.map((sucursalId) => ({ usuarioId: id, sucursalId })),
      });
    }
    // Cambio de contraseña o desactivación: sus sesiones vivas dejan de valer
    if (password || !parseo.data.activo) {
      await tx.sesion.updateMany({
        where: { usuarioId: id, revocadaAt: null },
        data: { revocadaAt: new Date() },
      });
    }
  });

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${id}`);
  return { ok: true };
}
