import { z } from "zod";
import { PeriodoSueldo, Rol } from "@/generated/prisma/enums";

const camposComunes = {
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  rol: z.enum(Rol, "Selecciona un rol"),
  // El dinero viaja como string para no perder precisión (Decimal en BD).
  sueldo: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Sueldo inválido (ej. 1500.00)"),
  periodoSueldo: z.enum(PeriodoSueldo, "Selecciona un periodo"),
  sucursalIds: z.array(z.uuid()),
  activo: z.boolean(),
};

const validarSucursalObligatoria = (
  datos: { rol: Rol; sucursalIds: string[] },
  ctx: z.RefinementCtx
) => {
  if (datos.rol !== Rol.ADMINISTRADOR && datos.sucursalIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["sucursalIds"],
      message: "Asigna al menos una sucursal (solo el administrador puede operar sin asignación)",
    });
  }
};

export const esquemaUsuarioNuevo = z
  .object({
    ...camposComunes,
    email: z.email("Correo inválido"),
    password: z.string().min(8, "Contraseña de al menos 8 caracteres"),
    pin: z.string().regex(/^\d{4}$/, "PIN de exactamente 4 dígitos"),
  })
  .superRefine(validarSucursalObligatoria);

export const esquemaUsuarioEdicion = z
  .object({
    ...camposComunes,
    // Opcionales: solo si se desea restablecer
    password: z
      .string()
      .min(8, "Contraseña de al menos 8 caracteres")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    pin: z
      .string()
      .regex(/^\d{4}$/, "PIN de exactamente 4 dígitos")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .superRefine(validarSucursalObligatoria);

export type DatosUsuarioNuevo = z.infer<typeof esquemaUsuarioNuevo>;
export type DatosUsuarioEdicion = z.infer<typeof esquemaUsuarioEdicion>;
