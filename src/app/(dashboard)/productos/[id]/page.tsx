import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { FormularioProducto } from "@/components/forms/FormularioProducto";
import { Card, CardContent } from "@/components/ui/card";

export default async function PaginaProductoDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "productos.gestionar")) {
    redirect("/productos");
  }

  const { id } = await params;
  const [producto, categorias] = await Promise.all([
    db.producto.findUnique({
      where: { id },
      include: { variantes: { orderBy: [{ activa: "desc" }, { precio: "asc" }] } },
    }),
    db.producto.findMany({
      distinct: ["categoria"],
      select: { categoria: true },
      orderBy: { categoria: "asc" },
    }),
  ]);
  if (!producto) {
    notFound();
  }

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
        <h1 className="text-2xl font-semibold">{producto.nombre}</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <FormularioProducto
            categorias={categorias.map((c) => c.categoria)}
            producto={{
              id: producto.id,
              nombre: producto.nombre,
              descripcion: producto.descripcion ?? "",
              tipo: producto.tipo,
              tipoArticulo: producto.tipoArticulo,
              categoria: producto.categoria,
              ventaDomicilio: producto.ventaDomicilio,
              ventaEstablecimiento: producto.ventaEstablecimiento,
              inventariable: producto.inventariable,
              esEspecialidad: producto.esEspecialidad,
              permiteExtrasNotas: producto.permiteExtrasNotas,
              activo: producto.activo,
              variantes: producto.variantes.map((v) => ({
                id: v.id,
                tamano: v.tamano,
                precio: v.precio.toString(),
                maxSabores: v.maxSabores,
                activa: v.activa,
              })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
