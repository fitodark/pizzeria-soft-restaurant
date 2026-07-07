import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { formatoFecha } from "@/lib/utils";
import { TablaInventario, type FilaInventario } from "./TablaInventario";

export default async function PaginaInventario() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "inventario.ver")) {
    redirect("/");
  }
  const puedeAjustar = tienePermiso(sesion.rol, "inventario.ajustar");

  const [sucursal, productos] = await Promise.all([
    db.sucursal.findUniqueOrThrow({
      where: { id: sesion.sucursalId },
      select: { nombre: true },
    }),
    db.producto.findMany({
      where: { inventariable: true, activo: true },
      include: {
        inventario: { where: { sucursalId: sesion.sucursalId } },
      },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    }),
  ]);

  const filas: FilaInventario[] = productos.map((p) => {
    const registro = p.inventario[0];
    return {
      productoId: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      existencia: registro?.existencia.toString() ?? "0",
      actualizado: registro ? formatoFecha(registro.updatedAt) : "—",
      puedeAjustar,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventario</h1>
        <p className="text-muted-foreground">
          Existencias de productos inventariables en {sucursal.nombre}. Las
          ventas los descuentan automáticamente al cobrar.
        </p>
      </div>
      <TablaInventario datos={filas} />
    </div>
  );
}
