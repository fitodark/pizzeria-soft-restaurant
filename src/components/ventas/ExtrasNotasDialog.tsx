"use client";

import { useState } from "react";
import { Minus, Plus, SlidersHorizontal } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  aCents,
  formatoCents,
  type ExtraCarrito,
} from "@/components/ventas/carrito";
import type { ExtraWizard } from "@/lib/consultas/ventas";

type Props = {
  titulo: string;
  extrasDisponibles: ExtraWizard[];
  extras: ExtraCarrito[];
  notas: string;
  onGuardar: (extras: ExtraCarrito[], notas: string) => void;
};

export function ExtrasNotasDialog({
  titulo,
  extrasDisponibles,
  extras,
  notas,
  onGuardar,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState<ExtraCarrito[]>(extras);
  const [texto, setTexto] = useState(notas);

  const cantidadDe = (productoId: string) =>
    seleccion.find((e) => e.productoId === productoId)?.cantidad ?? 0;

  const cambiar = (extra: ExtraWizard, delta: number) => {
    setSeleccion((actual) => {
      const existente = actual.find((e) => e.productoId === extra.id);
      const cantidad = (existente?.cantidad ?? 0) + delta;
      if (cantidad <= 0) {
        return actual.filter((e) => e.productoId !== extra.id);
      }
      const nueva: ExtraCarrito = {
        productoId: extra.id,
        nombre: extra.nombre,
        cantidad,
        precioCents: aCents(extra.precio),
      };
      return existente
        ? actual.map((e) => (e.productoId === extra.id ? nueva : e))
        : [...actual, nueva];
    });
  };

  const guardar = () => {
    onGuardar(seleccion, texto.trim());
    setAbierto(false);
  };

  return (
    <Dialog
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o);
        if (o) {
          setSeleccion(extras);
          setTexto(notas);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="size-4" />
          Extras / notas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extras y notas</DialogTitle>
          <DialogDescription>{titulo}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {extrasDisponibles.length > 0 ? (
            <div className="space-y-2">
              <Label>Extras cobrables</Label>
              {/* El catálogo real trae 20+ extras: la lista scrollea para no
                  sacar del viewport las notas y el botón Guardar (1366×768) */}
              <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
                {extrasDisponibles.map((extra) => (
                <div
                  key={extra.id}
                  className="flex items-center justify-between rounded-lg border p-2 pl-3"
                >
                  <span className="text-sm">
                    {extra.nombre}{" "}
                    <span className="tabular-nums text-muted-foreground">
                      +{formatoCents(aCents(extra.precio))}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9"
                      onClick={() => cambiar(extra, -1)}
                      disabled={cantidadDe(extra.id) === 0}
                      aria-label={`Quitar ${extra.nombre}`}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-6 text-center tabular-nums">
                      {cantidadDe(extra.id)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9"
                      onClick={() => cambiar(extra, 1)}
                      aria-label={`Agregar ${extra.nombre}`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="notas-linea">
              Notas (quitar ingredientes no descuenta)
            </Label>
            <Textarea
              id="notas-linea"
              placeholder="Sin lechuga, sin cebolla…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <Button className="h-11 w-full" onClick={guardar}>
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
