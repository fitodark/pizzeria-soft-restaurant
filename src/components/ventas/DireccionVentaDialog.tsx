"use client";

import { useState, useTransition } from "react";
import { MapPinPlus } from "lucide-react";
import { toast } from "sonner";
import {
  agregarDireccionVenta,
  type ClienteVenta,
} from "@/lib/acciones/clientes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  cliente: ClienteVenta;
  onCreada: (direccion: ClienteVenta["direcciones"][number]) => void;
};

/** Alta rápida de dirección sin salir del wizard: un cliente puede tener
 *  n direcciones y el pedido puede ir a una nueva capturada aquí mismo. */
export function DireccionVentaDialog({ cliente, onCreada }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [pendiente, startTransition] = useTransition();

  const crear = () => {
    startTransition(async () => {
      const resultado = await agregarDireccionVenta(cliente.id, {
        direccion,
        referencia: referencia || undefined,
      });
      if (resultado.ok) {
        toast.success("Dirección registrada y seleccionada para el envío.");
        onCreada(resultado.direccion);
        setAbierto(false);
        setDireccion("");
        setReferencia("");
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          <MapPinPlus className="size-4" />
          Nueva dirección
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva dirección de {cliente.nombre}</DialogTitle>
          <DialogDescription>
            Se guarda en el cliente y queda seleccionada como destino del
            pedido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dv-direccion">Dirección</Label>
            <Input
              id="dv-direccion"
              className="h-11"
              autoFocus
              placeholder="Calle, número, colonia"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dv-referencia">Referencia (opcional)</Label>
            <Input
              id="dv-referencia"
              className="h-11"
              placeholder="Portón negro, entre calles…"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>
          <Button
            className="h-11 w-full"
            onClick={crear}
            disabled={pendiente || direccion.trim().length < 5}
          >
            {pendiente ? "Guardando…" : "Guardar y enviar aquí"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
