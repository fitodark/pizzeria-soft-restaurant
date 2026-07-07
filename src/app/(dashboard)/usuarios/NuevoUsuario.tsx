"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormularioUsuario } from "@/components/forms/FormularioUsuario";

type Props = {
  sucursales: { id: string; nombre: string }[];
};

export function NuevoUsuario({ sucursales }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button className="h-11">
          <Plus className="size-4" />
          Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>
        <FormularioUsuario
          sucursales={sucursales}
          onExito={() => setAbierto(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
