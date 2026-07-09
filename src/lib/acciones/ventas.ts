"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { verificarPermiso } from "@/lib/permisos";
import { corteAbierto } from "@/lib/consultas/cortes";
import { esDiaFestivo } from "@/lib/consultas/festivos";
import { siguienteFolio } from "@/lib/folios";
import {
  aplanarLineas,
  calcularLineas,
  totalVenta,
  type LineaCalculada,
  type LineaEntrada,
  type ProductoCatalogo,
  type PromocionCatalogo,
} from "@/lib/precios";
import {
  esquemaAgregarLineas,
  esquemaAsignarRepartidor,
  esquemaCobrarVenta,
  esquemaCrearVenta,
  esquemaInactivarLinea,
} from "@/lib/esquemas/ventas";
import { calcularCambio } from "@/lib/precios";
import { imprimirComandas, imprimirTicket } from "@/lib/impresion/servicio";
import {
  CanalVenta,
  EstatusVenta,
  MetodoPago,
  OrigenMovimiento,
  Rol,
  TipoMovimiento,
  TipoMovInventario,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";

export type ResultadoVenta =
  | { ok: true; ventaId: string; folio: number; avisoImpresion?: string }
  | { ok: false; error: string };

/** IDs de productos referenciados por las líneas (incluye mitades, extras y
 *  elecciones de componentes de paquete). */
function idsProductosDe(lineas: LineaEntrada[]): string[] {
  const ids = new Set<string>();
  for (const linea of lineas) {
    if (linea.tipoLinea === "PRODUCTO") {
      ids.add(linea.productoId);
    } else if (linea.tipoLinea === "PIZZA_PERSONALIZADA") {
      ids.add(linea.mitad1ProductoId);
      ids.add(linea.mitad2ProductoId);
    } else if (linea.tipoLinea === "ALITAS_PERSONALIZADAS") {
      for (const saborId of linea.saboresProductoIds) {
        ids.add(saborId);
      }
    } else {
      if (linea.compraProductoId) ids.add(linea.compraProductoId);
      if (linea.regaloProductoId) ids.add(linea.regaloProductoId);
      for (const componente of linea.componentes ?? []) {
        ids.add(componente.productoId);
      }
    }
    if ("extras" in linea) {
      for (const extra of linea.extras ?? []) {
        ids.add(extra.productoId);
      }
    }
  }
  return [...ids];
}

/** Arma el catálogo mínimo para valuar la venta desde la BD. */
async function cargarCatalogo(lineas: LineaEntrada[]) {
  const idsPromos = lineas
    .filter((l) => l.tipoLinea === "PROMOCION")
    .map((l) => l.promocionId);

  // Primero las promos: sus componentes fijos también deben estar en el
  // catálogo de productos aunque el cliente no los haya enviado.
  const promociones = await db.promocion.findMany({
    where: { id: { in: idsPromos } },
    include: { productos: true },
  });
  const idsComponentesFijos = promociones.flatMap((p) =>
    p.productos.flatMap((c) => (c.productoId ? [c.productoId] : []))
  );

  const productos = await db.producto.findMany({
    where: { id: { in: [...idsProductosDe(lineas), ...idsComponentesFijos] } },
    include: { variantes: true },
  });

  return {
    productos: new Map<string, ProductoCatalogo>(
      productos.map((p) => [p.id, p])
    ),
    promociones: new Map<string, PromocionCatalogo>(
      promociones.map((p) => [p.id, p])
    ),
  };
}

/** Persiste una línea valuada (y sus extras como hijas) dentro de la tx. */
async function crearDetalle(
  tx: Prisma.TransactionClient,
  ventaId: string,
  linea: LineaCalculada
): Promise<string> {
  const detalle = await tx.ventaDetalle.create({
    data: {
      ventaId,
      tipoLinea: linea.tipoLinea,
      productoId: linea.productoId,
      varianteId: linea.varianteId,
      promocionId: linea.promocionId,
      cantidad: linea.cantidad,
      precioUnitario: linea.precioUnitario,
      notas: linea.notas,
      mitades: {
        create: linea.mitades.map((m) => ({
          mitad: m.mitad,
          productoId: m.productoId,
        })),
      },
    },
  });
  for (const extra of linea.extras) {
    await tx.ventaDetalle.create({
      data: {
        ventaId,
        tipoLinea: extra.tipoLinea,
        productoId: extra.productoId,
        varianteId: extra.varianteId,
        promocionId: null,
        parentDetalleId: detalle.id,
        cantidad: extra.cantidad,
        precioUnitario: extra.precioUnitario,
        notas: extra.notas,
      },
    });
  }
  return detalle.id;
}

export async function crearVenta(datos: unknown): Promise<ResultadoVenta> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "ventas.crear");

  const parseo = esquemaCrearVenta.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const venta = parseo.data;

  const corte = await corteAbierto(sesion.sucursalId);
  if (!corte) {
    return { ok: false, error: "Abra un corte de caja para registrar ventas." };
  }

  if (venta.canal === CanalVenta.DOMICILIO) {
    const direccion = await db.clienteDireccion.findUnique({
      where: { id: venta.direccionId },
    });
    if (!direccion || !direccion.activa || direccion.clienteId !== venta.clienteId) {
      return { ok: false, error: "La dirección no pertenece al cliente o está inactiva." };
    }
  }

  // Precios SIEMPRE del servidor: catálogo fresco + reglas de lib/precios.ts
  const ahora = new Date();
  const [catalogo, festivo] = await Promise.all([
    cargarCatalogo(venta.lineas),
    esDiaFestivo(ahora),
  ]);
  let lineas: LineaCalculada[];
  try {
    lineas = calcularLineas(venta.lineas, catalogo, venta.canal, ahora, festivo);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Venta inválida" };
  }

  const total = totalVenta(
    aplanarLineas(lineas).map((l) => ({ ...l, activo: true }))
  );

  const creada = await db.$transaction(async (tx) => {
    const folio = await siguienteFolio(tx, sesion.sucursalId);
    const nueva = await tx.venta.create({
      data: {
        folio,
        sucursalId: sesion.sucursalId,
        corteId: corte.id,
        canal: venta.canal,
        clienteId: venta.clienteId ?? null,
        direccionId: venta.direccionId ?? null,
        mesa: venta.canal === CanalVenta.ESTABLECIMIENTO ? venta.mesa || null : null,
        metodoPago: venta.metodoPago,
        pagaCon:
          venta.canal === CanalVenta.DOMICILIO && venta.pagaCon
            ? venta.pagaCon
            : null,
        total,
        usuarioId: sesion.usuario.id,
      },
    });
    for (const linea of lineas) {
      await crearDetalle(tx, nueva.id, linea);
    }
    return nueva;
  });

  // La venta ya está guardada: un fallo de impresora solo genera aviso
  const avisos = await imprimirComandas(creada.id);

  revalidatePath("/ventas");
  return {
    ok: true,
    ventaId: creada.id,
    folio: creada.folio,
    avisoImpresion: avisos.length > 0 ? avisos.join(" ") : undefined,
  };
}

