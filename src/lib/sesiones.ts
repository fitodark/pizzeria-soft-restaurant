import { createHash, randomBytes } from "node:crypto";

/**
 * Sesiones de la auth propia (local-first): el token viaja en una cookie
 * httpOnly y en BD solo se guarda su hash — un volcado de la tabla no
 * permite suplantar sesiones. La vigencia la gobierna `expira_at` en BD
 * (deslizante); la cookie dura más y por sí sola no autentica.
 */

export const COOKIE_SESION = "sesion";
export const HORAS_SESION = 12;

export function generarTokenSesion(): string {
  return randomBytes(32).toString("base64url");
}

export function hashearTokenSesion(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function expiracionSesion(desde: Date = new Date()): Date {
  return new Date(desde.getTime() + HORAS_SESION * 60 * 60 * 1000);
}
