import { z } from "zod";
import { CanalVenta, MetodoPago } from "@/generated/prisma/enums";

const cantidad = z.number().int().min(1).max(99);

const esquemaExtra = z.object({
  productoId: z.uuid(),
  cantidad,
});

const esquemaLineaProducto = z.object({
  tipoLinea: z.literal("PRODUCTO"),
  productoId: z.uuid(),
  varianteId: z.uuid(),
  cantidad,
  notas: z.string().trim().max(200).optional(),
  extras: z.array(esquemaExtra).max(10).optional(),
});

const esquemaLineaPersonalizada = z.object({
  tipoLinea: z.literal("PIZZA_PERSONALIZADA"),
  tamano: z.string().trim().min(1),
  mitad1ProductoId: z.uuid(),
  mitad2ProductoId: z.uuid(),
  cantidad,
  notas: z.string().trim().max(200).optional(),
  extras: z.array(esquemaExtra).max(10).optional(),
});

const esquemaLineaAlitas = z.object({
  tipoLinea: z.literal("ALITAS_PERSONALIZADAS"),
  tamano: z.string().trim().min(1),
  saboresProductoIds: z
    .array(z.uuid())
    .min(2, "Una orden combinada lleva al menos 2 sabores")
    .max(3, "Máximo 3 sabores por orden"),
  cantidad,
  notas: z.string().trim().max(200).optional(),
  extras: z.array(esquemaExtra).max(10).optional(),
});

const esquemaLineaPromocion = z.object({
  tipoLinea: z.literal("PROMOCION"),
  promocionId: z.uuid(),
  cantidad,
  /** Texto libre de "arma tu paquete" (va a las notas de la línea). */
  notas: z.string().trim().max(200).optional(),
  /** PAQUETE/PROMOCION: producto elegido por componente libre. */
  componentes: z
    .array(z.object({ componenteId: z.uuid(), productoId: z.uuid() }))
    .max(10)
    .optional(),
  compraProductoId: z.uuid().optional(),
  compraVarianteId: z.uuid().optional(),
  regaloProductoId: z.uuid().optional(),
  regaloVarianteId: z.uuid().optional(),
});

export const esquemaLineaVenta = z.discriminatedUnion("tipoLinea", [
  esquemaLineaProducto,
  esquemaLineaPersonalizada,
  esquemaLineaAlitas,
  esquemaLineaPromocion,
]);

export const esquemaCrearVenta = z
  .object({
    canal: z.enum(CanalVenta),
    mesa: z.string().trim().max(30).optional(),
    clienteId: z.uuid().optional(),
    direccionId: z.uuid().optional(),
    metodoPago: z.enum(MetodoPago),
    /** Domicilio: con cuánto paga el cliente (para llevar el cambio). */
    pagaCon: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido")
      .optional(),
    lineas: z.array(esquemaLineaVenta).min(1, "La venta no tiene productos"),
  })
  .superRefine((datos, ctx) => {
    if (datos.canal === CanalVenta.DOMICILIO) {
      if (!datos.clienteId || !datos.direccionId) {
        ctx.addIssue({
          code: "custom",
          path: ["clienteId"],
          message: "Las ventas a domicilio requieren cliente y dirección",
        });
      }
    }
  });

export type DatosCrearVenta = z.infer<typeof esquemaCrearVenta>;

// ── Ciclo de vida (Paso 10b) ─────────────────────────────────────────────

export const esquemaAgregarLineas = z.object({
  ventaId: z.uuid(),
  lineas: z.array(esquemaLineaVenta).min(1, "No hay líneas que agregar"),
});

export const esquemaInactivarLinea = z.object({
  detalleId: z.uuid(),
  pin: z.string().regex(/^\d{4}$/, "El PIN son 4 dígitos"),
});

export const esquemaCobrarVenta = z.object({
  ventaId: z.uuid(),
  /** Solo EFECTIVO: con cuánto paga (el cambio se calcula en servidor). */
  montoPagado: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido (ej. 500.00)")
    .optional(),
});

export const esquemaCancelarVenta = z.object({
  ventaId: z.uuid(),
  motivo: z
    .string()
    .trim()
    .min(5, "Describe el motivo de la cancelación (mínimo 5 caracteres)")
    .max(300),
  pin: z.string().regex(/^\d{4}$/, "El PIN son 4 dígitos"),
});

export const esquemaAsignarRepartidor = z.object({
  ventaId: z.uuid(),
  repartidorId: z.uuid("Selecciona al repartidor"),
});

export type DatosAgregarLineas = z.infer<typeof esquemaAgregarLineas>;
export type DatosInactivarLinea = z.infer<typeof esquemaInactivarLinea>;
export type DatosCobrarVenta = z.infer<typeof esquemaCobrarVenta>;
export type DatosAsignarRepartidor = z.infer<typeof esquemaAsignarRepartidor>;