// ── Ciclo de vida (Paso 10b) ─────────────────────────────────────────────

export type ResultadoAccion =
  | { ok: true; avisoImpresion?: string }
  | { ok: false; error: string };

/** Venta PENDIENTE de la sucursal activa, o mensaje de error en español. */
async function ventaOperable(ventaId: string, sucursalId: string) {
  const venta = await db.venta.findUnique({
    where: { id: ventaId },
    include: { corte: { select: { estatus: true } } },
  });
  if (!venta || venta.sucursalId !== sucursalId) {
    return { venta: null, error: "La venta no existe en esta sucursal." };
  }
  if (venta.estatus !== EstatusVenta.PENDIENTE) {
    return { venta: null, error: "La venta ya no está pendiente." };
  }
  if (venta.corte.estatus !== "ABIERTO") {
    return { venta: null, error: "El corte de la venta ya está cerrado." };
  }
  return { venta, error: null };
}

/** Regla 6: el total de la venta solo suma líneas activas. */
async function recalcularTotal(
  tx: Prisma.TransactionClient,
  ventaId: string
): Promise<Prisma.Decimal> {
  const detalles = await tx.ventaDetalle.findMany({
    where: { ventaId, activo: true },
    select: { precioUnitario: true, cantidad: true },
  });
  const total = detalles.reduce(
    (suma, d) => suma.plus(d.precioUnitario.times(d.cantidad)),
    new Prisma.Decimal(0)
  );
  await tx.venta.update({ where: { id: ventaId }, data: { total } });
  return total;
}

