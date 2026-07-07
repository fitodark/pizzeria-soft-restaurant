"use client";

import { useState } from "react";
import { BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aCents, formatoCents } from "@/components/ventas/carrito";
import type { ProductoWizard, PromoWizard } from "@/lib/consultas/ventas";

type Seleccion = { productoId: string; varianteId: string };

type Props = {
  promo: PromoWizard;
  especialidades: ProductoWizard[];
  onAgregar: (datos: {
    promo: PromoWizard;
    compra: Seleccion;
    regalo: Seleccion;
    tituloCompra: string;
    tituloRegalo: string;
    precioCents: number;
  }) => void;
};

function SelectorPizza({
  etiqueta,
  especialidades,
  productoFijo,
  seleccion,
  onCambio,
}: {
  etiqueta: string;
  especialidades: ProductoWizard[];
  productoFijo: string | null;
  seleccion: Seleccion | null;
  onCambio: (s: Seleccion | null) => void;
}) {
  const opciones = productoFijo
    ? especialidades.filter((e) => e.id === productoFijo)
    : especialidades;
  const producto = opciones.find((e) => e.id === seleccion?.productoId);

  return (
    <div className="space-y-2">
      <Label>{etiqueta}</Label>
      <Select
        value={seleccion?.productoId ?? ""}
        onValueChange={(id) => onCambio(id ? { productoId: id, varianteId: "" } : null)}
      >
        <SelectTrigger className="h-11 w-full">
          <SelectValue placeholder="Elige la pizza" />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {producto ? (
        <div className="flex gap-2">
          {producto.variantes.map((v) => (
            <Button
              key={v.id}
              type="button"
              variant={seleccion?.varianteId === v.id ? "default" : "outline"}
              className="h-11 flex-1 flex-col gap-0 px-1"
              onClick={() =>
                onCambio({ productoId: producto.id, varianteId: v.id })
              }
            >
              <span className="text-xs capitalize">{v.tamano}</span>
              <span className="tabular-nums text-xs">
                {formatoCents(aCents(v.precio))}
              </span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Promo2x1Dialog({ promo, especialidades, onAgregar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [compra, setCompra] = useState<Seleccion | null>(null);
  const [regalo, setRegalo] = useState<Seleccion | null>(null);

  const productoCompra = especialidades.find((e) => e.id === compra?.productoId);
  const varianteCompra = productoCompra?.variantes.find(
    (v) => v.id === compra?.varianteId
  );
  const productoRegalo = especialidades.find((e) => e.id === regalo?.productoId);
  const varianteRegalo = productoRegalo?.variantes.find(
    (v) => v.id === regalo?.varianteId
  );

  const listo = Boolean(varianteCompra && varianteRegalo);

  const agregar = () => {
    if (!compra || !regalo || !productoCompra || !varianteCompra || !productoRegalo || !varianteRegalo) {
      return;
    }
    onAgregar({
      promo,
      compra,
      regalo,
      tituloCompra: `${productoCompra.nombre} (${varianteCompra.tamano})`,
      tituloRegalo: `${productoRegalo.nombre} (${varianteRegalo.tamano})`,
      precioCents: aCents(varianteCompra.precio),
    });
    setAbierto(false);
    setCompra(null);
    setRegalo(null);
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="h-11">
          <BadgePercent className="size-4" />
          {promo.nombre}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{promo.nombre}</DialogTitle>
          <DialogDescription>
            {promo.descripcion ??
              "Se cobra la pizza comprada; la de regalo entra a $0."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <SelectorPizza
            etiqueta="Pizza que compra"
            especialidades={especialidades}
            productoFijo={promo.requerido?.productoId ?? null}
            seleccion={compra}
            onCambio={setCompra}
          />
          <SelectorPizza
            etiqueta="Pizza de regalo ($0)"
            especialidades={especialidades}
            productoFijo={promo.regalo?.productoId ?? null}
            seleccion={regalo}
            onCambio={setRegalo}
          />
          <Button
            className="h-11 w-full justify-between"
            disabled={!listo}
            onClick={agregar}
          >
            Agregar 2x1
            {varianteCompra ? (
              <span className="tabular-nums font-semibold">
                {formatoCents(aCents(varianteCompra.precio))}
              </span>
            ) : null}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
