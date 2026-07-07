"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { asignarRepartidor } from "@/lib/acciones/ventas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  ventaId: string;
  repartidorId: string | null;
  repartidores: { id: string; nombre: string }[];
};

export function AsignarRepartidorForm({
  ventaId,
  repartidorId,
  repartidores,
}: Props) {
  const [seleccion, setSeleccion] = useState(repartidorId ?? "");
  const [pendiente, startTransition] = useTransition();

  const asignar = () => {
    startTransition(async () => {
      const resultado = await asignarRepartidor({
        ventaId,
        repartidorId: seleccion,
      });
      if (resultado.ok) {
        toast.success("Repartidor asignado.");
      } else {
        toast.error(resultado.error);
      }
    });
  };

  if (repartidores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay repartidores asignados a esta sucursal.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-56 space-y-2">
        <Label>Repartidor</Label>
        <Select value={seleccion} onValueChange={setSeleccion}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="Selecciona al repartidor" />
          </SelectTrigger>
          <SelectContent>
            {repartidores.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="outline"
        className="h-11"
        onClick={asignar}
        disabled={pendiente || !seleccion || seleccion === repartidorId}
      >
        {pendiente ? "Asignando…" : "Asignar"}
      </Button>
    </div>
  );
}
