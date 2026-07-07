import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { productosParaPromo } from "@/lib/consultas/productos";
import { FormularioPromocion } from "@/components/forms/FormularioPromocion";
import { Card, CardContent } from "@/components/ui/card";

export default async function PaginaPromocionDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "promociones.gestionar")) {
    redirect("/promociones");
  }

  const { id } = await params;
  const [promocion, productos] = await Promise.all([
    db.promocion.findUnique({
      where: { id },
      include: { productos: true },
    }),
    productosParaPromo(),
  ]);
  if (!promocion) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/promociones"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Promociones
        </Link>
        <h1 className="text-2xl font-semibold">{promocion.nombre}</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <FormularioPromocion
            productos={productos}
            promocion={{
              id: promocion.id,
              nombre: promocion.nombre,
              descripcion: promocion.descripcion ?? "",
              tipo: promocion.tipo,
              precioEspecial: promocion.precioEspecial?.toString() ?? "",
              ventaDomicilio: promocion.ventaDomicilio,
              ventaEstablecimiento: promocion.ventaEstablecimiento,
              fechaInicio: promocion.fechaInicio?.toISOString().slice(0, 10) ?? "",
              fechaFin: promocion.fechaFin?.toISOString().slice(0, 10) ?? "",
              diasSemana: promocion.diasSemana,
              activa: promocion.activa,
              productos: promocion.productos.map((p) => ({
                rol: p.rol,
                productoId: p.productoId,
                varianteId: p.varianteId,
                cantidad: String(p.cantidad),
              })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
