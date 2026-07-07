"use client";

import { useState, useTransition } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { inactivarGasto } from "@/lib/acciones/cortes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  movimientoId: string;
  descripcion: string;
  monto: string;
};

export function InactivarGastoBoton({ movimientoId, descripcion, monto }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const confirmar = () => {
    startTransition(async () => {
      const resultado = await inactivarGasto(movimientoId);
      if (resultado.ok) {
        toast.success("Gasto inactivado; el monto regresó al corte.");
        setAbierto(false);
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Ban className="size-4" />
          Inactivar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Inactivar este gasto?</DialogTitle>
          <DialogDescription>
            “{descripcion}” por {monto}. No se borra: queda registrado quién y
            cuándo lo inactivó, y el monto regresa al corte.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={confirmar}
            disabled={pendiente}
          >
            {pendiente ? "Inactivando…" : "Inactivar gasto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