/** Agrega líneas a una venta PENDIENTE; el servidor recalcula precios y total. */
export async function agregarLineas(datos: unknown): Promise<ResultadoVenta> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "ventas.agregarLineas");

  const parseo = esquemaAgregarLineas.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { venta, error } = await ventaOperable(parseo.data.ventaId, sesion.sucursalId);
  if (!venta) {
    return { ok: false, error };
  }

  const ahora = new Date();
  const [catalogo, festivo] = await Promise.all([
    cargarCatalogo(parseo.data.lineas),
    esDiaFestivo(ahora),
  ]);
  let lineas: LineaCalculada[];
  try {
    lineas = calcularLineas(parseo.data.lineas, catalogo, venta.canal, ahora, festivo);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Líneas inválidas" };
  }

  const nuevosIds = await db.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const linea of lineas) {
      ids.push(await crearDetalle(tx, venta.id, linea));
    }
    await recalcularTotal(tx, venta.id);
    return ids;
  });

  // Comanda SOLO de lo recién agregado
  const avisos = await imprimirComandas(venta.id, nuevosIds);

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${venta.id}`);
  return {
    ok: true,
    ventaId: venta.id,
    folio: venta.folio,
    avisoImpresion: avisos.length > 0 ? avisos.join(" ") : undefined,
  };
}

/** Inactiva una línea (y sus extras hijos) con PIN del usuario en sesión. */
export async function inactivarLinea(datos: unknown): Promise<ResultadoAccion> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "ventas.inactivarLinea");

  const parseo = esquemaInactivarLinea.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const perfil = await db.perfil.findUnique({
    where: { id: sesion.usuario.id },
    select: { pinHash: true },
  });
  if (!perfil || !(await bcrypt.compare(parseo.data.pin, perfil.pinHash))) {
    return { ok: false, error: "PIN incorrecto." };
  }

  const detalle = await db.ventaDetalle.findUnique({
    where: { id: parseo.data.detalleId },
  });
  if (!detalle || !detalle.activo) {
    return { ok: false, error: "La línea no existe o ya está inactiva." };
  }
  const { venta, error } = await ventaOperable(detalle.ventaId, sesion.sucursalId);
  if (!venta) {
    return { ok: false, error };
  }

  await db.$transaction(async (tx) => {
    // Nada se borra: bandera + quién + cuándo (los extras cuelgan de la línea)
    await tx.ventaDetalle.updateMany({
      where: {
        activo: true,
        OR: [{ id: detalle.id }, { parentDetalleId: detalle.id }],
      },
      data: {
        activo: false,
        usuarioInactivoId: sesion.usuario.id,
        fechaInactivacion: new Date(),
      },
    });
    await recalcularTotal(tx, venta.id);
  });

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${venta.id}`);
  return { ok: true };
}

/** IDs y cantidades a descontar del inventario (solo productos inventariables). */
async function consumoInventariable(ventaId: string) {
  const detalles = await db.ventaDetalle.findMany({
    where: { ventaId, activo: true, productoId: { not: null } },
    select: { productoId: true, cantidad: true },
  });
  const porProducto = new Map<string, number>();
  for (const d of detalles) {
    porProducto.set(d.productoId!, (porProducto.get(d.productoId!) ?? 0) + d.cantidad);
  }
  const inventariables = await db.producto.findMany({
    where: { id: { in: [...porProducto.keys()] }, inventariable: true },
    select: { id: true },
  });
  return inventariables.map((p) => ({
    productoId: p.id,
    cantidad: porProducto.get(p.id)!,
  }));
}

