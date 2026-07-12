"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { cancelarVenta } from "@/lib/acciones/ventas";
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
import { Textarea } from "@/components/ui/textarea";

type Props = {
  ventaId: string;
  folio: number;
};

/** Cancela una venta PENDIENTE (pedido no aceptado): motivo obligatorio +
 *  PIN. La pérdida queda como egreso del corte que absorbe la sucursal. */
export function CancelarVentaDialog({ ventaId, folio }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pin, setPin] = useState("");
  const [pendiente, startTransition] = useTransition();

  const puedeCancelar = motivo.trim().length >= 5 && pin.length === 4;

  const cancelar = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendiente || !puedeCancelar) return;
    startTransition(async () => {
      const resultado = await cancelarVenta({ ventaId, motivo, pin });
      if (resultado.ok) {
        toast.success(`Venta #${folio} cancelada.`);
        setAbierto(false);
        router.push("/ventas");
      } else {
        toast.error(resultado.error);
      }
      setPin("");
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 text-destructive">
          <Ban className="size-4" />
          Cancelar venta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancelar venta #{folio}</DialogTitle>
          <DialogDescription>
            El pedido no se cobrará: la pérdida queda registrada como egreso
            que absorbe la sucursal. Indica el motivo y confirma con tu PIN.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={cancelar}>
          <div className="space-y-2">
            <Label htmlFor="motivo-cancelacion">Motivo de la cancelación</Label>
            <Textarea
              id="motivo-cancelacion"
              rows={3}
              maxLength={300}
              placeholder="Cliente no aceptó el pedido por demora en la entrega"
              autoFocus
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin-cancelacion">PIN de seguridad</Label>
            <Input
              id="pin-cancelacion"
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="h-11 text-center text-lg tracking-[0.5em]"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button
            type="submit"
            variant="destructive"
            className="h-11 w-full"
            disabled={pendiente || !puedeCancelar}
          >
            {pendiente ? "Cancelando…" : "Cancelar venta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
