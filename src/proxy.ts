import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { COOKIE_SESION, hashearTokenSesion } from "@/lib/sesiones";

const COOKIE_SUCURSAL = "sucursal_activa";

/** CSP con nonce por request; Next.js le agrega el nonce a sus propios
 * scripts inline de hidratación al detectarlo en este header. No incluye
 * `upgrade-insecure-requests`: el POS corre en LAN por HTTP a propósito. */
function construirCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'", // Radix/shadcn posicionan popovers con estilos inline
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * Protege todo excepto /login validando la cookie de sesión contra la BD
 * local (consulta indexada por token_hash; en LAN es <1 ms). Sin sesión →
 * /login; con sesión pero sin sucursal seleccionada → /seleccionar-sucursal.
 * La autorización por rol NO vive aquí: cada server action valida con
 * lib/permisos.ts, y la expiración deslizante se renueva en getPerfilAutenticado.
 */
export default async function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64");
  const csp = construirCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const responder = (respuesta: NextResponse) => {
    respuesta.headers.set("Content-Security-Policy", csp);
    return respuesta;
  };

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
    return responder(NextResponse.redirect(destino));
  }

  if (autenticado && esLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/seleccionar-sucursal";
    destino.search = "";
    return responder(NextResponse.redirect(destino));
  }

  const tieneSucursal = Boolean(request.cookies.get(COOKIE_SUCURSAL)?.value);
  if (autenticado && !tieneSucursal && !esLogin && ruta !== "/seleccionar-sucursal") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/seleccionar-sucursal";
    destino.search = "";
    return responder(NextResponse.redirect(destino));
  }

  return responder(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    // Todo excepto estáticos e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
