import { z } from "zod";

const REGEX_MONTO = /^\d+(\.\d{1,2})?$/;
const REGEX_CANTIDAD = /^\d+(\.\d{1,2})?$/;

export const esquemaCompraDetalle = z.object({
  /** null = insumo libre (verduras, harina…) sin producto del catálogo. */
  productoId: z.uuid().nullable(),
  descripcion: z.string().trim().min(1, "Describe la partida"),
  cantidad: z
    .string()
    .trim()
    .regex(REGEX_CANTIDAD, "Cantidad inválida")
    .refine((c) => Number(c) > 0, "La cantidad debe ser mayor a cero"),
  precioUnitario: z
    .string()
    .trim()
    .regex(REGEX_MONTO, "Precio inválido (ej. 18.50)"),
  sumaInventario: z.boolean(),
});

export const esquemaCompra = z
  .object({
    proveedor: z.string().trim().min(1, "El proveedor es obligatorio"),
    folioNota: z.string().trim().optional(),
    detalles: z.array(esquemaCompraDetalle).min(1, "Agrega al menos una partida"),
  })
  .superRefine((datos, ctx) => {
    datos.detalles.forEach((detalle, indice) => {
      if (detalle.sumaInventario && !detalle.productoId) {
        ctx.addIssue({
          code: "custom",
          path: ["detalles", indice, "productoId"],
          message: "Para sumar a inventario selecciona el producto",
        });
      }
    });
  });

export type DatosCompra = z.infer<typeof esquemaCompra>;
export type DatosCompraDetalle = z.infer<typeof esquemaCompraDetalle>;
