import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const FORMATO_MONEDA = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

/** Formatea montos es-MX ($1,234.50). Acepta string (Decimal serializado) o number. */
export function formatoMoneda(monto: string | number): string {
  const valor = typeof monto === "string" ? Number(monto) : monto;
  return FORMATO_MONEDA.format(Number.isFinite(valor) ? valor : 0);
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatoFecha(fecha: Date | string): string {
  return FORMATO_FECHA.format(
    typeof fecha === "string" ? new Date(fecha) : fecha
  );
}
