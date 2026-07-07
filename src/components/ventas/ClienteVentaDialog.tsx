"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { crearClienteVenta, type ClienteVenta } from "@/lib/acciones/clientes";
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
  telefonoInicial: string;
  onCreado: (cliente: ClienteVenta) => void;
};

/** Alta rápida de cliente + dirección sin salir del wizard (10c). */
export function ClienteVentaDialog({ telefonoInicial, onCreado }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [pendiente, startTransition] = useTransition();

  const abrir = (estado: boolean) => {
    if (estado) setTelefono(telefonoInicial);
    setAbierto(estado);
  };

  const crear = () => {
    startTransition(async () => {
      const resultado = await crearClienteVenta({
        nombre,
        telefono,
        direccion,
        referencia: referencia || undefined,
      });
      if (resultado.ok && resultado.cliente) {
        toast.success("Cliente registrado.");
        onCreado(resultado.cliente);
        setAbierto(false);
        setNombre("");
        setDireccion("");
        setReferencia("");
      } else if (!resultado.ok) {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={abrir}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          <UserPlus className="size-4" />
          Nuevo cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar cliente</DialogTitle>
          <DialogDescription>
            Alta rápida con su primera dirección de entrega.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cv-nombre">Nombre</Label>
            <Input
              id="cv-nombre"
              className="h-11"
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cv-telefono">Teléfono</Label>
            <Input
              id="cv-telefono"
              className="h-11"
              inputMode="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cv-direccion">Dirección</Label>
            <Input
              id="cv-direccion"
              className="h-11"
              placeholder="Calle, número, colonia"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cv-referencia">Referencia (opcional)</Label>
            <Input
              id="cv-referencia"
              className="h-11"
              placeholder="Portón negro, entre calles…"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>
          <Button
            className="h-11 w-full"
            onClick={crear}
            disabled={pendiente || !nombre.trim() || !direccion.trim()}
          >
            {pendiente ? "Registrando…" : "Registrar y usar en la venta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
