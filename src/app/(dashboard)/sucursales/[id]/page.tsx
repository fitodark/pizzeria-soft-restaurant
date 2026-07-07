import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { ETIQUETA_ROL } from "@/components/layout/navegacion";
import { FormularioSucursal } from "@/components/forms/FormularioSucursal";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PaginaSucursalDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "sucursales.gestionar")) {
    redirect("/");
  }

  const { id } = await params;
  const sucursal = await db.sucursal.findUnique({
    where: { id },
    include: {
      usuarios: {
        include: { usuario: true },
        orderBy: { usuario: { nombre: "asc" } },
      },
    },
  });
  if (!sucursal) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sucursales"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Sucursales
        </Link>
        <h1 className="text-2xl font-semibold">{sucursal.nombre}</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la sucursal</CardTitle>
          </CardHeader>
          <CardContent>
            <FormularioSucursal
              sucursal={{
                id: sucursal.id,
                nombre: sucursal.nombre,
                calle: sucursal.calle,
                colonia: sucursal.colonia,
                ciudad: sucursal.ciudad,
                estado: sucursal.estado,
                codigoPostal: sucursal.codigoPostal,
                telefono: sucursal.telefono,
                activa: sucursal.activa,
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Usuarios asignados</CardTitle>
            <CardDescription>
              La asignación se gestiona desde cada usuario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sucursal.usuarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nadie está asignado a esta sucursal.
              </p>
            ) : (
              <ul className="divide-y">
                {sucursal.usuarios.map(({ usuario }) => (
                  <li
                    key={usuario.id}
                    className="flex items-center justify-between py-3"
                  >
                    <Link
                      href={`/usuarios/${usuario.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {usuario.nombre}
                    </Link>
                    <Badge variant="outline">{ETIQUETA_ROL[usuario.rol]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
