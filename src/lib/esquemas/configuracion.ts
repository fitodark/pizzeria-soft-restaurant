import { z } from "zod";

export const MODOS_IMPRESORA = ["tcp", "share"] as const;
export const esquemaModo = z.enum(MODOS_IMPRESORA);
export type ModoImpresora = z.infer<typeof esquemaModo>;

const RUTA_TCP = /^[\w.-]+(:\d{1,5})?$/; // "192.168.1.50" o "host:9100"
const RUTA_SHARE = /^\\\\[^\\]+\\.+$/; // "\\EQUIPO\Tickets"

/** Mensaje de error si la ruta no corresponde al modo; null si es válida. */
export function validarRuta(modo: ModoImpresora, ruta: string): string | null {
  if (!ruta.trim()) {
    return "Captura la ruta de la impresora";
  }
  if (modo === "tcp" && !RUTA_TCP.test(ruta.trim())) {
    return "En modo red usa IP o host, ej. 192.168.1.50 (puerto opcional :9100)";
  }
  if (modo === "share" && !RUTA_SHARE.test(ruta.trim())) {
    return "En modo compartida usa \\\\EQUIPO\\NombreImpresora";
  }
  return null;
}

const IMPRESORAS = [
  ["impresoraPrincipalModo", "impresoraPrincipalRuta"],
  ["impresoraCocinaModo", "impresoraCocinaRuta"],
  ["impresoraBebidasModo", "impresoraBebidasRuta"],
] as const;

export const esquemaConfiguracion = z
  .object({
    impresoraPrincipalModo: esquemaModo,
    impresoraPrincipalRuta: z.string().trim(),
    impresoraCocinaModo: esquemaModo,
    impresoraCocinaRuta: z.string().trim(),
    impresoraBebidasModo: esquemaModo,
    impresoraBebidasRuta: z.string().trim(),
    logoUrl: z.string().trim().optional(),
    leyendaPie: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
  })
  .superRefine((datos, ctx) => {
    for (const [campoModo, campoRuta] of IMPRESORAS) {
      const error = validarRuta(datos[campoModo], datos[campoRuta]);
      if (error) {
        ctx.addIssue({ code: "custom", path: [campoRuta], message: error });
      }
    }
  });

export const esquemaPrueba = z
  .object({
    modo: esquemaModo,
    ruta: z.string().trim(),
    impresora: z.string().trim().min(1),
  })
  .superRefine((datos, ctx) => {
    const error = validarRuta(datos.modo, datos.ruta);
    if (error) {
      ctx.addIssue({ code: "custom", path: ["ruta"], message: error });
    }
  });

export type DatosConfiguracion = z.infer<typeof esquemaConfiguracion>;
export type DatosPrueba = z.infer<typeof esquemaPrueba>;
