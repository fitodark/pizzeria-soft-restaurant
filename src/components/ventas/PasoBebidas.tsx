"use client";

import { TarjetaProducto } from "@/components/ventas/TarjetaProducto";
import { estiloCategoria } from "@/components/ventas/familiasCategorias";
import { cn } from "@/lib/utils";
import type { ProductoWizard, VarianteWizard } from "@/lib/consultas/ventas";

type Props = {
  bebidas: ProductoWizard[];
  onAgregar: (producto: ProductoWizard, variante: VarianteWizard) => void;
};

/** Paso 2: bebidas del canal por categoría; tap para agregar. */
export function PasoBebidas({ bebidas, onAgregar }: Props) {
  if (bebidas.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No hay bebidas disponibles en este canal.
      </p>
    );
  }
  const categorias = [...new Set(bebidas.map((b) => b.categoria))];
  return (
    <div className="space-y-6">
      {categorias.map((categoria) => {
        const estilo = estiloCategoria(categoria);
        return (
          <section
            key={categoria}
            className={cn("space-y-3 rounded-xl border p-4", estilo.contenedor)}
          >
            <h3 className={cn("font-semibold capitalize", estilo.titulo)}>
              {categoria}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bebidas
                .filter((b) => b.categoria === categoria)
                .map((bebida) => (
                  <TarjetaProducto
                    key={bebida.id}
                    producto={bebida}
                    onAgregar={onAgregar}
                  />
                ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
