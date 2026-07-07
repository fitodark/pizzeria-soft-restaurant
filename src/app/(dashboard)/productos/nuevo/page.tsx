import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { FormularioProducto } from "@/components/forms/FormularioProducto";
import { Card, CardContent } from "@/components/ui/card";

export default async function PaginaProductoNuevo() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "productos.gestionar")) {
    redirect("/productos");
  }

  const categorias = await db.producto.findMany({
    distinct: ["categoria"],
    select: { categoria: true },
    orderBy: { categoria: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/productos"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Productos
        </Link>
        <h1 className="text-2xl font-semibold">Nuevo producto</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <FormularioProducto categorias={categorias.map((c) => c.categoria)} />
        </CardContent>
      </Card>
    </div>
  );
}
