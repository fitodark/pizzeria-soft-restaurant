"use client";

import { useTransition } from "react";
import { ChevronsUpDown, Store } from "lucide-react";
import { seleccionarSucursal } from "@/lib/acciones/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SucursalMin = { id: string; nombre: string };

type Props = {
  sucursalActiva: SucursalMin;
  /** Sucursales a las que se puede cambiar desde el header (solo admin). */
  sucursales: SucursalMin[];
};

export function SucursalBadge({ sucursalActiva, sucursales }: Props) {
  const [pendiente, startTransition] = useTransition();

  if (sucursales.length <= 1) {
    return (
      <Badge variant="outline" className="h-9 gap-2 px-3 text-sm font-medium">
        <Store className="size-4" />
        {sucursalActiva.nombre}
      </Badge>
    );
  }

  const cambiar = (sucursalId: string) => {
    if (sucursalId === sucursalActiva.id) return;
    const formData = new FormData();
    formData.set("sucursalId", sucursalId);
    startTransition(() => seleccionarSucursal(formData));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-2" disabled={pendiente}>
          <Store className="size-4" />
          <span className="max-w-40 truncate">{sucursalActiva.nombre}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Cambiar de sucursal</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sucursales.map((sucursal) => (
          <DropdownMenuItem
            key={sucursal.id}
            onSelect={() => cambiar(sucursal.id)}
            className="h-10"
          >
            {sucursal.nombre}
            {sucursal.id === sucursalActiva.id && (
              <span className="ml-auto text-xs text-muted-foreground">
                actual
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
