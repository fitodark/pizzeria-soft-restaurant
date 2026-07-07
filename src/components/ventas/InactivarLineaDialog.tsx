"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { inactivarLinea } from "@/lib/acciones/ventas";
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
  detalleId: string;
  titulo: string;
};

/** Inactivar una línea exige PIN (regla no negociable 2). */
export function InactivarLineaDialog({ detalleId, titulo }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pin, setPin] = useState("");
  const [pendiente, startTransition] = useTransition();

  const inactivar = () => {
    startTransition(async () => {
      const resultado = await inactivarLinea({ detalleId, pin });
      if (resultado.ok) {
        toast.success("Línea inactivada.");
        setAbierto(false);
      } else {
        toast.error(resultado.error);
      }
      setPin("");
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 text-destructive"
          aria-label={`Inactivar ${titulo}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Inactivar línea</DialogTitle>
          <DialogDescription>
            “{titulo}” se quitará de la cuenta con auditoría de quién y cuándo.
            Confirma con tu PIN.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin-linea">PIN de seguridad</Label>
            <Input
              id="pin-linea"
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="h-11 text-center text-lg tracking-[0.5em]"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button
            variant="destructive"
            className="h-11 w-full"
            onClick={inactivar}
            disabled={pendiente || pin.length !== 4}
          >
            {pendiente ? "Inactivando…" : "Inactivar línea"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
