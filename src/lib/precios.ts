import { Prisma } from "@/generated/prisma/client";
import {
  CanalVenta,
  RolPromoProducto,
  TipoArticulo,
  TipoLinea,
  TipoProducto,
  TipoPromocion,
} from "@/generated/prisma/enums";

/**
 * Reglas de precios y vigencia — única fuente de verdad (blueprint §4).
 * Funciones puras: se prueban en lib/precios.test.ts sin base de datos.
 */

export type PromocionVigencia = {
  activa: boolean;
  tipo: TipoPromocion;
  ventaDomicilio: boolean;
  ventaEstablecimiento: boolean;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  /** 0=domingo … 6=sábado; vacío = todos los días */
  diasSemana: number[];
};

/** Fecha operativa (reloj local de la sucursal) como "yyyy-MM-dd". */
function fechaLocalTexto(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * Columnas @db.Date llegan de Prisma como Date a medianoche UTC; extraer por
 * ISO evita el corrimiento de día en zonas horarias negativas (México).
 */
function fechaDbTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/**
 * Regla 4 de precios: PAQUETE se vende todos los días; PROMOCION y
 * DOS_POR_UNO solo si el día de la semana y la temporada aplican. El canal
 * se valida SIEMPRE. Debe evaluarse en servidor, no solo ocultarse en UI.
 */
export function promocionVigente(
  promocion: PromocionVigencia,
  fecha: Date,
  canal: CanalVenta
): boolean {
  if (!promocion.activa) {
    return false;
  }
  const canalPermitido =
    canal === CanalVenta.DOMICILIO
      ? promocion.ventaDomicilio
      : promocion.ventaEstablecimiento;
  if (!canalPermitido) {
    return false;
  }
  if (promocion.tipo === TipoPromocion.PAQUETE) {
    return true;
  }
  if (
    promocion.diasSemana.length > 0 &&
    !promocion.diasSemana.includes(fecha.getDay())
  ) {
    return false;
  }
  const hoy = fechaLocalTexto(fecha);
  if (promocion.fechaInicio && hoy < fechaDbTexto(promocion.fechaInicio)) {
    return false;
  }
  if (promocion.fechaFin && hoy > fechaDbTexto(promocion.fechaFin)) {
    return false;
  }
  return true;
}

export function promocionesVigentes<T extends PromocionVigencia>(
  promociones: T[],
  fecha: Date,
  canal: CanalVenta
): T[] {
  return promociones.filter((p) => promocionVigente(p, fecha, canal));
}

// ─────────────────────────────────────────────────────────────────────────
// Cálculo de líneas de venta (reglas 1-7). El cliente JAMÁS envía precios:
// crearVenta arma el catálogo desde la BD y llama calcularLineas aquí.
// ─────────────────────────────────────────────────────────────────────────

/** Categoría que marca los sabores de alitas combinables entre sí. */
export const CATEGORIA_ALITAS = "alitas";

export type VarianteCatalogo = {
  id: string;
  tamano: string;
  precio: Prisma.Decimal;
  /** Sabores combinables en este tamaño (alitas: 7→1, 10→2, 14/20→3). */
  maxSabores: number;
  activa: boolean;
};

export type ProductoCatalogo = {
  id: string;
  nombre: string;
  tipo: TipoProducto;
  tipoArticulo: TipoArticulo;
  categoria: string;
  activo: boolean;
  ventaDomicilio: boolean;
  ventaEstablecimiento: boolean;
  esEspecialidad: boolean;
  permiteExtrasNotas: boolean;
  variantes: VarianteCatalogo[];
};

export type PromocionCatalogo = PromocionVigencia & {
  id: string;
  nombre: string;
  precioEspecial: Prisma.Decimal | null;
  productos: {
    rol: RolPromoProducto;
    productoId: string | null;
    varianteId: string | null;
    cantidad: number;
  }[];
};

export type ExtraEntrada = { productoId: string; cantidad: number };

export type LineaEntrada =
  | {
      tipoLinea: "PRODUCTO";
      productoId: string;
      varianteId: string;
      cantidad: number;
      notas?: string;
      extras?: ExtraEntrada[];
    }
  | {
      tipoLinea: "PIZZA_PERSONALIZADA";
      tamano: string;
      mitad1ProductoId: string;
      mitad2ProductoId: string;
      cantidad: number;
      notas?: string;
      extras?: ExtraEntrada[];
    }
  | {
      tipoLinea: "ALITAS_PERSONALIZADAS";
      tamano: string;
      /** 2 a 3 sabores distintos (categoría "alitas"). */
      saboresProductoIds: string[];
      cantidad: number;
      notas?: string;
      extras?: ExtraEntrada[];
    }
  | {
      tipoLinea: "PROMOCION";
      promocionId: string;
      cantidad: number;
      /** Solo DOS_POR_UNO: pizza comprada y pizza de regalo. */
      compraProductoId?: string;
      compraVarianteId?: string;
      regaloProductoId?: string;
      regaloVarianteId?: string;
    };

export type LineaCalculada = {
  tipoLinea: TipoLinea;
  productoId: string | null;
  varianteId: string | null;
  promocionId: string | null;
  cantidad: number;
  precioUnitario: Prisma.Decimal;
  notas: string | null;
  mitades: { mitad: number; productoId: string }[];
  /** Extras cobrables: se persisten como líneas hijas (parent_detalle_id). */
  extras: LineaCalculada[];
};

type Catalogo = {
  productos: Map<string, ProductoCatalogo>;
  promociones: Map<string, PromocionCatalogo>;
};

function canalPermitido(producto: ProductoCatalogo, canal: CanalVenta): boolean {
  return canal === CanalVenta.DOMICILIO
    ? producto.ventaDomicilio
    : producto.ventaEstablecimiento;
}

function obtenerProductoVendible(
  catalogo: Catalogo,
  productoId: string,
  canal: CanalVenta
): ProductoCatalogo {
  const producto = catalogo.productos.get(productoId);
  if (!producto || !producto.activo) {
    throw new Error("Un producto de la venta no existe o está inactivo.");
  }
  if (!canalPermitido(producto, canal)) {
    throw new Error(
      `"${producto.nombre}" no está disponible en este canal de venta.`
    );
  }
  return producto;
}

function obtenerVariante(
  producto: ProductoCatalogo,
  varianteId: string
): VarianteCatalogo {
  const variante = producto.variantes.find((v) => v.id === varianteId);
  if (!variante || !variante.activa) {
    throw new Error(`El tamaño elegido de "${producto.nombre}" no está disponible.`);
  }
  return variante;
}

function varianteDeTamano(
  producto: ProductoCatalogo,
  tamano: string
): VarianteCatalogo {
  const variante = producto.variantes.find(
    (v) => v.tamano === tamano && v.activa
  );
  if (!variante) {
    throw new Error(`"${producto.nombre}" no tiene tamaño ${tamano} disponible.`);
  }
  return variante;
}

/** Regla 3: cada extra suma el precio de su variante "unico". */
function calcularExtras(
  catalogo: Catalogo,
  canal: CanalVenta,
  padrePermiteExtras: boolean,
  padreNombre: string,
  extras: ExtraEntrada[] | undefined,
  notas: string | undefined
): LineaCalculada[] {
  const tieneExtras = (extras?.length ?? 0) > 0;
  if (!padrePermiteExtras && (tieneExtras || notas)) {
    throw new Error(`"${padreNombre}" no permite extras ni notas.`);
  }
  if (!tieneExtras) {
    return [];
  }
  return (extras ?? []).map((extra) => {
    const producto = obtenerProductoVendible(catalogo, extra.productoId, canal);
    if (producto.tipoArticulo !== TipoArticulo.EXTRA) {
      throw new Error(`"${producto.nombre}" no es un extra.`);
    }
    const variante = varianteDeTamano(producto, "unico");
    return {
      tipoLinea: TipoLinea.PRODUCTO,
      productoId: producto.id,
      varianteId: variante.id,
      promocionId: null,
      cantidad: extra.cantidad,
      precioUnitario: variante.precio,
      notas: null,
      mitades: [],
      extras: [],
    };
  });
}

function calcularLineaProducto(
  catalogo: Catalogo,
  canal: CanalVenta,
  entrada: Extract<LineaEntrada, { tipoLinea: "PRODUCTO" }>
): LineaCalculada {
  const producto = obtenerProductoVendible(catalogo, entrada.productoId, canal);
  if (producto.tipoArticulo !== TipoArticulo.VENTA) {
    throw new Error(`"${producto.nombre}" es un extra: no se vende solo.`);
  }
  const variante = obtenerVariante(producto, entrada.varianteId);
  return {
    tipoLinea: TipoLinea.PRODUCTO,
    productoId: producto.id,
    varianteId: variante.id,
    promocionId: null,
    cantidad: entrada.cantidad,
    // Regla 1: precio de la variante elegida (snapshot)
    precioUnitario: variante.precio,
    notas: entrada.notas || null,
    mitades: [],
    extras: calcularExtras(
      catalogo,
      canal,
      producto.permiteExtrasNotas,
      producto.nombre,
      entrada.extras,
      entrada.notas
    ),
  };
}

function calcularLineaPersonalizada(
  catalogo: Catalogo,
  canal: CanalVenta,
  entrada: Extract<LineaEntrada, { tipoLinea: "PIZZA_PERSONALIZADA" }>
): LineaCalculada {
  const mitades = [entrada.mitad1ProductoId, entrada.mitad2ProductoId].map(
    (productoId) => {
      const producto = obtenerProductoVendible(catalogo, productoId, canal);
      if (!producto.esEspecialidad) {
        throw new Error(
          `"${producto.nombre}" no es especialidad: no puede ser mitad.`
        );
      }
      return { producto, variante: varianteDeTamano(producto, entrada.tamano) };
    }
  );

  // Regla 2: precio = la mitad más cara en el tamaño elegido
  const masCara = mitades[0].variante.precio.gte(mitades[1].variante.precio)
    ? mitades[0]
    : mitades[1];

  return {
    tipoLinea: TipoLinea.PIZZA_PERSONALIZADA,
    productoId: null,
    // La variante de la mitad más cara documenta tamaño y origen del precio
    varianteId: masCara.variante.id,
    promocionId: null,
    cantidad: entrada.cantidad,
    precioUnitario: masCara.variante.precio,
    notas: entrada.notas || null,
    mitades: mitades.map((m, indice) => ({
      mitad: indice + 1,
      productoId: m.producto.id,
    })),
    extras: calcularExtras(
      catalogo,
      canal,
      true, // la personalizada siempre admite extras/notas
      "Pizza personalizada",
      entrada.extras,
      entrada.notas
    ),
  };
}

/**
 * Orden de alitas combinada: 2-3 sabores distintos de categoría "alitas".
 * El precio es fijo por tamaño (si difiere entre sabores, se cobra el más
 * caro, como en pizza). `maxSabores` de la variante limita la combinación
 * en servidor: 7 pzas→1 (nunca llega aquí), 10→2, 14/20→3.
 */
function calcularLineaAlitas(
  catalogo: Catalogo,
  canal: CanalVenta,
  entrada: Extract<LineaEntrada, { tipoLinea: "ALITAS_PERSONALIZADAS" }>
): LineaCalculada {
  const ids = entrada.saboresProductoIds;
  if (new Set(ids).size !== ids.length) {
    throw new Error("Los sabores de la orden de alitas deben ser distintos.");
  }

  const sabores = ids.map((productoId) => {
    const producto = obtenerProductoVendible(catalogo, productoId, canal);
    if (producto.categoria !== CATEGORIA_ALITAS) {
      throw new Error(
        `"${producto.nombre}" no es un sabor de alitas: no puede combinarse.`
      );
    }
    return { producto, variante: varianteDeTamano(producto, entrada.tamano) };
  });

  const maxPermitido = Math.min(...sabores.map((s) => s.variante.maxSabores));
  if (sabores.length > maxPermitido) {
    throw new Error(
      maxPermitido === 1
        ? `La orden de ${entrada.tamano} es de un solo sabor.`
        : `La orden de ${entrada.tamano} admite máximo ${maxPermitido} sabores.`
    );
  }

  const masCara = sabores.reduce((a, b) =>
    a.variante.precio.gte(b.variante.precio) ? a : b
  );

  return {
    tipoLinea: TipoLinea.ALITAS_PERSONALIZADAS,
    productoId: null,
    // La variante documenta tamaño y origen del precio (como en pizza)
    varianteId: masCara.variante.id,
    promocionId: null,
    cantidad: entrada.cantidad,
    precioUnitario: masCara.variante.precio,
    notas: entrada.notas || null,
    mitades: sabores.map((s, indice) => ({
      mitad: indice + 1,
      productoId: s.producto.id,
    })),
    extras: calcularExtras(
      catalogo,
      canal,
      true, // la orden combinada siempre admite aderezos extra y notas
      "Alitas personalizadas",
      entrada.extras,
      entrada.notas
    ),
  };
}

function validarProductoDePromo(
  regla: PromocionCatalogo["productos"][number] | undefined,
  producto: ProductoCatalogo,
  variante: VarianteCatalogo,
  papel: string
): void {
  if (regla?.productoId && regla.productoId !== producto.id) {
    throw new Error(`La promoción exige otro producto como ${papel}.`);
  }
  if (regla?.varianteId && regla.varianteId !== variante.id) {
    throw new Error(`La promoción exige otro tamaño como ${papel}.`);
  }
  // Producto libre en la promoción = cualquier especialidad
  if (regla && !regla.productoId && !producto.esEspecialidad) {
    throw new Error(`El ${papel} del 2x1 debe ser una especialidad.`);
  }
}

function calcularLineaPromocion(
  catalogo: Catalogo,
  canal: CanalVenta,
  fecha: Date,
  entrada: Extract<LineaEntrada, { tipoLinea: "PROMOCION" }>
): LineaCalculada[] {
  const promocion = catalogo.promociones.get(entrada.promocionId);
  if (!promocion) {
    throw new Error("La promoción no existe.");
  }
  // Regla 4: validar vigencia y canal SIEMPRE en servidor
  if (!promocionVigente(promocion, fecha, canal)) {
    throw new Error(`"${promocion.nombre}" no está vigente hoy en este canal.`);
  }

  if (promocion.tipo !== TipoPromocion.DOS_POR_UNO) {
    if (!promocion.precioEspecial) {
      throw new Error(`"${promocion.nombre}" no tiene precio configurado.`);
    }
    return [
      {
        tipoLinea: TipoLinea.PROMOCION,
        productoId: null,
        varianteId: null,
        promocionId: promocion.id,
        cantidad: entrada.cantidad,
        precioUnitario: promocion.precioEspecial,
        notas: null,
        mitades: [],
        extras: [],
      },
    ];
  }

  // Regla 5 (2x1): se cobra la pizza comprada; el regalo entra a $0
  if (
    !entrada.compraProductoId ||
    !entrada.compraVarianteId ||
    !entrada.regaloProductoId ||
    !entrada.regaloVarianteId
  ) {
    throw new Error("El 2x1 requiere la pizza comprada y la de regalo.");
  }
  const compra = obtenerProductoVendible(catalogo, entrada.compraProductoId, canal);
  const varianteCompra = obtenerVariante(compra, entrada.compraVarianteId);
  const regalo = obtenerProductoVendible(catalogo, entrada.regaloProductoId, canal);
  const varianteRegalo = obtenerVariante(regalo, entrada.regaloVarianteId);

  validarProductoDePromo(
    promocion.productos.find((p) => p.rol === RolPromoProducto.REQUERIDO),
    compra,
    varianteCompra,
    "producto comprado"
  );
  validarProductoDePromo(
    promocion.productos.find((p) => p.rol === RolPromoProducto.REGALO),
    regalo,
    varianteRegalo,
    "regalo"
  );

  return [
    {
      tipoLinea: TipoLinea.PROMOCION,
      productoId: compra.id,
      varianteId: varianteCompra.id,
      promocionId: promocion.id,
      cantidad: entrada.cantidad,
      precioUnitario: varianteCompra.precio,
      notas: null,
      mitades: [],
      extras: [],
    },
    {
      tipoLinea: TipoLinea.PROMOCION,
      productoId: regalo.id,
      varianteId: varianteRegalo.id,
      promocionId: promocion.id,
      cantidad: entrada.cantidad,
      precioUnitario: new Prisma.Decimal(0),
      notas: "Regalo 2x1",
      mitades: [],
      extras: [],
    },
  ];
}

/**
 * Convierte las líneas del cliente (sin precios) en líneas valuadas usando
 * solo el catálogo. Lanza Error con mensaje en español si algo no es válido.
 */
export function calcularLineas(
  entradas: LineaEntrada[],
  catalogo: Catalogo,
  canal: CanalVenta,
  fecha: Date
): LineaCalculada[] {
  if (entradas.length === 0) {
    throw new Error("La venta no tiene productos.");
  }
  return entradas.flatMap((entrada) => {
    switch (entrada.tipoLinea) {
      case "PRODUCTO":
        return [calcularLineaProducto(catalogo, canal, entrada)];
      case "PIZZA_PERSONALIZADA":
        return [calcularLineaPersonalizada(catalogo, canal, entrada)];
      case "ALITAS_PERSONALIZADAS":
        return [calcularLineaAlitas(catalogo, canal, entrada)];
      case "PROMOCION":
        return calcularLineaPromocion(catalogo, canal, fecha, entrada);
    }
  });
}

/** Regla 6: el total solo suma líneas activas (incluye extras). */
export function totalVenta(
  lineas: { precioUnitario: Prisma.Decimal; cantidad: number; activo: boolean }[]
): Prisma.Decimal {
  return lineas.reduce(
    (total, linea) =>
      linea.activo
        ? total.plus(linea.precioUnitario.times(linea.cantidad))
        : total,
    new Prisma.Decimal(0)
  );
}

/** Aplana líneas calculadas (padres + extras) para totalizar o persistir. */
export function aplanarLineas(lineas: LineaCalculada[]): LineaCalculada[] {
  return lineas.flatMap((linea) => [linea, ...linea.extras]);
}

/** Cambio a entregar; lanza error si el pago no alcanza. */
export function calcularCambio(
  total: Prisma.Decimal,
  montoPagado: Prisma.Decimal
): Prisma.Decimal {
  if (montoPagado.lt(total)) {
    throw new Error("El monto pagado no cubre el total.");
  }
  return montoPagado.minus(total);
}
