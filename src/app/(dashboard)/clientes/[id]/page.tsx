import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { FormularioCliente } from "@/components/forms/FormularioCliente";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DialogoDireccion } from "./DialogoDireccion";

export default async function PaginaClienteDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "clientes.ver")) {
    redirect("/");
  }

  const { id } = await params;
  const cliente = await db.cliente.findUnique({
    where: { id },
    include: { direcciones: { orderBy: { activa: "desc" } } },
  });
  if (!cliente) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clientes"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Clientes
        </Link>
        <h1 className="text-2xl font-semibold">{cliente.nombre}</h1>
        <p className="tabular-nums text-muted-foreground">{cliente.telefono}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos del cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <FormularioCliente
              cliente={{
                id: cliente.id,
                nombre: cliente.nombre,
                telefono: cliente.telefono,
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Direcciones</CardTitle>
            <DialogoDireccion clienteId={cliente.id} />
          </CardHeader>
          <CardContent>
            {cliente.direcciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin direcciones registradas.
              </p>
            ) : (
              <ul className="divide-y">
                {cliente.direcciones.map((direccion) => (
                  <li
                    key={direccion.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div className="flex gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className={direccion.activa ? "" : "text-muted-foreground line-through"}>
                          {direccion.direccion}
                        </p>
                        {direccion.referencia ? (
                          <p className="text-sm text-muted-foreground">
                            {direccion.referencia}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!direccion.activa ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactiva
                        </Badge>
                      ) : null}
                      <DialogoDireccion
                        clienteId={cliente.id}
                        direccion={{
                          id: direccion.id,
                          direccion: direccion.direccion,
                          referencia: direccion.referencia ?? "",
                          activa: direccion.activa,
                        }}
                      />
                    </div>
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
