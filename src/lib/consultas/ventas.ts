import { db } from "@/lib/db";
import { esDiaFestivo } from "@/lib/consultas/festivos";
import { promocionVigente } from "@/lib/precios";
import {
  CanalVenta,
  EstatusVenta,
  MetodoPago,
  Rol,
  TipoLinea,
  TipoPromocion,
} from "@/generated/prisma/enums";

/** DTOs serializables para el wizard (los precios viajan como string SOLO
 *  para mostrarse; el servidor recalcula todo en crearVenta). */
export type VarianteWizard = {
  id: string;
  tamano: string;
  precio: string;
  /** Sabores combinables en este tamaño (alitas). */
  maxSabores: number;
};

export type ProductoWizard = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  tipo: "COMIDA" | "BEBIDA";
  esEspecialidad: boolean;
  permiteExtrasNotas: boolean;
  ventaDomicilio: boolean;
  ventaEstablecimiento: boolean;
  variantes: VarianteWizard[];
};

export type ExtraWizard = { id: string; nombre: string; precio: string };

export type ReglaPromoWizard = {
  productoId: string | null;
  varianteId: string | null;
  cantidad: number;
};

/** Componente de PAQUETE/PROMOCION para "arma tu paquete". */
export type ComponenteWizard = {
  id: string;
  /** Fijo (viene configurado) o null = el cliente elige. */
  productoId: string | null;
  varianteId: string | null;
  categoriaPermitida: string | null;
  tamano: string | null;
  maxSaboresOverride: number | null;
  cantidad: number;
};

export type PromoWizard = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoPromocion;
  precioEspecial: string | null;
  vigenteEstablecimiento: boolean;
  vigenteDomicilio: boolean;
  requerido: ReglaPromoWizard | null;
  regalo: ReglaPromoWizard | null;
  /** Solo PAQUETE/PROMOCION (el 2x1 usa requerido/regalo). */
  componentes: ComponenteWizard[];
};

export type CatalogoWizard = {
  productos: ProductoWizard[];
  extras: ExtraWizard[];
  promociones: PromoWizard[];
};

export async function catalogoWizard(fecha: Date): Promise<CatalogoWizard> {
  const [productos, promociones, esFestivo] = await Promise.all([
    db.producto.findMany({
      where: { activo: true },
      include: {
        variantes: { where: { activa: true }, orderBy: { precio: "asc" } },
      },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    }),
    db.promocion.findMany({
      where: { activa: true },
      include: { productos: true },
      orderBy: { nombre: "asc" },
    }),
    esDiaFestivo(fecha),
  ]);

  const venta = productos.filter(
    (p) => p.tipoArticulo === "VENTA" && p.variantes.length > 0
  );
  const extras = productos.filter(
    (p) =>
      p.tipoArticulo === "EXTRA" &&
      p.variantes.some((v) => v.tamano === "unico")
  );

  return {
    productos: venta.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      categoria: p.categoria,
      tipo: p.tipo,
      esEspecialidad: p.esEspecialidad,
      permiteExtrasNotas: p.permiteExtrasNotas,
      ventaDomicilio: p.ventaDomicilio,
      ventaEstablecimiento: p.ventaEstablecimiento,
      variantes: p.variantes.map((v) => ({
        id: v.id,
        tamano: v.tamano,
        precio: v.precio.toString(),
        maxSabores: v.maxSabores,
      })),
    })),
    extras: extras.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: p.variantes.find((v) => v.tamano === "unico")!.precio.toString(),
    })),
    promociones: promociones
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        tipo: p.tipo,
        precioEspecial: p.precioEspecial?.toString() ?? null,
        vigenteEstablecimiento: promocionVigente(p, fecha, CanalVenta.ESTABLECIMIENTO, esFestivo),
        vigenteDomicilio: promocionVigente(p, fecha, CanalVenta.DOMICILIO, esFestivo),
        requerido:
          p.productos.find((pp) => pp.rol === "REQUERIDO") ?? null,
        regalo: p.productos.find((pp) => pp.rol === "REGALO") ?? null,
        componentes: p.productos.filter((pp) => pp.rol === "REQUERIDO"),
      }))
      .filter((p) => p.vigenteEstablecimiento || p.vigenteDomicilio)
      .map((p) => ({
        ...p,
        requerido: p.requerido
          ? {
              productoId: p.requerido.productoId,
              varianteId: p.requerido.varianteId,
              cantidad: p.requerido.cantidad,
            }
          : null,
        regalo: p.regalo
          ? {
              productoId: p.regalo.productoId,
              varianteId: p.regalo.varianteId,
              cantidad: p.regalo.cantidad,
            }
          : null,
        componentes:
          p.tipo === TipoPromocion.DOS_POR_UNO
            ? []
            : p.componentes.map((c) => ({
                id: c.id,
                productoId: c.productoId,
                varianteId: c.varianteId,
                categoriaPermitida: c.categoriaPermitida,
                tamano: c.tamano,
                maxSaboresOverride: c.maxSaboresOverride,
                cantidad: c.cantidad,
              })),
      })),
  };
}

