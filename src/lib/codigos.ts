import { randomInt } from "node:crypto";

/**
 * Código de aclaración de la venta: 6 caracteres aleatorios que el cliente
 * dicta por teléfono, con alfabeto SIN caracteres confundibles
 * (sin 0/O, 1/I/L, 5/S, 8/B). 27^6 ≈ 387 millones de combinaciones:
 * inadivinable y sin colisiones prácticas para el volumen del POS.
 */
const ALFABETO = "234679ACDEFGHJKMNPQRTUVWXYZ";

export function generarCodigoVenta(): string {
  let codigo = "";
  for (let i = 0; i < 6; i += 1) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return codigo;
}

/** Normaliza lo que teclea el encargado: "7qk-4fm " → "7QK4FM". */
export function normalizarCodigo(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
