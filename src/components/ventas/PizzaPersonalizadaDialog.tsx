"use client";

import { useMemo, useState } from "react";
import { Pizza } from "lucide-react";
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
  especialidades: ProductoWizard[];
  onAgregar: (datos: {
    tamano: string;
    mitad1: ProductoWizard;
    mitad2: ProductoWizard;
    precioCents: number;
  }) => void;
};

export function PizzaPersonalizadaDialog({ especialidades, onAgregar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [tamano, setTamano] = useState("");
  const [mitad1Id, setMitad1Id] = useState("");
  const [mitad2Id, setMitad2Id] = useState("");

  const tamanos = useMemo(
    () =>
      [...new Set(especialidades.flatMap((e) => e.variantes.map((v) => v.tamano)))],
    [especialidades]
  );

  const disponibles = tamano
    ? especialidades.filter((e) => e.variantes.some((v) => v.tamano === tamano))
    : [];
  const mitad1 = disponibles.find((e) => e.id === mitad1Id);
  const mitad2 = disponibles.find((e) => e.id === mitad2Id);

  // Regla 2 (solo display; el servidor recalcula): mitad más cara
  const precioCents =
    mitad1 && mitad2
      ? Math.max(
          aCents(mitad1.variantes.find((v) => v.tamano === tamano)!.precio),
          aCents(mitad2.variantes.find((v) => v.tamano === tamano)!.precio)
        )
      : null;

  const agregar = () => {
    if (!mitad1 || !mitad2 || precioCents === null) return;
    onAgregar({ tamano, mitad1, mitad2, precioCents });
    setAbierto(false);
    setTamano("");
    setMitad1Id("");
    setMitad2Id("");
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="h-11">
          <Pizza className="size-4" />
          Pizza personalizada
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pizza personalizada (2 mitades)</DialogTitle>
          <DialogDescription>
            Se cobra la mitad más cara en el tamaño elegido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tamaño</Label>
            <div className="grid grid-cols-4 gap-2">
              {tamanos.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={t === tamano ? "default" : "outline"}
                  className="h-11 px-2 capitalize"
                  onClick={() => {
                    setTamano(t);
                    setMitad1Id("");
                    setMitad2Id("");
                  }}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mitad 1</Label>
            <Select value={mitad1Id} onValueChange={setMitad1Id} disabled={!tamano}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Elige la especialidad" />
              </SelectTrigger>
              <SelectContent>
                {disponibles.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre} —{" "}
                    {formatoCents(
                      aCents(e.variantes.find((v) => v.tamano === tamano)!.precio)
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mitad 2</Label>
            <Select value={mitad2Id} onValueChange={setMitad2Id} disabled={!tamano}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Elige la especialidad" />
              </SelectTrigger>
              <SelectContent>
                {disponibles.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre} —{" "}
                    {formatoCents(
                      aCents(e.variantes.find((v) => v.tamano === tamano)!.precio)
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