/** Cobra la venta: cambio, INGRESO al corte y descuento de inventario. */
export async function cobrarVenta(datos: unknown): Promise<ResultadoAccion> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "ventas.cobrar");

  const parseo = esquemaCobrarVenta.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { venta, error } = await ventaOperable(parseo.data.ventaId, sesion.sucursalId);
  if (!venta) {
    return { ok: false, error };
  }
  if (venta.total.lte(0)) {
    return { ok: false, error: "La venta no tiene líneas activas que cobrar." };
  }

  let montoPagado: Prisma.Decimal;
  let cambio: Prisma.Decimal;
  if (venta.metodoPago === MetodoPago.EFECTIVO) {
    if (!parseo.data.montoPagado) {
      return { ok: false, error: "Captura con cuánto paga el cliente." };
    }
    montoPagado = new Prisma.Decimal(parseo.data.montoPagado);
    try {
      cambio = calcularCambio(venta.total, montoPagado);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Pago insuficiente" };
    }
  } else {
    // Transferencia: se cobra exacto y queda pendiente de validar
    montoPagado = venta.total;
    cambio = new Prisma.Decimal(0);
  }

  const consumo = await consumoInventariable(venta.id);

  await db.$transaction(async (tx) => {
    await tx.venta.update({
      where: { id: venta.id },
      data: {
        estatus: EstatusVenta.COBRADA,
        montoPagado,
        cambio,
        cobradaAt: new Date(),
      },
    });
    await tx.movimientoCorte.create({
      data: {
        corteId: venta.corteId,
        tipo: TipoMovimiento.INGRESO,
        origen: OrigenMovimiento.VENTA,
        descripcion: `Venta #${venta.folio}`,
        monto: venta.total,
        usuarioId: sesion.usuario.id,
        ventaId: venta.id,
      },
    });
    for (const { productoId, cantidad } of consumo) {
      await tx.inventario.upsert({
        where: {
          sucursalId_productoId: { sucursalId: venta.sucursalId, productoId },
        },
        create: {
          sucursalId: venta.sucursalId,
          productoId,
          existencia: new Prisma.Decimal(-cantidad),
        },
        update: { existencia: { decrement: cantidad } },
      });
      await tx.movimientoInventario.create({
        data: {
          sucursalId: venta.sucursalId,
          productoId,
          tipo: TipoMovInventario.SALIDA,
          cantidad: new Prisma.Decimal(cantidad),
          referencia: venta.id,
          usuarioId: sesion.usuario.id,
        },
      });
    }
  });

  const avisos = await imprimirTicket(venta.id, "cobro");

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${venta.id}`);
  revalidatePath("/cortes");
  revalidatePath("/inventario");
  return {
    ok: true,
    avisoImpresion: avisos.length > 0 ? avisos.join(" ") : undefined,
  };
}

/** Asigna repartidor (rol REPARTIDOR, activo y de la sucursal) a un domicilio. */
export async function asignarRepartidor(datos: unknown): Promise<ResultadoAccion> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "ventas.asignarRepartidor");

  const parseo = esquemaAsignarRepartidor.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const venta = await db.venta.findUnique({ where: { id: parseo.data.ventaId } });
  if (!venta || venta.sucursalId !== sesion.sucursalId) {
    return { ok: false, error: "La venta no existe en esta sucursal." };
  }
  if (venta.canal !== CanalVenta.DOMICILIO) {
    return { ok: false, error: "Solo las ventas a domicilio llevan repartidor." };
  }
  if (venta.estatus === EstatusVenta.CANCELADA) {
    return { ok: false, error: "La venta está cancelada." };
  }

  const repartidor = await db.perfil.findFirst({
    where: {
      id: parseo.data.repartidorId,
      rol: Rol.REPARTIDOR,
      activo: true,
      sucursales: { some: { sucursalId: sesion.sucursalId } },
    },
  });
  if (!repartidor) {
    return { ok: false, error: "El repartidor no está disponible en esta sucursal." };
  }

  await db.venta.update({
    where: { id: venta.id },
    data: { repartidorId: repartidor.id },
  });

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${venta.id}`);
  return { ok: true };
}

/** Marca como validada una transferencia ya cobrada. */
export async function validarTransferencia(datos: {
  ventaId: string;
}): Promise<ResultadoAccion> {
  const sesion = await getSesion();
  verificarPermiso(sesion.rol, "ventas.validarTransferencia");

  const venta = await db.venta.findUnique({ where: { id: datos.ventaId } });
  if (!venta || venta.sucursalId !== sesion.sucursalId) {
    return { ok: false, error: "La venta no existe en esta sucursal." };
  }
  if (venta.metodoPago !== MetodoPago.TRANSFERENCIA) {
    return { ok: false, error: "La venta no se pagó por transferencia." };
  }
  if (venta.transferenciaValidada) {
    return { ok: false, error: "La transferencia ya estaba validada." };
  }

  await db.venta.update({
    where: { id: venta.id },
    data: { transferenciaValidada: true },
  });

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${venta.id}`);
  return { ok: true };
}