// ── Detalle de venta (Paso 10b) ──────────────────────────────────────────

export type LineaVentaDTO = {
  id: string;
  tipoLinea: TipoLinea;
  titulo: string;
  subtitulo: string | null;
  /** Para enrutar comandas: BEBIDA → barra; COMIDA o null (paquetes) → cocina. */
  tipoProducto: "COMIDA" | "BEBIDA" | null;
  cantidad: number;
  precioUnitario: string;
  notas: string | null;
  activo: boolean;
  inactivadaPor: string | null;
  fechaInactivacion: Date | null;
  extras: LineaVentaDTO[];
};

export type VentaDTO = {
  id: string;
  folio: number;
  canal: CanalVenta;
  estatus: EstatusVenta;
  mesa: string | null;
  metodoPago: MetodoPago;
  transferenciaValidada: boolean;
  total: string;
  pagaCon: string | null;
  montoPagado: string | null;
  cambio: string | null;
  createdAt: Date;
  cobradaAt: Date | null;
  capturadaPor: string;
  cliente: { nombre: string; telefono: string } | null;
  direccion: string | null;
  repartidorId: string | null;
  repartidorNombre: string | null;
  lineas: LineaVentaDTO[];
};

/** Venta con líneas legibles; las inactivas solo si `verInactivos`. */
export async function ventaConDetalles(
  ventaId: string,
  sucursalId: string,
  verInactivos: boolean
): Promise<VentaDTO | null> {
  const venta = await db.venta.findUnique({
    where: { id: ventaId },
    include: {
      detalles: { include: { mitades: true }, orderBy: { createdAt: "asc" } },
      cliente: { select: { nombre: true, telefono: true } },
      direccion: { select: { direccion: true, referencia: true } },
    },
  });
  if (!venta || venta.sucursalId !== sucursalId) {
    return null;
  }

  const detalles = verInactivos
    ? venta.detalles
    : venta.detalles.filter((d) => d.activo);

  // VentaDetalle guarda solo IDs: los nombres se cruzan a mano
  const idsProducto = new Set<string>();
  const idsVariante = new Set<string>();
  const idsPromo = new Set<string>();
  const idsUsuario = new Set<string>([venta.usuarioId]);
  if (venta.repartidorId) idsUsuario.add(venta.repartidorId);
  for (const d of detalles) {
    if (d.productoId) idsProducto.add(d.productoId);
    if (d.varianteId) idsVariante.add(d.varianteId);
    if (d.promocionId) idsPromo.add(d.promocionId);
    if (d.usuarioInactivoId) idsUsuario.add(d.usuarioInactivoId);
    for (const m of d.mitades) idsProducto.add(m.productoId);
  }

  const [productos, variantes, promos, usuarios] = await Promise.all([
    db.producto.findMany({
      where: { id: { in: [...idsProducto] } },
      select: { id: true, nombre: true, tipo: true },
    }),
    db.productoVariante.findMany({
      where: { id: { in: [...idsVariante] } },
      select: { id: true, tamano: true },
    }),
    db.promocion.findMany({
      where: { id: { in: [...idsPromo] } },
      select: { id: true, nombre: true },
    }),
    db.perfil.findMany({
      where: { id: { in: [...idsUsuario] } },
      select: { id: true, nombre: true },
    }),
  ]);
  const nombreProducto = new Map(productos.map((p) => [p.id, p.nombre]));
  const tipoProducto = new Map(productos.map((p) => [p.id, p.tipo]));
  const tamanoVariante = new Map(variantes.map((v) => [v.id, v.tamano]));
  const nombrePromo = new Map(promos.map((p) => [p.id, p.nombre]));
  const nombreUsuario = new Map(usuarios.map((u) => [u.id, u.nombre]));

  const aDTO = (d: (typeof detalles)[number]): LineaVentaDTO => {
    const tamano = d.varianteId ? tamanoVariante.get(d.varianteId) : null;
    const sufijo = tamano && tamano !== "unico" ? ` (${tamano})` : "";
    let titulo: string;
    let subtitulo: string | null = null;
    if (d.tipoLinea === TipoLinea.PIZZA_PERSONALIZADA) {
      titulo = `Pizza personalizada${sufijo}`;
      subtitulo = `Mitades: ${d.mitades
        .sort((a, b) => a.mitad - b.mitad)
        .map((m) => nombreProducto.get(m.productoId) ?? "?")
        .join(" / ")}`;
    } else if (d.tipoLinea === TipoLinea.ALITAS_PERSONALIZADAS) {
      titulo = `Alitas combinadas${sufijo}`;
      subtitulo = `Sabores: ${d.mitades
        .sort((a, b) => a.mitad - b.mitad)
        .map((m) => nombreProducto.get(m.productoId) ?? "?")
        .join(" / ")}`;
    } else if (d.tipoLinea === TipoLinea.PROMOCION) {
      titulo = nombrePromo.get(d.promocionId ?? "") ?? "Promoción";
      subtitulo = d.productoId
        ? `${nombreProducto.get(d.productoId) ?? "?"}${sufijo}`
        : null;
    } else {
      titulo = `${nombreProducto.get(d.productoId ?? "") ?? "?"}${sufijo}`;
    }
    return {
      id: d.id,
      tipoLinea: d.tipoLinea,
      titulo,
      subtitulo,
      tipoProducto:
        d.tipoLinea === TipoLinea.PIZZA_PERSONALIZADA ||
        d.tipoLinea === TipoLinea.ALITAS_PERSONALIZADAS
          ? "COMIDA"
          : d.productoId
            ? tipoProducto.get(d.productoId) ?? null
            : null,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario.toString(),
      notas: d.notas,
      activo: d.activo,
      inactivadaPor: d.usuarioInactivoId
        ? nombreUsuario.get(d.usuarioInactivoId) ?? null
        : null,
      fechaInactivacion: d.fechaInactivacion,
      extras: [],
    };
  };

  const padres = detalles.filter((d) => !d.parentDetalleId).map(aDTO);
  const porId = new Map(padres.map((p) => [p.id, p]));
  for (const d of detalles) {
    if (d.parentDetalleId) {
      porId.get(d.parentDetalleId)?.extras.push(aDTO(d));
    }
  }

  return {
    id: venta.id,
    folio: venta.folio,
    canal: venta.canal,
    estatus: venta.estatus,
    mesa: venta.mesa,
    metodoPago: venta.metodoPago,
    transferenciaValidada: venta.transferenciaValidada,
    total: venta.total.toString(),
    pagaCon: venta.pagaCon?.toString() ?? null,
    montoPagado: venta.montoPagado?.toString() ?? null,
    cambio: venta.cambio?.toString() ?? null,
    createdAt: venta.createdAt,
    cobradaAt: venta.cobradaAt,
    capturadaPor: nombreUsuario.get(venta.usuarioId) ?? "?",
    cliente: venta.cliente,
    direccion: venta.direccion
      ? venta.direccion.direccion +
        (venta.direccion.referencia ? ` (${venta.direccion.referencia})` : "")
      : null,
    repartidorId: venta.repartidorId,
    repartidorNombre: venta.repartidorId
      ? nombreUsuario.get(venta.repartidorId) ?? null
      : null,
    lineas: padres,
  };
}

/** Repartidores activos asignados a la sucursal (para asignar domicilios). */
export async function repartidoresDeSucursal(sucursalId: string) {
  return db.perfil.findMany({
    where: {
      rol: Rol.REPARTIDOR,
      activo: true,
      sucursales: { some: { sucursalId } },
    },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
}

