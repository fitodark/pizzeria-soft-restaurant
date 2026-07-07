"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { agregarLineas } from "@/lib/acciones/ventas";
import { avisarFalloImpresion } from "@/components/ventas/reimpresion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TarjetaProducto } from "@/components/ventas/TarjetaProducto";
import type {
  CatalogoWizard,
  ProductoWizard,
  VarianteWizard,
} from "@/lib/consultas/ventas";
import { CanalVenta } from "@/generated/prisma/enums";

type Props = {
  ventaId: string;
  canal: CanalVenta;
  catalogo: CatalogoWizard;
};

/** Agrega productos sueltos a una venta PENDIENTE (el servidor revalúa). */
export function AgregarLineasDialog({ ventaId, canal, catalogo }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const disponibles = useMemo(
    () =>
      catalogo.productos.filter((p) =>
        canal === CanalVenta.DOMICILIO
          ? p.ventaDomicilio
          : p.ventaEstablecimiento
      ),
    [catalogo.productos, canal]
  );

  const agregar = (producto: ProductoWizard, variante: VarianteWizard) => {
    startTransition(async () => {
      const resultado = await agregarLineas({
        ventaId,
        lineas: [
          {
            tipoLinea: "PRODUCTO",
            productoId: producto.id,
            varianteId: variante.id,
            cantidad: 1,
          },
        ],
      });
      if (resultado.ok) {
        toast.success(`${producto.nombre} agregado a la venta.`);
        if (resultado.avisoImpresion) {
          avisarFalloImpresion(resultado.avisoImpresion, ventaId, "comandas");
        }
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          <Plus className="size-4" />
          Agregar productos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agregar productos a la venta</DialogTitle>
          <DialogDescription>
            Cada clic agrega una unidad; el total se recalcula al momento.
          </DialogDescription>
        </DialogHeader>
        <div
          className={
            pendiente ? "pointer-events-none opacity-60" : undefined
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {disponibles.map((producto) => (
              <TarjetaProducto
                key={producto.id}
                producto={producto}
                onAgregar={agregar}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
