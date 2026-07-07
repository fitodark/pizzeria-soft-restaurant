"use client";

import { toast } from "sonner";

export type TipoImpresion = "comandas" | "cuenta" | "cobro";

/** Llama a /api/impresion y reporta el resultado con toasts. */
export async function solicitarReimpresion(
  ventaId: string,
  tipo: TipoImpresion
): Promise<void> {
  try {
    const respuesta = await fetch("/api/impresion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ventaId, tipo }),
    });
    const datos = await respuesta.json().catch(() => null);
    if (respuesta.ok && datos?.ok) {
      toast.success("Impresión enviada.");
    } else {
      toast.error(datos?.error ?? "No se pudo imprimir.");
    }
  } catch {
    toast.error("No se pudo contactar al servidor de impresión.");
  }
}

/**
 * Aviso estándar cuando la operación quedó guardada pero la impresora falló:
 * toast con botón "Reimprimir" (la venta nunca se pierde por la impresora).
 */
export function avisarFalloImpresion(
  aviso: string,
  ventaId: string,
  tipo: TipoImpresion
): void {
  toast.warning(aviso, {
    duration: 10000,
    action: {
      label: "Reimprimir",
      onClick: () => void solicitarReimpresion(ventaId, tipo),
    },
  });
}
