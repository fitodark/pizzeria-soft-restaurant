import { db } from "@/lib/db";
import type { ProductoParaPromo } from "@/components/forms/FormularioPromocion";

/** Productos de venta activos con sus variantes, para armar promociones. */
export async function productosParaPromo(): Promise<ProductoParaPromo[]> {
  const productos = await db.producto.findMany({
    where: { activo: true, tipoArticulo: "VENTA" },
    include: {
      variantes: {
        where: { activa: true },
        select: { id: true, tamano: true },
        orderBy: { precio: "asc" },
      },
    },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });
  return productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    esEspecialidad: p.esEspecialidad,
    variantes: p.variantes,
  }));
}
