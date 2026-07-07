"use client";

import { useTransition } from "react";
import { LogOut, PanelLeft } from "lucide-react";
import { cerrarSesion } from "@/lib/acciones/auth";
import { ETIQUETA_ROL } from "@/components/layout/navegacion";
import { SucursalBadge } from "@/components/layout/SucursalBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Rol } from "@/generated/prisma/enums";

type SucursalMin = { id: string; nombre: string };

type Props = {
  usuario: { nombre: string; rol: Rol };
  sucursalActiva: SucursalMin;
  sucursales: SucursalMin[];
  onAlternarSidebar: () => void;
};

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Header({
  usuario,
  sucursalActiva,
  sucursales,
  onAlternarSidebar,
}: Props) {
  const [, startTransition] = useTransition();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex"
        onClick={onAlternarSidebar}
        aria-label="Alternar menú lateral"
      >
        <PanelLeft className="size-5" />
      </Button>
      <SucursalBadge sucursalActiva={sucursalActiva} sucursales={sucursales} />
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {iniciales(usuario.nombre)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight">
                  {usuario.nombre}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {ETIQUETA_ROL[usuario.rol]}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              {usuario.nombre}
              <p className="text-xs font-normal text-muted-foreground">
                {ETIQUETA_ROL[usuario.rol]}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="h-10"
              onSelect={() => startTransition(() => cerrarSesion())}
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
