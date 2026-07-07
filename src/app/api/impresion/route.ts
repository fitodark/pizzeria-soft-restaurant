import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { reimprimir } from "@/lib/impresion/servicio";

const esquemaReimpresion = z.object({
  ventaId: z.uuid(),
  tipo: z.enum(["comandas", "cuenta", "cobro"]),
});

/** Reimpresión de tickets (blueprint Step 11). */
export async function POST(request: Request) {
  let sesion;
  try {
    sesion = await getSesion();
  } catch {
    // getSesion redirige (lanza) sin sesión: en la API se traduce a 401
    return NextResponse.json(
      { ok: false, error: "Sesión inválida." },
      { status: 401 }
    );
  }
  if (!tienePermiso(sesion.rol, "impresion.reimprimir")) {
    return NextResponse.json(
      { ok: false, error: "No tienes permiso para reimprimir." },
      { status: 403 }
    );
  }

  const cuerpo = await request.json().catch(() => null);
  const parseo = esquemaReimpresion.safeParse(cuerpo);
  if (!parseo.success) {
    return NextResponse.json(
      { ok: false, error: "Solicitud inválida." },
      { status: 400 }
    );
  }

  const venta = await db.venta.findUnique({
    where: { id: parseo.data.ventaId },
    select: { sucursalId: true },
  });
  if (!venta || venta.sucursalId !== sesion.sucursalId) {
    return NextResponse.json(
      { ok: false, error: "La venta no existe en esta sucursal." },
      { status: 404 }
    );
  }

  const avisos = await reimprimir(parseo.data.ventaId, parseo.data.tipo);
  if (avisos.length > 0) {
    return NextResponse.json(
      { ok: false, error: avisos.join(" ") },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
