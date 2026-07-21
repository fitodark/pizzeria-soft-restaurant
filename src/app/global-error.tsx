"use client";

/**
 * Error boundary raíz (App Router): captura cualquier excepción no manejada
 * en render/servidor. Sin esto, un crash a medio cobro deja al cajero en una
 * página genérica sin forma de reintentar.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-MX">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAF9] p-6 text-center antialiased">
        <h1 className="text-xl font-semibold text-[#1C1917]">
          Ocurrió un error inesperado
        </h1>
        <p className="max-w-sm text-sm text-[#78716C]">
          La venta en curso no se perdió. Intenta de nuevo o avisa al
          encargado si el problema continúa.
        </p>
        <button
          onClick={() => reset()}
          className="h-11 rounded-lg bg-[#DC2626] px-6 font-medium text-white"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
