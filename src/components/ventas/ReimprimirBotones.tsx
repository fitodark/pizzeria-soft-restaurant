"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  solicitarReimpresion,
  type TipoImpresion,
} from "@/components/ventas/reimpresion";

type Props = {
  ventaId: string;
  /** COBRADA reimprime el ticket de cobro; PENDIENTE imprime la cuenta. */
  cobrada: boolean;
};

export function ReimprimirBotones({ ventaId, cobrada }: Props) {
  const [enviando, setEnviando] = useState<TipoImpresion | null>(null);

  const imprimir = async (tipo: TipoImpresion) => {
    setEnviando(tipo);
    await solicitarReimpresion(ventaId, tipo);
    setEnviando(null);
  };

  return (
    <>
      <Button
        variant="outline"
        className="h-11"
        onClick={() => imprimir("comandas")}
        disabled={enviando !== null}
      >
        <Printer className="size-4" />
        {enviando === "comandas" ? "Imprimiendo…" : "Reimprimir comandas"}
      </Button>
      <Button
        variant="outline"
        className="h-11"
        onClick={() => imprimir(cobrada ? "cobro" : "cuenta")}
        disabled={enviando !== null}
      >
        <Printer className="size-4" />
        {enviando && enviando !== "comandas"
          ? "Imprimiendo…"
          : cobrada
            ? "Reimprimir cobro"
            : "Imprimir cuenta"}
      </Button>
    </>
  );
}
