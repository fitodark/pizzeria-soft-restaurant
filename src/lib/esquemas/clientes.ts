import { z } from "zod";

export const esquemaTelefono = z
  .string()
  .trim()
  .transform((t) => t.replace(/[\s\-()]/g, ""))
  .pipe(z.string().regex(/^\d{7,15}$/, "Teléfono de 7 a 15 dígitos"));

export const esquemaCliente = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  telefono: esquemaTelefono,
  // Dirección opcional en el alta (obligatoria al vender a domicilio)
  direccion: z.string().trim().optional(),
  referencia: z.string().trim().optional(),
});

export const esquemaDireccion = z.object({
  direccion: z.string().trim().min(5, "Describe la dirección completa"),
  referencia: z.string().trim().optional(),
  activa: z.boolean(),
});

export type DatosCliente = z.infer<typeof esquemaCliente>;
export type DatosDireccion = z.infer<typeof esquemaDireccion>;
