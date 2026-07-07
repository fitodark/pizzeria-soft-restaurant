import { z } from "zod";

export const esquemaSucursal = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  calle: z.string().trim().min(1, "La calle es obligatoria"),
  colonia: z.string().trim().min(1, "La colonia es obligatoria"),
  ciudad: z.string().trim().min(1, "La ciudad es obligatoria"),
  estado: z.string().trim().min(1, "El estado es obligatorio"),
  codigoPostal: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Código postal de 5 dígitos"),
  telefono: z
    .string()
    .trim()
    .min(7, "Teléfono de al menos 7 dígitos")
    .max(20, "Teléfono demasiado largo"),
  activa: z.boolean(),
});

export type DatosSucursal = z.infer<typeof esquemaSucursal>;
