"use client";

import { useMemo, useState } from "react";
import { Drumstick, Plus, X } from "lucide-react";
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
import type { ProductoWizard } from "@/lib/consultas/ventas";

type Props = {
  sabores: ProductoWizard[];
  onAgregar: (datos: {
    tamano: string;
    sabores: ProductoWizard[];
    precioCents: number;
  }) => void;
};

/** Orden de alitas combinada: 2-3 sabores según el tamaño (max_sabores). */
export function AlitasPersonalizadasDialog({ sabores, onAgregar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [tamano, setTamano] = useState("");
  const [saborIds, setSaborIds] = useState<string[]>(["", ""]);

  // Solo tamaños que admiten combinar (la orden de 7 es de un solo sabor)
  const tamanos = useMemo(
    () => [
      ...new Set(
        sabores.flatMap((s) =>
          s.variantes.filter((v) => v.maxSabores >= 2).map((v) => v.tamano)
        )
      ),
    ],
    [sabores]
  );

  const disponibles = tamano
    ? sabores.filter((s) => s.variantes.some((v) => v.tamano === tamano))
    : [];
  const varianteDe = (s: ProductoWizard) =>
    s.variantes.find((v) => v.tamano === tamano)!;
  const maxSabores = disponibles.length
    ? Math.min(...disponibles.map((s) => varianteDe(s).maxSabores))
    : 2;

  const elegidos = saborIds
    .map((id) => disponibles.find((s) => s.id === id))
    .filter((s): s is ProductoWizard => Boolean(s));
  const completos = elegidos.length === saborIds.length;

  // Precio fijo por tamaño (solo display; el servidor recalcula): el más caro
  const precioCents =
    completos && elegidos.length >= 2
      ? Math.max(...elegidos.map((s) => aCents(varianteDe(s).precio)))
      : null;

  const cambiarTamano = (t: string) => {
    setTamano(t);
    setSaborIds(["", ""]);
  };

  const cambiarSabor = (indice: number, id: string) => {
    setSaborIds((actual) => actual.map((s, i) => (i === indice ? id : s)));
  };

  const agregar = () => {
    if (!completos || precioCents === null) return;
    onAgregar({ tamano, sabores: elegidos, precioCents });
    setAbierto(false);
    setTamano("");
    setSaborIds(["", ""]);
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="h-11">
          <Drumstick className="size-4" />
          Alitas combinadas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alitas combinadas (2-3 sabores)</DialogTitle>
          <DialogDescription>
            El precio de la orden es el mismo sin importar los sabores.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Orden</Label>
            <div className="flex gap-2">
              {tamanos.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={t === tamano ? "default" : "outline"}
                  className="h-11 flex-1 capitalize"
                  onClick={() => cambiarTamano(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          {saborIds.map((saborId, indice) => (
            <div key={indice} className="space-y-2">
              <Label>Sabor {indice + 1}</Label>
              <div className="flex gap-2">
                <Select
                  value={saborId}
                  onValueChange={(id) => cambiarSabor(indice, id)}
                  disabled={!tamano}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Elige el sabor" />
                  </SelectTrigger>
                  <SelectContent>
                    {disponibles
                      .filter(
                        (s) => s.id === saborId || !saborIds.includes(s.id)
                      )
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {indice === 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    aria-label="Quitar tercer sabor"
                    onClick={() => setSaborIds((actual) => actual.slice(0, 2))}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {saborIds.length < maxSabores ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={!tamano}
              onClick={() => setSaborIds((actual) => [...actual, ""])}
            >
              <Plus className="size-4" />
              Agregar tercer sabor
            </Button>
          ) : null}
          <Button
            className="h-11 w-full justify-between"
            disabled={precioCents === null}
            onClick={agregar}
          >
            Agregar al pedido
            {precioCents !== null ? (
              <span className="tabular-nums font-semibold">
                {formatoCents(precioCents)}
              </span>
            ) : null}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
