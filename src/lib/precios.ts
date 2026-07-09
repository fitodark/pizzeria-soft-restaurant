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
  /** false: no se vende en fechas de la tabla dias_festivos */
  aplicaFestivos: boolean;
};

/** Fecha operativa (reloj local de la sucursal) como "yyyy-MM-dd". */
export function fechaLocalTexto(fecha: Date): string {
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
 * Regla 4 de precios: canal, bandera activa, días de la semana y festivos se
 * validan para TODO tipo (los paquetes son L-V y pueden excluir festivos);
 * la temporada (fechas) solo aplica a PROMOCION y DOS_POR_UNO — PAQUETE no
 * captura fechas. Debe evaluarse en servidor, no solo ocultarse en UI.
 * `esFestivo` lo resuelve el caller consultando la tabla dias_festivos.
 */
export function promocionVigente(
  promocion: PromocionVigencia,
  fecha: Date,
  canal: CanalVenta,
  esFestivo = false
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
  if (esFestivo && !promocion.aplicaFestivos) {
    return false;
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
  canal: CanalVenta,
  esFestivo = false
): T[] {
  return promociones.filter((p) => promocionVigente(p, fecha, canal, esFestivo));
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

/** Fila de promocion_productos: componente fijo (productoId) o a elegir
 *  (productoId null + categoriaPermitida; el tamaño se fija por nombre). */
export type ComponentePromocion = {
  id: string;
  rol: RolPromoProducto;
  productoId: string | null;
  varianteId: string | null;
  categoriaPermitida: string | null;
  tamano: string | null;
  maxSaboresOverride: number | null;
  cantidad: number;
};

export type PromocionCatalogo = PromocionVigencia & {
  id: string;
  nombre: string;
  precioEspecial: Prisma.Decimal | null;
  productos: ComponentePromocion[];
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
      /** Texto libre de "arma tu paquete" (sabor de la rebanada, "3 Hawaianas
       *  y 2 Jumay"…): viaja en las notas de la línea de la promoción. */
      notas?: string;
      /** PAQUETE/PROMOCION: elección por componente libre (fila → producto). */
      componentes?: { componenteId: string; productoId: string }[];
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

/** Única variante activa del producto, o error pidiendo fijar el tamaño. */
function varianteUnica(producto: ProductoCatalogo): VarianteCatalogo {
  const activas = producto.variantes.filter((v) => v.activa);
  if (activas.length !== 1) {
    throw new Error(
      `Configura el tamaño de "${producto.nombre}" en la promoción.`
    );
  }
  return activas[0];
}

/**
 * Componentes del paquete/promoción como líneas hijas a $0: los fijos salen
 * de la configuración; los libres (productoId null) exigen la elección del
 * cliente dentro de `categoriaPermitida` con el tamaño fijado por nombre.
 * Con esto la comanda de cocina sabe exactamente qué preparar.
 */
function calcularComponentesPromo(
  catalogo: Catalogo,
  canal: CanalVenta,
  promocion: PromocionCatalogo,
  entrada: Extract<LineaEntrada, { tipoLinea: "PROMOCION" }>
): LineaCalculada[] {
  const componentes = promocion.productos.filter(
    (c) => c.rol === RolPromoProducto.REQUERIDO
  );
  const elecciones = new Map(
    (entrada.componentes ?? []).map((c) => [c.componenteId, c.productoId])
  );
  for (const componenteId of elecciones.keys()) {
    const componente = componentes.find((c) => c.id === componenteId);
    if (!componente || componente.productoId) {
      throw new Error(
        `La elección no corresponde a un componente de "${promocion.nombre}".`
      );
    }
  }

  return componentes.map((componente) => {
    let producto: ProductoCatalogo;
    let variante: VarianteCatalogo;

    if (componente.productoId) {
      // Componente fijo: configurado en la promoción
      producto = obtenerProductoVendible(catalogo, componente.productoId, canal);
      variante = componente.varianteId
        ? obtenerVariante(producto, componente.varianteId)
        : componente.tamano
          ? varianteDeTamano(producto, componente.tamano)
          : varianteUnica(producto);
    } else {
      // Componente libre: el cliente elige dentro de la categoría permitida
      const eleccionId = elecciones.get(componente.id);
      if (!eleccionId) {
        throw new Error(
          `Elige ${componente.categoriaPermitida ?? "el producto"} de "${promocion.nombre}".`
        );
      }
      producto = obtenerProductoVendible(catalogo, eleccionId, canal);
      if (
        componente.categoriaPermitida &&
        producto.categoria !== componente.categoriaPermitida
      ) {
        throw new Error(
          `"${producto.nombre}" no entra en "${promocion.nombre}" (debe ser de ${componente.categoriaPermitida}).`
        );
      }
      variante = componente.tamano
        ? varianteDeTamano(producto, componente.tamano)
        : varianteUnica(producto);
    }

    if (producto.tipoArticulo !== TipoArticulo.VENTA) {
      throw new Error(
        `"${producto.nombre}" es un extra: no puede ser componente de paquete.`
      );
    }

    return {
      tipoLinea: TipoLinea.PRODUCTO,
      productoId: producto.id,
      varianteId: variante.id,
      promocionId: null,
      cantidad: componente.cantidad * entrada.cantidad,
      // El precio del componente lo absorbe el precio especial del conjunto
      precioUnitario: new Prisma.Decimal(0),
      notas: null,
      mitades: [],
      extras: [],
    };
  });
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
  esFestivo: boolean,
  entrada: Extract<LineaEntrada, { tipoLinea: "PROMOCION" }>
): LineaCalculada[] {
  const promocion = catalogo.promociones.get(entrada.promocionId);
  if (!promocion) {
    throw new Error("La promoción no existe.");
  }
  // Regla 4: validar vigencia y canal SIEMPRE en servidor
  if (!promocionVigente(promocion, fecha, canal, esFestivo)) {
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
        notas: entrada.notas || null,
        mitades: [],
        // Los componentes cuelgan como líneas hijas a $0 (parent_detalle_id)
        extras: calcularComponentesPromo(catalogo, canal, promocion, entrada),
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
  fecha: Date,
  esFestivo = false
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
        return calcularLineaPromocion(catalogo, canal, fecha, esFestivo, entrada);
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
