"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import {
  esquemaCliente,
  esquemaDireccion,
  esquemaTelefono,
} from "@/lib/esquemas/clientes";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { Resultado } from "@/types";

function esTelefonoDuplicado(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

export async function crearCliente(datos: unknown): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "clientes.gestionar");

  const parseo = esquemaCliente.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { nombre, telefono, direccion, referencia } = parseo.data;

  try {
    await db.cliente.create({
      data: {
        nombre,
        telefono,
        ...(direccion
          ? {
              direcciones: {
                create: { direccion, referencia: referencia || null },
              },
            }
          : {}),
      },
    });
  } catch (e) {
    if (esTelefonoDuplicado(e)) {
      return { ok: false, error: "Ya existe un cliente con ese teléfono." };
    }
    throw e;
  }

  revalidatePath("/clientes");
  return { ok: true };
}

export async function actualizarCliente(
  id: string,
  datos: unknown
): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "clientes.gestionar");

  const parseo = esquemaCliente
    .omit({ direccion: true, referencia: true })
    .safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const existente = await db.cliente.findUnique({ where: { id } });
  if (!existente) {
    return { ok: false, error: "El cliente no existe." };
  }

  try {
    await db.cliente.update({ where: { id }, data: parseo.data });
  } catch (e) {
    if (esTelefonoDuplicado(e)) {
      return { ok: false, error: "Ya existe un cliente con ese teléfono." };
    }
    throw e;
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}

export async function agregarDireccion(
  clienteId: string,
  datos: unknown
): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "clientes.gestionar");

  const parseo = esquemaDireccion.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const cliente = await db.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) {
    return { ok: false, error: "El cliente no existe." };
  }

  await db.clienteDireccion.create({
    data: {
      clienteId,
      direccion: parseo.data.direccion,
      referencia: parseo.data.referencia || null,
      activa: parseo.data.activa,
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

// ── Paso 1 del wizard a domicilio (10c) ──────────────────────────────────

/** DTO serializable del cliente para el wizard de venta. */
export type ClienteVenta = {
  id: string;
  nombre: string;
  telefono: string;
  direcciones: { id: string; direccion: string; referencia: string | null }[];
};

type ResultadoClienteVenta =
  | { ok: true; cliente: ClienteVenta | null }
  | { ok: false; error: string };

function aClienteVenta(cliente: {
  id: string;
  nombre: string;
  telefono: string;
  direcciones: { id: string; direccion: string; referencia: string | null }[];
}): ClienteVenta {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    direcciones: cliente.direcciones.map((d) => ({
      id: d.id,
      direccion: d.direccion,
      referencia: d.referencia,
    })),
  };
}

/** Busca al cliente por teléfono con sus direcciones activas. */
export async function buscarClienteVenta(
  telefono: unknown
): Promise<ResultadoClienteVenta> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "clientes.ver");

  const parseo = esquemaTelefono.safeParse(telefono);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Teléfono inválido" };
  }

  const cliente = await db.cliente.findUnique({
    where: { telefono: parseo.data },
    include: {
      direcciones: { where: { activa: true }, orderBy: { direccion: "asc" } },
    },
  });
  return { ok: true, cliente: cliente ? aClienteVenta(cliente) : null };
}

const esquemaClienteVenta = esquemaCliente.extend({
  // A domicilio la dirección es obligatoria desde el alta
  direccion: z.string().trim().min(5, "Describe la dirección completa"),
});

/** Alta rápida de cliente + dirección desde el paso 1 del wizard. */
export async function crearClienteVenta(
  datos: unknown
): Promise<ResultadoClienteVenta> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "clientes.gestionar");

  const parseo = esquemaClienteVenta.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { nombre, telefono, direccion, referencia } = parseo.data;

  try {
    const cliente = await db.cliente.create({
      data: {
        nombre,
        telefono,
        direcciones: { create: { direccion, referencia: referencia || null } },
      },
      include: { direcciones: true },
    });
    revalidatePath("/clientes");
    return { ok: true, cliente: aClienteVenta(cliente) };
  } catch (e) {
    if (esTelefonoDuplicado(e)) {
      return { ok: false, error: "Ya existe un cliente con ese teléfono." };
    }
    throw e;
  }
}

export async function actualizarDireccion(
  direccionId: string,
  datos: unknown
): Promise<Resultado> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "clientes.gestionar");

  const parseo = esquemaDireccion.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const existente = await db.clienteDireccion.findUnique({
    where: { id: direccionId },
  });
  if (!existente) {
    return { ok: false, error: "La dirección no existe." };
  }

  await db.clienteDireccion.update({
    where: { id: direccionId },
    data: {
      direccion: parseo.data.direccion,
      referencia: parseo.data.referencia || null,
      activa: parseo.data.activa,
    },
  });

  revalidatePath(`/clientes/${existente.clienteId}`);
  return { ok: true };
}
