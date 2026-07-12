import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { catalogoWizard, ventaConDetalles } from "@/lib/consultas/ventas";
import { aCents } from "@/components/ventas/carrito";
import { Button } from "@/components/ui/button";
import { WizardVenta } from "@/components/ventas/WizardVenta";
import type { LineaPrevia } from "@/components/ventas/RondasPrevias";

type Props = { params: Promise<{ id: string }> };

/** Segunda ronda de una mesa (o rectificación de un domicilio): el wizard
 *  arranca en Bebidas y confirma contra la venta existente. */
export default async function PaginaAgregarProductos({ params }: Props) {
  const { id } = await params;
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "ventas.agregarLineas")) {
    redirect(`/ventas/${id}`);
  }

  const venta = await ventaConDetalles(id, sesion.sucursalId, false);
  if (!venta) {
    notFound();
  }
  if (venta.estatus !== "PENDIENTE") {
    redirect(`/ventas/${id}`);
  }

  const catalogo = await catalogoWizard(new Date());

  const lineasPrevias: LineaPrevia[] = venta.lineas.map((l) => ({
    id: l.id,
    ronda: l.ronda,
    titulo: l.titulo,
    subtitulo: l.subtitulo,
    cantidad: l.cantidad,
    importeCents: aCents(l.precioUnitario) * l.cantidad,
    notas: l.notas,
    extras: l.extras.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      cantidad: e.cantidad,
      importeCents: aCents(e.precioUnitario) * e.cantidad,
    })),
  }));

  const esEstablecimiento = venta.canal === "ESTABLECIMIENTO";
  // Solo display: el servidor recalcula la ronda real al confirmar
  const ronda = esEstablecimiento
    ? Math.max(1, ...venta.lineas.map((l) => l.ronda)) + 1
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-11">
          <Link href={`/ventas/${venta.id}`} aria-label="Volver a la venta">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            Agregar productos · Venta #{venta.folio}
          </h1>
          <p className="text-muted-foreground">
            {esEstablecimiento
              ? venta.mesa
                ? `Mesa ${venta.mesa}`
                : "Mostrador"
              : venta.cliente
                ? `${venta.cliente.nombre} · ${venta.cliente.telefono}`
                : "Domicilio"}
          </p>
        </div>
      </div>

      <WizardVenta
        catalogo={catalogo}
        modoAgregar={{
          ventaId: venta.id,
          folio: venta.folio,
          canal: venta.canal,
          mesa: venta.mesa,
          cliente: venta.cliente?.nombre ?? null,
          ronda,
          lineasPrevias,
          totalPrevioCents: aCents(venta.total),
        }}
      />
    </div>
  );
}
