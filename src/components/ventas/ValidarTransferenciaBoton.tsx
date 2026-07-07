"use client";

import { useTransition } from "react";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { validarTransferencia } from "@/lib/acciones/ventas";
import { Button } from "@/components/ui/button";

export function ValidarTransferenciaBoton({ ventaId }: { ventaId: string }) {
  const [pendiente, startTransition] = useTransition();

  const validar = () => {
    startTransition(async () => {
      const resultado = await validarTransferencia({ ventaId });
      if (resultado.ok) {
        toast.success("Transferencia validada.");
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Button
      variant="outline"
      className="h-11"
      onClick={validar}
      disabled={pendiente}
    >
      <BadgeCheck className="size-4 text-success" />
      {pendiente ? "Validando…" : "Validar transferencia"}
    </Button>
  );
}
