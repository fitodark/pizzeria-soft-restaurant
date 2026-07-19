import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { COOKIE_SESION, hashearTokenSesion } from "@/lib/sesiones";

const COOKIE_SUCURSAL = "sucursal_activa";

/**
 * Protege todo excepto /login validando la cookie de sesión contra la BD
 * local (consulta indexada por token_hash; en LAN es <1 ms). Sin sesión →
 * /login; con sesión pero sin sucursal seleccionada → /seleccionar-sucursal.
 * La autorización por rol NO vive aquí: cada server action valida con
 * lib/permisos.ts, y la expiración deslizante se renueva en getPerfilAutenticado.
 */
export default async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_SESION)?.value;

  let autenticado = false;
  if (token) {
    const sesion = await db.sesion.findUnique({
      where: { tokenHash: hashearTokenSesion(token) },
      select: {
        expiraAt: true,
        revocadaAt: true,
        usuario: { select: { activo: true } },
      },
    });
    autenticado = Boolean(
      sesion &&
        !sesion.revocadaAt &&
        sesion.expiraAt > new Date() &&
        sesion.usuario.activo
    );
  }

  const ruta = request.nextUrl.pathname;
  const esLogin = ruta === "/login";

  if (!autenticado && !esLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (autenticado && esLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/seleccionar-sucursal";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  const tieneSucursal = Boolean(request.cookies.get(COOKIE_SUCURSAL)?.value);
  if (autenticado && !tieneSucursal && !esLogin && ruta !== "/seleccionar-sucursal") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/seleccionar-sucursal";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    // Todo excepto estáticos e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
