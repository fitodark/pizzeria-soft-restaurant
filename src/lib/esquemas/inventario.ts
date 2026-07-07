import { z } from "zod";

export const esquemaAjusteInventario = z.object({
  productoId: z.uuid(),
  // Cantidades con hasta 2 decimales, como string (Decimal en BD)
  nuevaExistencia: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Cantidad inválida (ej. 24 o 24.5)"),
  motivo: z.string().trim().min(3, "Describe el motivo del ajuste"),
});

export type DatosAjusteInventario = z.infer<typeof esquemaAjusteInventario>;
