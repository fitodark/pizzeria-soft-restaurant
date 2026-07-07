import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { formatoMoneda } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TablaProductos, type FilaProducto } from "./TablaProductos";

export default async function PaginaProductos() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "productos.ver")) {
    redirect("/");
  }
  const puedeGestionar = tienePermiso(sesion.rol, "productos.gestionar");

  const productos = await db.producto.findMany({
    include: { variantes: { orderBy: { precio: "asc" } } },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });

  const filas: FilaProducto[] = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    tipo: p.tipo,
    tipoArticulo: p.tipoArticulo,
    precios: p.variantes
      .filter((v) => v.activa)
      .map((v) =>
        v.tamano === "unico"
          ? formatoMoneda(v.precio.toString())
          : `${v.tamano} ${formatoMoneda(v.precio.toString())}`
      )
      .join(" · "),
    esEspecialidad: p.esEspecialidad,
    inventariable: p.inventariable,
    ventaDomicilio: p.ventaDomicilio,
    ventaEstablecimiento: p.ventaEstablecimiento,
    activo: p.activo,
    puedeGestionar,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-muted-foreground">
            Catálogo con variantes, extras y banderas de canal.
          </p>
        </div>
        {puedeGestionar ? (
          <Button asChild className="h-11">
            <Link href="/productos/nuevo">
              <Plus className="size-4" />
              Nuevo producto
            </Link>
          </Button>
        ) : null}
      </div>
      <TablaProductos datos={filas} />
    </div>
  );
}
