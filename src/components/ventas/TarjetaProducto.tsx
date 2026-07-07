"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatoCents, aCents } from "@/components/ventas/carrito";
import type { ProductoWizard, VarianteWizard } from "@/lib/consultas/ventas";

type Props = {
  producto: ProductoWizard;
  onAgregar: (producto: ProductoWizard, variante: VarianteWizard) => void;
};

/** Tarjeta táctil: una variante agrega directo; varias muestran botones. */
export function TarjetaProducto({ producto, onAgregar }: Props) {
  const unica = producto.variantes.length === 1 ? producto.variantes[0] : null;

  return (
    <Card className="py-3">
      <CardContent className="space-y-2 px-4">
        <div>
          <p className="font-medium leading-tight">{producto.nombre}</p>
          {producto.descripcion ? (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {producto.descripcion}
            </p>
          ) : null}
        </div>
        {unica ? (
          <Button
            className="h-11 w-full justify-between"
            variant="outline"
            onClick={() => onAgregar(producto, unica)}
          >
            Agregar
            <span className="tabular-nums font-semibold">
              {formatoCents(aCents(unica.precio))}
            </span>
          </Button>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {producto.variantes.map((variante) => (
              <Button
                key={variante.id}
                variant="outline"
                className="h-11 flex-col gap-0 px-1"
                onClick={() => onAgregar(producto, variante)}
              >
                <span className="text-xs capitalize">{variante.tamano}</span>
                <span className="tabular-nums text-xs font-semibold">
                  {formatoCents(aCents(variante.precio))}
                </span>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
