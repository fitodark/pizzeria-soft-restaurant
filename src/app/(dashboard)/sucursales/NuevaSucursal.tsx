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
import { FormularioSucursal } from "@/components/forms/FormularioSucursal";

export function NuevaSucursal() {
  const [abierto, setAbierto] = useState(false);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button className="h-11">
          <Plus className="size-4" />
          Nueva sucursal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva sucursal</DialogTitle>
        </DialogHeader>
        <FormularioSucursal onExito={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
