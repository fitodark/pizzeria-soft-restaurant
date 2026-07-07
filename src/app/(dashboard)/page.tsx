import Link from "next/link";
import { endOfDay, startOfDay } from "date-fns";
import { ArrowRight, LockOpen, Plus } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { corteAbierto, totalesCorte } from "@/lib/consultas/cortes";
import { formatoFecha, formatoMoneda } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  EstatusVenta,
  OrigenMovimiento,
  TipoMovimiento,
} from "@/generated/prisma/enums";

export default async function PaginaResumen() {
  const sesion = await getSesion();
  const veCortes = tienePermiso(sesion.rol, "cortes.ver");
  const veVentas = tienePermiso(sesion.rol, "ventas.ver");
  const puedeCrear = tienePermiso(sesion.rol, "ventas.crear");
  const soloAsignadas =
    !veVentas && tienePermiso(sesion.rol, "ventas.verAsignadas");
  const hoy = new Date();

  const [corte, pendientes, ventasDia] = await Promise.all([
    // El mesero también lo necesita: sin corte no hay ventas nuevas
    veCortes || puedeCrear ? corteAbierto(sesion.sucursalId) : null,
    veVentas || soloAsignadas
      ? db.venta.findMany({
          where: {
            sucursalId: sesion.sucursalId,
            estatus: EstatusVenta.PENDIENTE,
            ...(soloAsignadas ? { repartidorId: sesion.usuario.id } : {}),
          },
          select: { total: true },
        })
      : null,
    veCortes
      ? db.movimientoCorte.aggregate({
          where: {
            activo: true,
            tipo: TipoMovimiento.INGRESO,
            origen: OrigenMovimiento.VENTA,
            createdAt: { gte: startOfDay(hoy), lte: endOfDay(hoy) },
            corte: { sucursalId: sesion.sucursalId },
          },
          _sum: { monto: true },
          _count: true,
        })
      : null,
  ]);
  const totales = corte ? await totalesCorte(corte.id) : null;
  const enCaja = corte && totales
    ? corte.saldoInicial.plus(totales.ingresos).minus(totales.egresos)
    : null;
  const montoPendiente =
    pendientes?.reduce((suma, v) => suma + Number(v.total), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Resumen del día</h1>
        <p className="text-muted-foreground">
          Hola, {sesion.usuario.nombre.split(" ")[0]}. {formatoFecha(hoy)}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {veCortes ? (
          <Card>
            <CardHeader>
              <CardDescription>Corte de caja</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {corte && enCaja ? formatoMoneda(enCaja.toString()) : "Sin abrir"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {corte ? (
                <>
                  <p>
                    Abierto {formatoFecha(corte.fechaApertura)} con{" "}
                    {formatoMoneda(corte.saldoInicial.toString())} iniciales.
                  </p>
                  <Button asChild variant="outline" className="h-11">
                    <Link href="/cortes">
                      Ver corte
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <p>No hay corte abierto: las ventas están bloqueadas.</p>
                  {tienePermiso(sesion.rol, "cortes.abrir") ? (
                    <Button asChild className="h-11">
                      <Link href="/cortes">
                        <LockOpen className="size-4" />
                        Abrir corte
                      </Link>
                    </Button>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        ) : null}

        {pendientes ? (
          <Card>
            <CardHeader>
              <CardDescription>
                {soloAsignadas ? "Mis entregas pendientes" : "Ventas pendientes"}
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {pendientes.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {pendientes.length === 0
                  ? soloAsignadas
                    ? "Sin entregas asignadas por ahora."
                    : puedeCrear && !corte
                      ? "Abre el corte de caja para empezar a vender."
                      : "Todo cobrado por ahora."
                  : `${formatoMoneda(montoPendiente.toFixed(2))} por cobrar.`}
              </p>
              <div className="flex flex-wrap gap-2">
                {pendientes.length > 0 || soloAsignadas ? (
                  <Button asChild variant="outline" className="h-11">
                    <Link href="/ventas">
                      Ver ventas
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ) : null}
                {puedeCrear && corte ? (
                  <Button asChild className="h-11">
                    <Link href="/ventas/nueva">
                      <Plus className="size-4" />
                      Nueva venta
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {ventasDia ? (
          <Card>
            <CardHeader>
              <CardDescription>Cobrado hoy</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatoMoneda((ventasDia._sum.monto ?? 0).toString())}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {ventasDia._count} venta{ventasDia._count === 1 ? "" : "s"}{" "}
                cobrada{ventasDia._count === 1 ? "" : "s"} en la sucursal.
              </p>
              {tienePermiso(sesion.rol, "reportes.ver") ? (
                <Button asChild variant="outline" className="h-11">
                  <Link href="/reportes">
                    Ver reportes
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
