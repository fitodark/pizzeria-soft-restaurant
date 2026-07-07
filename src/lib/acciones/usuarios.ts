"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import { crearClienteSupabaseAdmin } from "@/lib/supabase/admin";
import {
  esquemaUsuarioEdicion,
  esquemaUsuarioNuevo,
} from "@/lib/esquemas/usuarios";
import type { Resultado } from "@/types";

export async function crearUsuario(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "usuarios.gestionar");

  const parseo = esquemaUsuarioNuevo.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { email, password, pin, sucursalIds, ...perfil } = parseo.data;

  const supabaseAdmin = crearClienteSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    const duplicado = error?.code === "email_exists";
    return {
      ok: false,
      error: duplicado
        ? "Ya existe un usuario con ese correo."
        : `No se pudo crear el usuario en Auth: ${error?.message ?? "error desconocido"}`,
    };
  }

  try {
    await db.perfil.create({
      data: {
        id: data.user.id,
        ...perfil,
        pinHash: await bcrypt.hash(pin, 10),
        sucursales: {
          create: sucursalIds.map((sucursalId) => ({ sucursalId })),
        },
      },
    });
  } catch (e) {
    // El alta en Auth no es transaccional con la BD: revertir manualmente.
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
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
      },
    });
    await tx.usuarioSucursal.deleteMany({ where: { usuarioId: id } });
    if (sucursalIds.length > 0) {
      await tx.usuarioSucursal.createMany({
        data: sucursalIds.map((sucursalId) => ({ usuarioId: id, sucursalId })),
      });
    }
  });

  if (password) {
    const supabaseAdmin = crearClienteSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password,
    });
    if (error) {
      return {
        ok: false,
        error: "Perfil guardado, pero no se pudo cambiar la contraseña.",
      };
    }
  }

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${id}`);
  return { ok: true };
}
