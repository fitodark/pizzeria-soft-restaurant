"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormularioDireccion } from "@/components/forms/FormularioDireccion";
import type { DatosDireccion } from "@/lib/esquemas/clientes";

type Props = {
  clienteId: string;
  /** Si viene, el diálogo edita esa dirección; si no, agrega una nueva. */
  direccion?: DatosDireccion & { id: string };
};

export function DialogoDireccion({ clienteId, direccion }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {direccion ? (
          <Button variant="ghost" size="icon" aria-label="Editar dirección">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" className="h-11">
            <Plus className="size-4" />
            Agregar dirección
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {direccion ? "Editar dirección" : "Nueva dirección"}
          </DialogTitle>
        </DialogHeader>
        <FormularioDireccion
          clienteId={clienteId}
          direccion={direccion}
          onExito={() => setAbierto(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
