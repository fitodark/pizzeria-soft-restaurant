import type { Metadata } from "next";
import { getPerfilAutenticado, sucursalesDisponibles } from "@/lib/auth";
import { cerrarSesion, seleccionarSucursal } from "@/lib/acciones/auth";
import { SeleccionAutomatica } from "@/components/auth/SeleccionAutomatica";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Seleccionar sucursal — Pizzería Barbosa",
};

export default async function PaginaSeleccionarSucursal() {
  const perfil = await getPerfilAutenticado();
  const sucursales = await sucursalesDisponibles(perfil);

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            Hola, {perfil.nombre.split(" ")[0]}
          </CardTitle>
          <CardDescription>
            ¿En qué sucursal laboras hoy?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sucursales.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Sin sucursal asignada, contacta al administrador.
            </p>
          ) : sucursales.length === 1 ? (
            <SeleccionAutomatica
              sucursalId={sucursales[0].id}
              nombre={sucursales[0].nombre}
            />
          ) : (
            <form action={seleccionarSucursal} className="space-y-2">
              {sucursales.map((sucursal) => (
                <Button
                  key={sucursal.id}
                  type="submit"
                  name="sucursalId"
                  value={sucursal.id}
                  variant="outline"
                  className="w-full h-12 justify-start text-base"
                >
                  <span className="font-medium">{sucursal.nombre}</span>
                  <span className="text-muted-foreground text-sm truncate">
                    {sucursal.colonia}, {sucursal.ciudad}
                  </span>
                </Button>
              ))}
            </form>
          )}
          <form action={cerrarSesion} className="text-center">
            <Button type="submit" variant="ghost" className="text-muted-foreground">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
