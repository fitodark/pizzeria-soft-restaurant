"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary del dashboard: mantiene el shell (header/nav) visible y
 * ofrece reintentar sin perder la sesión ni la sucursal activa.
 */
export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-[#1C1917]">
        Ocurrió un error inesperado
      </h2>
      <p className="max-w-sm text-sm text-[#78716C]">
        Esta pantalla falló al cargar. La venta o el corte en curso no se
        pierden — intenta de nuevo.
      </p>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  );
}
