import { z } from "zod";
import { RolPromoProducto, TipoPromocion } from "@/generated/prisma/enums";

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_PRECIO = /^\d+(\.\d{1,2})?$/;

export const esquemaPromoProducto = z.object({
  rol: z.enum(RolPromoProducto),
  /** null = el usuario elige el producto al vender (2x1 o componente libre). */
  productoId: z.uuid().nullable(),
  /** null = cualquier tamaño. */
  varianteId: z.uuid().nullable(),
  /** Componente libre de paquete: categoría de la que el cliente elige. */
  categoriaPermitida: z.string().trim().nullable(),
  /** Componente libre: tamaño fijado por nombre ("" = variante única). */
  tamano: z.string().trim(),
  /** Alitas en paquete: sobreescribe max_sabores ("" = sin override). */
  maxSaboresOverride: z.string().trim().regex(/^[1-3]?$/, "De 1 a 3"),
  cantidad: z.string().regex(/^[1-9]\d*$/, "Cantidad inválida"),
});

export const esquemaPromocion = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    descripcion: z.string().trim().optional(),
    tipo: z.enum(TipoPromocion, "Selecciona el tipo"),
    /** Vacío en DOS_POR_UNO; obligatorio en PROMOCION y PAQUETE. */
    precioEspecial: z.string().trim(),
    ventaDomicilio: z.boolean(),
    ventaEstablecimiento: z.boolean(),
    /** "yyyy-MM-dd" o vacío. Solo PROMOCION / DOS_POR_UNO. */
    fechaInicio: z.string().trim(),
    fechaFin: z.string().trim(),
    diasSemana: z.array(z.number().int().min(0).max(6)),
    /** false: no se vende en fechas del catálogo de días festivos. */
    aplicaFestivos: z.boolean(),
    activa: z.boolean(),
    productos: z.array(esquemaPromoProducto).min(1, "Agrega al menos un producto"),
  })
  .superRefine((datos, ctx) => {
    if (!datos.ventaDomicilio && !datos.ventaEstablecimiento) {
      ctx.addIssue({
        code: "custom",
        path: ["ventaEstablecimiento"],
        message: "Habilita al menos un canal de venta",
      });
    }

    if (datos.tipo === TipoPromocion.DOS_POR_UNO) {
      if (datos.precioEspecial !== "") {
        ctx.addIssue({
          code: "custom",
          path: ["precioEspecial"],
          message: "El 2x1 no lleva precio especial (se cobra la pizza comprada)",
        });
      }
      const requeridos = datos.productos.filter(
        (p) => p.rol === RolPromoProducto.REQUERIDO
      );
      const regalos = datos.productos.filter(
        (p) => p.rol === RolPromoProducto.REGALO
      );
      if (requeridos.length !== 1 || regalos.length !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["productos"],
          message: "El 2x1 lleva exactamente un producto comprado y un regalo",
        });
      }
    } else {
      if (!REGEX_PRECIO.test(datos.precioEspecial)) {
        ctx.addIssue({
          code: "custom",
          path: ["precioEspecial"],
          message: "Precio inválido (ej. 199.00)",
        });
      }
      datos.productos.forEach((producto, indice) => {
        if (producto.rol !== RolPromoProducto.REQUERIDO) {
          ctx.addIssue({
            code: "custom",
            path: ["productos", indice, "rol"],
            message: "Los regalos solo existen en el 2x1",
          });
        }
        // Componente fijo (producto) o libre (categoría a elegir al vender)
        if (!producto.productoId && !producto.categoriaPermitida) {
          ctx.addIssue({
            code: "custom",
            path: ["productos", indice, "productoId"],
            message: "Selecciona un producto o una categoría a elegir",
          });
        }
      });
    }

    if (datos.tipo !== TipoPromocion.PAQUETE) {
      for (const campo of ["fechaInicio", "fechaFin"] as const) {
        if (datos[campo] !== "" && !REGEX_FECHA.test(datos[campo])) {
          ctx.addIssue({
            code: "custom",
            path: [campo],
            message: "Fecha inválida",
          });
        }
      }
      if (
        datos.fechaInicio &&
        datos.fechaFin &&
        datos.fechaInicio > datos.fechaFin
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["fechaFin"],
          message: "La fecha fin debe ser posterior al inicio",
        });
      }
    }
  });

export type DatosPromocion = z.infer<typeof esquemaPromocion>;
export type DatosPromoProducto = z.infer<typeof esquemaPromoProducto>;
