"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlitasPersonalizadasDialog } from "@/components/ventas/AlitasPersonalizadasDialog";
import { PizzaPersonalizadaDialog } from "@/components/ventas/PizzaPersonalizadaDialog";
import { Promo2x1Dialog } from "@/components/ventas/Promo2x1Dialog";
import { TarjetaProducto } from "@/components/ventas/TarjetaProducto";
import { aCents, formatoCents } from "@/components/ventas/carrito";
import type {
  ProductoWizard,
  PromoWizard,
  VarianteWizard,
} from "@/lib/consultas/ventas";

type Props = {
  comidas: ProductoWizard[];
  especialidades: ProductoWizard[];
  saboresAlitas: ProductoWizard[];
  promociones: PromoWizard[];
  onAgregarProducto: (producto: ProductoWizard, variante: VarianteWizard) => void;
  onAgregarPersonalizada: (datos: {
    tamano: string;
    mitad1: ProductoWizard;
    mitad2: ProductoWizard;
    precioCents: number;
  }) => void;
  onAgregarAlitas: (datos: {
    tamano: string;
    sabores: ProductoWizard[];
    precioCents: number;
  }) => void;
  onAgregarPromo: (promo: PromoWizard) => void;
  onAgregar2x1: (datos: {
    promo: PromoWizard;
    compra: { productoId: string; varianteId: string };
    regalo: { productoId: string; varianteId: string };
    tituloCompra: string;
    tituloRegalo: string;
    precioCents: number;
  }) => void;
};

/** Paso 3: comida por categoría + pizza/alitas personalizadas + promos. */
export function PasoComida({
  comidas,
  especialidades,
  saboresAlitas,
  promociones,
  onAgregarProducto,
  onAgregarPersonalizada,
  onAgregarAlitas,
  onAgregarPromo,
  onAgregar2x1,
}: Props) {
  const categorias = [...new Set(comidas.map((c) => c.categoria))];

  return (
    <div className="space-y-6">
      {(promociones.length > 0 ||
        especialidades.length > 0 ||
        saboresAlitas.length >= 2) && (
        <div className="flex flex-wrap gap-2">
          {especialidades.length > 0 ? (
            <PizzaPersonalizadaDialog
              especialidades={especialidades}
              onAgregar={onAgregarPersonalizada}
            />
          ) : null}
          {saboresAlitas.length >= 2 ? (
            <AlitasPersonalizadasDialog
              sabores={saboresAlitas}
              onAgregar={onAgregarAlitas}
            />
          ) : null}
          {promociones.map((promo) =>
            promo.tipo === "DOS_POR_UNO" ? (
              <Promo2x1Dialog
                key={promo.id}
                promo={promo}
                especialidades={especialidades}
                onAgregar={onAgregar2x1}
              />
            ) : (
              <Button
                key={promo.id}
                variant="secondary"
                className="h-11"
                onClick={() => onAgregarPromo(promo)}
              >
                <Badge variant="outline" className="bg-card">
                  {promo.tipo === "PAQUETE" ? "Paquete" : "Promo"}
                </Badge>
                {promo.nombre}
                {promo.precioEspecial ? (
                  <span className="tabular-nums font-semibold">
                    {formatoCents(aCents(promo.precioEspecial))}
                  </span>
                ) : null}
              </Button>
            )
          )}
        </div>
      )}
      {categorias.map((categoria) => (
        <div key={categoria} className="space-y-2">
          <h3 className="font-semibold capitalize">{categoria}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comidas
              .filter((c) => c.categoria === categoria)
              .map((comida) => (
                <TarjetaProducto
                  key={comida.id}
                  producto={comida}
                  onAgregar={onAgregarProducto}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
