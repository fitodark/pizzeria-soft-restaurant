import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_SUCURSAL = "sucursal_activa";

/**
 * Protege todo excepto /login: sin sesión → /login; con sesión pero sin
 * sucursal seleccionada → /seleccionar-sucursal. También refresca la sesión
 * de Supabase (cookies httpOnly). La autorización por rol NO vive aquí:
 * cada server action valida con lib/permisos.ts.
 */
export default async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env"
    );
  }

  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        respuesta = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          respuesta.cookies.set(name, value, options)
        );
      },
    },
  });

  // No ejecutar código entre createServerClient y getUser: el refresco de
  // sesión depende de esta llamada.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const esLogin = ruta === "/login";

  if (!user && !esLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (user && esLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/seleccionar-sucursal";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  const tieneSucursal = Boolean(request.cookies.get(COOKIE_SUCURSAL)?.value);
  if (user && !tieneSucursal && !esLogin && ruta !== "/seleccionar-sucursal") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/seleccionar-sucursal";
    destino.search = "";
    const redireccion = NextResponse.redirect(destino);
    // Conservar las cookies de sesión recién refrescadas.
    respuesta.cookies.getAll().forEach((cookie) => {
      redireccion.cookies.set(cookie);
    });
    return redireccion;
  }

  return respuesta;
}

export const config = {
  matcher: [
    // Todo excepto estáticos e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
