import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { corteAbierto } from "@/lib/consultas/cortes";
import { FormularioCompra } from "@/components/forms/FormularioCompra";
import { Card, CardContent } from "@/components/ui/card";

export default async function PaginaCompraNueva() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "compras.registrar")) {
    redirect("/");
  }

  const corte = await corteAbierto(sesion.sucursalId);

  const productos = await db.producto.findMany({
    where: { inventariable: true, activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/cortes"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Cortes de caja
        </Link>
        <h1 className="text-2xl font-semibold">Compra a proveedor</h1>
        <p className="text-muted-foreground">
          Nota de proveedor con partidas; el total sale del corte abierto.
        </p>
      </div>
      {!corte ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center pt-6">
            <p className="text-muted-foreground">
              Abra un corte de caja para registrar compras.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <FormularioCompra productos={productos} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
