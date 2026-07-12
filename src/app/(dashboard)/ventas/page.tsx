import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { normalizarCodigo } from "@/lib/codigos";
import { formatoFecha, formatoMoneda } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstatusVenta } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const ESTATUS: Record<string, { texto: string; clase: string }> = {
  PENDIENTE: { texto: "Pendiente", clase: "text-secondary border-secondary/40" },
  COBRADA: { texto: "Cobrada", clase: "text-success border-success/40" },
  CANCELADA: { texto: "Cancelada", clase: "text-muted-foreground" },
};

type VentaFila = Prisma.VentaGetPayload<{
  include: { cliente: { select: { nombre: true } } };
}>;

function TablaVentas({ ventas, vacio }: { ventas: VentaFila[]; vacio: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Folio</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Estatus</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ventas.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                {vacio}
              </TableCell>
            </TableRow>
          ) : (
            ventas.map((venta) => (
              <TableRow key={venta.id} className="relative">
                <TableCell className="font-semibold tabular-nums">
                  <Link
                    href={`/ventas/${venta.id}`}
                    className="after:absolute after:inset-0"
                  >
                    #{venta.folio}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatoFecha(venta.createdAt)}
                </TableCell>
                <TableCell>
                  {venta.canal === "DOMICILIO" ? "Domicilio" : "Establecimiento"}
                </TableCell>
                <TableCell>
                  {venta.canal === "DOMICILIO"
                    ? venta.cliente?.nombre ?? "—"
                    : venta.mesa
                      ? `Mesa ${venta.mesa}`
                      : "—"}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatoMoneda(venta.total.toString())}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={ESTATUS[venta.estatus].clase}>
                    {ESTATUS[venta.estatus].texto}
                    {venta.metodoPago === "TRANSFERENCIA" &&
                    venta.estatus === "COBRADA" &&
                    !venta.transferenciaValidada
                      ? " · por validar"
                      : ""}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

type Props = { searchParams: Promise<{ buscar?: string }> };

export default async function PaginaVentas({ searchParams }: Props) {
  const { buscar } = await searchParams;
  const sesion = await getSesion();
  if (
    !tienePermiso(sesion.rol, "ventas.ver") &&
    !tienePermiso(sesion.rol, "ventas.verAsignadas")
  ) {
    redirect("/");
  }
  const puedeCrear = tienePermiso(sesion.rol, "ventas.crear");

  // El repartidor solo ve sus ventas a domicilio asignadas
  const soloAsignadas = !tienePermiso(sesion.rol, "ventas.ver");
  const filtroBase = {
    sucursalId: sesion.sucursalId,
    ...(soloAsignadas ? { repartidorId: sesion.usuario.id } : {}),
  };

  // Aclaraciones: el cliente dicta su código (7QK-4FM) o el folio del ticket
  const termino = normalizarCodigo(buscar ?? "");
  const resultado = termino
    ? await db.venta.findMany({
        where: {
          ...filtroBase,
          OR: [
            { codigo: termino },
            ...(/^\d+$/.test(termino) ? [{ folio: Number(termino) }] : []),
          ],
        },
        include: { cliente: { select: { nombre: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : null;

  const [pendientes, historial] = await Promise.all([
    db.venta.findMany({
      where: { ...filtroBase, estatus: EstatusVenta.PENDIENTE },
      include: { cliente: { select: { nombre: true } } },
      // QA: la más reciente primero, igual que el historial
      orderBy: { createdAt: "desc" },
    }),
    db.venta.findMany({
      where: { ...filtroBase, estatus: { not: EstatusVenta.PENDIENTE } },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ventas</h1>
          <p className="text-muted-foreground">
            Pendientes por cobrar e historial de la sucursal.
          </p>
        </div>
        {puedeCrear ? (
          <Button asChild className="h-11">
            <Link href="/ventas/nueva">
              <Plus className="size-4" />
              Nueva venta
            </Link>
          </Button>
        ) : null}
      </div>

      <form action="/ventas" className="flex max-w-md gap-2">
        <Input
          name="buscar"
          className="h-11"
          placeholder="Código de aclaración o folio (7QK-4FM, 16…)"
          defaultValue={buscar ?? ""}
          autoComplete="off"
        />
        <Button type="submit" variant="outline" className="h-11">
          <Search className="size-4" />
          Buscar
        </Button>
      </form>

      {resultado ? (
        <section className="space-y-2">
          <h2 className="font-semibold">
            Resultado de la búsqueda{" "}
            <span className="text-muted-foreground tabular-nums">
              ({resultado.length})
            </span>{" "}
            <Link href="/ventas" className="text-sm font-normal text-primary hover:underline">
              Limpiar
            </Link>
          </h2>
          <TablaVentas
            ventas={resultado}
            vacio="Ninguna venta coincide con ese código o folio."
          />
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-semibold">
          Pendientes{" "}
          <span className="text-muted-foreground tabular-nums">
            ({pendientes.length})
          </span>
        </h2>
        <TablaVentas ventas={pendientes} vacio="No hay ventas pendientes." />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Historial</h2>
        <TablaVentas ventas={historial} vacio="Sin ventas cobradas todavía." />
      </section>
    </div>
  );
}
