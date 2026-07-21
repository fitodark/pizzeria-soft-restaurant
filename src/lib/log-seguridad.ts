/**
 * Log de eventos de seguridad (intentos de login fallidos, bloqueos,
 * denegaciones de permiso). Sale por stderr en JSON de una línea; NSSM
 * redirige el stdout/stderr del servicio a archivo (scripts/install-service.ps1),
 * así que esto ya persiste sin agregar una librería de logging.
 * Nunca recibe contraseñas ni tokens, solo identificadores y motivos.
 */
export function registrarEventoSeguridad(
  evento: string,
  detalle: Record<string, string | number | boolean | null>
): void {
  console.warn(
    JSON.stringify({ evento, timestamp: new Date().toISOString(), ...detalle })
  );
}
