import { z } from "zod";
import { TipoArticulo, TipoProducto } from "@/generated/prisma/enums";

export const esquemaVariante = z.object({
  /** Presente solo al editar una variante existente. */
  id: z.uuid().optional(),
  tamano: z
    .string()
    .trim()
    .min(1, "Indica el tamaño (o 'unico')")
    .transform((t) => t.toLowerCase()),
  // Dinero como string (Decimal en BD)
  precio: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Precio inválido (ej. 139.00)"),
  /** Sabores combinables en este tamaño (alitas: la orden de 7 lleva 1). */
  maxSabores: z
    .number("Sabores inválidos")
    .int("Sabores inválidos")
    .min(1, "Mínimo 1 sabor")
    .max(3, "Máximo 3 sabores"),
  activa: z.boolean(),
});

export const esquemaProducto = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    descripcion: z.string().trim().optional(),
    tipo: z.enum(TipoProducto, "Selecciona comida o bebida"),
    tipoArticulo: z.enum(TipoArticulo, "Selecciona venta o extra"),
    categoria: z
      .string()
      .trim()
      .min(1, "La categoría es obligatoria")
      .transform((c) => c.toLowerCase()),
    ventaDomicilio: z.boolean(),
    ventaEstablecimiento: z.boolean(),
    inventariable: z.boolean(),
    esEspecialidad: z.boolean(),
    permiteExtrasNotas: z.boolean(),
    activo: z.boolean(),
    variantes: z.array(esquemaVariante).min(1, "Agrega al menos una variante"),
  })
  .superRefine((datos, ctx) => {
    const vistos = new Set<string>();
    datos.variantes.forEach((variante, indice) => {
      if (vistos.has(variante.tamano)) {
        ctx.addIssue({
          code: "custom",
          path: ["variantes", indice, "tamano"],
          message: "Tamaño repetido",
        });
      }
      vistos.add(variante.tamano);
    });
    if (
      datos.esEspecialidad &&
      (datos.tipo !== TipoProducto.COMIDA ||
        datos.tipoArticulo !== TipoArticulo.VENTA)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["esEspecialidad"],
        message: "Solo comida de venta puede ser especialidad (mitades de pizza)",
      });
    }
    // El precio de un extra se cobra desde su variante "unico" (regla de precios 3).
    if (
      datos.tipoArticulo === TipoArticulo.EXTRA &&
      !datos.variantes.some((v) => v.tamano === "unico" && v.activa)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["tipoArticulo"],
        message: "Un extra necesita una variante 'unico' activa (su precio)",
      });
    }
  });

export type DatosProducto = z.infer<typeof esquemaProducto>;
export type DatosVariante = z.infer<typeof esquemaVariante>;
