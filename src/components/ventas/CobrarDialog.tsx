"use client";

import { useState, useTransition } from "react";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { cobrarVenta } from "@/lib/acciones/ventas";
import { avisarFalloImpresion } from "@/components/ventas/reimpresion";
import { formatoMoneda } from "@/lib/utils";
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
import { MetodoPago } from "@/generated/prisma/enums";

type Props = {
  ventaId: string;
  total: string;
  metodoPago: MetodoPago;
};

export function CobrarDialog({ ventaId, total, metodoPago }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [pendiente, startTransition] = useTransition();

  const esEfectivo = metodoPago === MetodoPago.EFECTIVO;
  const totalNum = Number(total);
  const montoNum = Number(monto);
  const cambio =
    esEfectivo && monto && !Number.isNaN(montoNum) && montoNum >= totalNum
      ? montoNum - totalNum
      : null;

  const cobrar = () => {
    startTransition(async () => {
      const resultado = await cobrarVenta({
        ventaId,
        montoPagado: esEfectivo ? monto : undefined,
      });
      if (resultado.ok) {
        toast.success("Venta cobrada.");
        if (resultado.avisoImpresion) {
          avisarFalloImpresion(resultado.avisoImpresion, ventaId, "cobro");
        }
        setAbierto(false);
        setMonto("");
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button className="h-11">
          <HandCoins className="size-4" />
          Cobrar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cobrar venta</DialogTitle>
          <DialogDescription>
            {esEfectivo
              ? "Captura con cuánto paga el cliente."
              : "El pago por transferencia queda pendiente de validar."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-center">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="block text-3xl font-semibold tabular-nums">
              {formatoMoneda(total)}
            </span>
          </p>
          {esEfectivo ? (
            <div className="space-y-2">
              <Label htmlFor="monto-pagado">Paga con</Label>
              <Input
                id="monto-pagado"
                className="h-11 text-right tabular-nums"
                inputMode="decimal"
                placeholder="500.00"
                autoFocus
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
              {cambio !== null ? (
                <p className="text-right text-lg font-semibold tabular-nums text-success">
                  Cambio: {formatoMoneda(cambio.toFixed(2))}
                </p>
              ) : null}
            </div>
          ) : null}
          <Button
            className="h-11 w-full"
            onClick={cobrar}
            disabled={pendiente || (esEfectivo && cambio === null)}
          >
            {pendiente ? "Cobrando…" : "Confirmar cobro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
