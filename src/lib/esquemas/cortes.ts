import { z } from "zod";

const REGEX_MONTO = /^\d+(\.\d{1,2})?$/;

/** Monto en string (Decimal en BD), mayor a cero. */
const montoPositivo = z
  .string()
  .trim()
  .regex(REGEX_MONTO, "Monto inválido (ej. 150.00)")
  .refine((m) => Number(m) > 0, "El monto debe ser mayor a cero");

export const esquemaAbrirCorte = z.object({
  // El saldo inicial puede ser 0 (caja vacía)
  saldoInicial: z
    .string()
    .trim()
    .regex(REGEX_MONTO, "Monto inválido (ej. 500.00)"),
});

export const esquemaGasto = z.object({
  descripcion: z.string().trim().min(3, "Describe el gasto"),
  monto: montoPositivo,
});

export const esquemaSueldo = z.object({
  empleadoId: z.uuid("Selecciona al empleado"),
  monto: montoPositivo,
});

export const esquemaCerrarCorte = z.object({
  notasCierre: z.string().trim().optional(),
});

export type DatosAbrirCorte = z.infer<typeof esquemaAbrirCorte>;
export type DatosGasto = z.infer<typeof esquemaGasto>;
export type DatosSueldo = z.infer<typeof esquemaSueldo>;
export type DatosCerrarCorte = z.infer<typeof esquemaCerrarCorte>;
