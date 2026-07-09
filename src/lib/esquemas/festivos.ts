import { z } from "zod";

export const esquemaDiaFestivo = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona la fecha del día festivo"),
  descripcion: z
    .string()
    .trim()
    .min(1, "Describe el día festivo (ej. 25 de diciembre — Navidad)"),
});

export type DatosDiaFestivo = z.infer<typeof esquemaDiaFestivo>;
