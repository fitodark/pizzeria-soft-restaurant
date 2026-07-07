"use client";

import { TarjetaProducto } from "@/components/ventas/TarjetaProducto";
import type { ProductoWizard, VarianteWizard } from "@/lib/consultas/ventas";

type Props = {
  bebidas: ProductoWizard[];
  onAgregar: (producto: ProductoWizard, variante: VarianteWizard) => void;
};

/** Paso 2: grid de bebidas del canal; tap para agregar. */
export function PasoBebidas({ bebidas, onAgregar }: Props) {
  if (bebidas.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No hay bebidas disponibles en este canal.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bebidas.map((bebida) => (
        <TarjetaProducto key={bebida.id} producto={bebida} onAgregar={onAgregar} />
      ))}
    </div>
  );
}
