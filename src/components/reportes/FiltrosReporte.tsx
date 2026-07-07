"use client";

import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Rango } from "@/lib/consultas/reportes";

const RANGOS: { valor: Rango; etiqueta: string }[] = [
  { valor: "dia", etiqueta: "Día" },
  { valor: "semana", etiqueta: "Semana" },
  { valor: "mes", etiqueta: "Mes" },
];

type Props = {
  rango: Rango;
  /** null = todas (solo admin ve el selector). */
  sucursalId: string | null;
  sucursales: { id: string; nombre: string }[] | null;
};

export function FiltrosReporte({ rango, sucursalId, sucursales }: Props) {
  const router = useRouter();

  const navegar = (nuevoRango: Rango, nuevaSucursal: string | null) => {
    const params = new URLSearchParams({ rango: nuevoRango });
    if (nuevaSucursal) params.set("sucursal", nuevaSucursal);
    router.push(`/reportes?${params.toString()}`);
  };

  const parametrosExport = new URLSearchParams({ rango });
  if (sucursalId) parametrosExport.set("sucursal", sucursalId);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border bg-card p-1">
        {RANGOS.map(({ valor, etiqueta }) => (
          <Button
            key={valor}
            variant={rango === valor ? "default" : "ghost"}
            className="h-9"
            onClick={() => navegar(valor, sucursalId)}
          >
            {etiqueta}
          </Button>
        ))}
      </div>
      {sucursales ? (
        <Select
          value={sucursalId ?? "__todas__"}
          onValueChange={(v) => navegar(rango, v === "__todas__" ? null : v)}
        >
          <SelectTrigger className="h-11 w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas__">Todas las sucursales</SelectItem>
            {sucursales.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Button asChild variant="outline" className="h-11 ml-auto">
        <a href={`/api/reportes/export?${parametrosExport.toString()}`}>
          <Download className="size-4" />
          Exportar CSV
        </a>
      </Button>
    </div>
  );
}
