import type { LineaEntrada } from "@/lib/precios";

/** Línea del pedido en el estado local del wizard (solo presentación;
 *  los precios en centavos son informativos — el servidor recalcula). */
export type ExtraCarrito = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioCents: number;
};

export type LineaCarrito = {
  uid: string;
  tipoLinea:
    | "PRODUCTO"
    | "PIZZA_PERSONALIZADA"
    | "ALITAS_PERSONALIZADAS"
    | "PROMOCION";
  titulo: string;
  subtitulo?: string;
  cantidad: number;
  precioCents: number;
  permiteExtrasNotas: boolean;
  notas: string;
  extras: ExtraCarrito[];
  // PRODUCTO
  productoId?: string;
  varianteId?: string;
  // PIZZA_PERSONALIZADA / ALITAS_PERSONALIZADAS
  tamano?: string;
  mitad1ProductoId?: string;
  mitad2ProductoId?: string;
  // ALITAS_PERSONALIZADAS
  saboresProductoIds?: string[];
  // PROMOCION
  promocionId?: string;
  compraProductoId?: string;
  compraVarianteId?: string;
  regaloProductoId?: string;
  regaloVarianteId?: string;
};

export const aCents = (precio: string): number =>
  Math.round(Number(precio) * 100);

export const formatoCents = (cents: number): string =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    cents / 100
  );

export function totalCarritoCents(lineas: LineaCarrito[]): number {
  return lineas.reduce(
    (total, linea) =>
      total +
      linea.precioCents * linea.cantidad +
      linea.extras.reduce((t, e) => t + e.precioCents * e.cantidad, 0),
    0
  );
}

/** Convierte el carrito al payload de crearVenta (sin precios). */
export function aLineasEntrada(lineas: LineaCarrito[]): LineaEntrada[] {
  return lineas.map((linea): LineaEntrada => {
    const extras = linea.extras.map((e) => ({
      productoId: e.productoId,
      cantidad: e.cantidad,
    }));
    if (linea.tipoLinea === "PRODUCTO") {
      return {
        tipoLinea: "PRODUCTO",
        productoId: linea.productoId!,
        varianteId: linea.varianteId!,
        cantidad: linea.cantidad,
        notas: linea.notas || undefined,
        extras: extras.length > 0 ? extras : undefined,
      };
    }
    if (linea.tipoLinea === "PIZZA_PERSONALIZADA") {
      return {
        tipoLinea: "PIZZA_PERSONALIZADA",
        tamano: linea.tamano!,
        mitad1ProductoId: linea.mitad1ProductoId!,
        mitad2ProductoId: linea.mitad2ProductoId!,
        cantidad: linea.cantidad,
        notas: linea.notas || undefined,
        extras: extras.length > 0 ? extras : undefined,
      };
    }
    if (linea.tipoLinea === "ALITAS_PERSONALIZADAS") {
      return {
        tipoLinea: "ALITAS_PERSONALIZADAS",
        tamano: linea.tamano!,
        saboresProductoIds: linea.saboresProductoIds!,
        cantidad: linea.cantidad,
        notas: linea.notas || undefined,
        extras: extras.length > 0 ? extras : undefined,
      };
    }
    return {
      tipoLinea: "PROMOCION",
      promocionId: linea.promocionId!,
      cantidad: linea.cantidad,
      compraProductoId: linea.compraProductoId,
      compraVarianteId: linea.compraVarianteId,
      regaloProductoId: linea.regaloProductoId,
      regaloVarianteId: linea.regaloVarianteId,
    };
  });
}
