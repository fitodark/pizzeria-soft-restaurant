import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import {
  repartidoresDeSucursal,
  ventaConDetalles,
} from "@/lib/consultas/ventas";
import { formatoCodigo, formatoFecha, formatoMoneda } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AsignarRepartidorForm } from "@/components/ventas/AsignarRepartidorForm";
import { CancelarVentaDialog } from "@/components/ventas/CancelarVentaDialog";
import { CobrarDialog } from "@/components/ventas/CobrarDialog";
import { ListaLineasVenta } from "@/components/ventas/ListaLineasVenta";
import { ReimprimirBotones } from "@/components/ventas/ReimprimirBotones";
import { ValidarTransferenciaBoton } from "@/components/ventas/ValidarTransferenciaBoton";

const ESTATUS: Record<string, { texto: string; clase: string }> = {
  PENDIENTE: { texto: "Pendiente", clase: "text-secondary border-secondary/40" },
  COBRADA: { texto: "Cobrada", clase: "text-success border-success/40" },
  CANCELADA: { texto: "Cancelada", clase: "text-muted-foreground" },
};

type Props = { params: Promise<{ id: string }> };

export default async function PaginaDetalleVenta({ params }: Props) {
  const { id } = await params;
  const sesion = await getSesion();

  const puedeVerTodas = tienePermiso(sesion.rol, "ventas.ver");
  if (!puedeVerTodas && !tienePermiso(sesion.rol, "ventas.verAsignadas")) {
    redirect("/");
  }

  const verInactivos = tienePermiso(sesion.rol, "auditoria.verInactivos");
  const venta = await ventaConDetalles(id, sesion.sucursalId, verInactivos);
  if (!venta) {
    notFound();
  }
  // Repartidor: solo sus ventas asignadas
  if (!puedeVerTodas && venta.repartidorId !== sesion.usuario.id) {
    redirect("/ventas");
  }

  const pendiente = venta.estatus === "PENDIENTE";
  const puedeAgregar = pendiente && tienePermiso(sesion.rol, "ventas.agregarLineas");
  const puedeCobrar = pendiente && tienePermiso(sesion.rol, "ventas.cobrar");
  const puedeCancelar = pendiente && tienePermiso(sesion.rol, "ventas.cancelar");
  const puedeInactivar =
    pendiente && tienePermiso(sesion.rol, "ventas.inactivarLinea");
  const puedeAsignar =
    venta.canal === "DOMICILIO" &&
    venta.estatus !== "CANCELADA" &&
    tienePermiso(sesion.rol, "ventas.asignarRepartidor");
  const puedeValidar =
    venta.metodoPago === "TRANSFERENCIA" &&
    venta.estatus === "COBRADA" &&
    !venta.transferenciaValidada &&
    tienePermiso(sesion.rol, "ventas.validarTransferencia");

  const repartidores = puedeAsignar
    ? await repartidoresDeSucursal(sesion.sucursalId)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="size-11">
            <Link href="/ventas" aria-label="Volver a ventas">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-semibold">
              Venta #{venta.folio}
              <Badge variant="outline" className={ESTATUS[venta.estatus].clase}>
                {ESTATUS[venta.estatus].texto}
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              {venta.canal === "DOMICILIO" ? "Domicilio" : "Establecimiento"} ·{" "}
              {formatoFecha(venta.createdAt)} · Capturó {venta.capturadaPor}
              {venta.codigo
                ? ` · Código ${formatoCodigo(venta.codigo)}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeAgregar ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={`/ventas/${venta.id}/agregar`}>
                <Plus className="size-4" />
                Agregar productos
              </Link>
            </Button>
          ) : null}
          {puedeCobrar ? (
            <CobrarDialog
              ventaId={venta.id}
              total={venta.total}
              metodoPago={venta.metodoPago}
            />
          ) : null}
          {puedeCancelar ? (
            <CancelarVentaDialog ventaId={venta.id} folio={venta.folio} />
          ) : null}
          {puedeValidar ? <ValidarTransferenciaBoton ventaId={venta.id} /> : null}
          {tienePermiso(sesion.rol, "impresion.reimprimir") ? (
            <ReimprimirBotones
              ventaId={venta.id}
              cobrada={venta.estatus === "COBRADA"}
            />
          ) : null}
        </div>
      </div>

      {venta.estatus === "CANCELADA" && venta.motivoCancelacion ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">
            Venta cancelada — la pérdida la absorbe la sucursal
          </p>
          <p className="text-sm">Motivo: {venta.motivoCancelacion}</p>
          <p className="text-sm text-muted-foreground">
            Canceló {venta.canceladaPor ?? "?"}
            {venta.canceladaAt ? ` · ${formatoFecha(venta.canceladaAt)}` : ""}
          </p>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {venta.canal === "DOMICILIO" ? "Cliente" : "Mesa"}
            </p>
            <p className="font-medium">
              {venta.canal === "DOMICILIO"
                ? venta.cliente
                  ? `${venta.cliente.nombre} · ${venta.cliente.telefono}`
                  : "—"
                : venta.mesa || "Mostrador"}
            </p>
            {venta.direccion ? (
              <p className="text-sm text-muted-foreground">{venta.direccion}</p>
            ) : null}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Método de pago</p>
            <p className="font-medium">
              {venta.metodoPago === "EFECTIVO" ? "Efectivo" : "Transferencia"}
              {venta.metodoPago === "TRANSFERENCIA" ? (
                <Badge
                  variant="outline"
                  className={
                    venta.transferenciaValidada
                      ? "ml-2 text-success border-success/40"
                      : "ml-2 text-secondary border-secondary/40"
                  }
                >
                  {venta.transferenciaValidada ? "Validada" : "Por validar"}
                </Badge>
              ) : null}
            </p>
            {venta.pagaCon ? (
              <p className="text-sm text-muted-foreground">
                Paga con {formatoMoneda(venta.pagaCon)}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cobro</p>
            {venta.estatus === "COBRADA" && venta.montoPagado ? (
              <p className="font-medium tabular-nums">
                Pagó {formatoMoneda(venta.montoPagado)} · Cambio{" "}
                {formatoMoneda(venta.cambio ?? "0")}
                {venta.cobradaAt ? (
                  <span className="block text-sm font-normal text-muted-foreground">
                    {formatoFecha(venta.cobradaAt)}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="font-medium">Sin cobrar</p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-3xl font-semibold tabular-nums">
              {formatoMoneda(venta.total)}
            </p>
          </div>
        </CardContent>
      </Card>

      {puedeAsignar ? (
        <Card>
          <CardContent>
            <AsignarRepartidorForm
              ventaId={venta.id}
              repartidorId={venta.repartidorId}
              repartidores={repartidores}
            />
            {venta.repartidorNombre ? (
              <p className="pt-2 text-sm text-muted-foreground">
                Asignada a {venta.repartidorNombre}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : venta.repartidorNombre ? (
        <p className="text-sm text-muted-foreground">
          Repartidor: {venta.repartidorNombre}
        </p>
      ) : null}

      <ListaLineasVenta lineas={venta.lineas} puedeInactivar={puedeInactivar} />
    </div>
  );
}
