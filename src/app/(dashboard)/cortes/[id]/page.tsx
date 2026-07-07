import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { totalesCorte } from "@/lib/consultas/cortes";
import { formatoFecha, formatoMoneda, cn } from "@/lib/utils";
import { EstatusCorte, OrigenMovimiento, Rol } from "@/generated/prisma/enums";
import { InactivarGastoBoton } from "@/components/cortes/InactivarGastoBoton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ETIQUETA_ORIGEN: Record<OrigenMovimiento, string> = {
  VENTA: "Venta",
  GASTO: "Gasto",
  COMPRA_PROVEEDOR: "Compra proveedor",
  SUELDO: "Sueldo",
};

export default async function PaginaCorteDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "cortes.ver")) {
    redirect("/");
  }
  const esAdmin = tienePermiso(sesion.rol, "auditoria.verInactivos");
  const puedeInactivarGastos = tienePermiso(sesion.rol, "gastos.inactivar");

  const { id } = await params;
  const corte = await db.corteCaja.findUnique({
    where: { id },
    include: {
      sucursal: { select: { nombre: true } },
      // Solo el ADMINISTRADOR ve movimientos inactivos (auditoría).
      movimientos: {
        where: esAdmin ? {} : { activo: true },
        orderBy: { createdAt: "desc" },
      },
      compras: {
        include: { detalles: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!corte) {
    notFound();
  }
  // Solo el admin puede consultar cortes de otras sucursales.
  if (corte.sucursalId !== sesion.sucursalId && sesion.rol !== Rol.ADMINISTRADOR) {
    redirect("/cortes");
  }

  const abierto = corte.estatus === EstatusCorte.ABIERTO;
  const totales = abierto ? await totalesCorte(corte.id) : null;
  const ingresos = abierto ? totales!.ingresos.toString() : corte.totalIngresos?.toString() ?? "0";
  const egresos = abierto ? totales!.egresos.toString() : corte.totalEgresos?.toString() ?? "0";
  const saldoFinal = abierto
    ? corte.saldoInicial.plus(ingresos).minus(egresos).toString()
    : corte.saldoFinal?.toString() ?? "0";

  // Nombres de usuarios involucrados (sin FK en el esquema: se cruzan aquí).
  const idsUsuarios = new Set<string>();
  idsUsuarios.add(corte.usuarioAperturaId);
  if (corte.usuarioCierreId) idsUsuarios.add(corte.usuarioCierreId);
  for (const m of corte.movimientos) {
    idsUsuarios.add(m.usuarioId);
    if (m.usuarioInactivoId) idsUsuarios.add(m.usuarioInactivoId);
  }
  const perfiles = await db.perfil.findMany({
    where: { id: { in: [...idsUsuarios] } },
    select: { id: true, nombre: true },
  });
  const nombrePor = new Map(perfiles.map((p) => [p.id, p.nombre]));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/cortes"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Cortes de caja
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            Corte del {formatoFecha(corte.fechaApertura)}
          </h1>
          {abierto ? (
            <Badge variant="outline" className="text-success border-success/40">
              Abierto
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Cerrado
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          {corte.sucursal.nombre} · Abrió{" "}
          {nombrePor.get(corte.usuarioAperturaId) ?? "—"}
          {corte.usuarioCierreId
            ? ` · Cerró ${nombrePor.get(corte.usuarioCierreId) ?? "—"} el ${formatoFecha(corte.fechaCierre!)}`
            : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Saldo inicial</CardDescription>
            <CardTitle className="tabular-nums">
              {formatoMoneda(corte.saldoInicial.toString())}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ingresos</CardDescription>
            <CardTitle className="tabular-nums text-success">
              +{formatoMoneda(ingresos)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Egresos</CardDescription>
            <CardTitle className="tabular-nums text-destructive">
              −{formatoMoneda(egresos)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>
              {abierto ? "Saldo esperado" : "Saldo final"}
            </CardDescription>
            <CardTitle className="tabular-nums">
              {formatoMoneda(saldoFinal)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {corte.notasCierre ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas de cierre</CardTitle>
            <CardDescription>{corte.notasCierre}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Movimientos</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Registró</TableHead>
                {esAdmin ? <TableHead>Auditoría</TableHead> : null}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {corte.movimientos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={esAdmin ? 7 : 6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Sin movimientos.
                  </TableCell>
                </TableRow>
              ) : (
                corte.movimientos.map((m) => (
                  <TableRow
                    key={m.id}
                    className={cn(!m.activo && "bg-destructive/5")}
                  >
                    <TableCell className="whitespace-nowrap">
                      {formatoFecha(m.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ETIQUETA_ORIGEN[m.origen]}</Badge>
                    </TableCell>
                    <TableCell
                      className={cn(!m.activo && "line-through text-muted-foreground")}
                    >
                      {m.descripcion}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        m.tipo === "INGRESO" ? "text-success" : "text-destructive",
                        !m.activo && "line-through opacity-60"
                      )}
                    >
                      {m.tipo === "INGRESO" ? "+" : "−"}
                      {formatoMoneda(m.monto.toString())}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {nombrePor.get(m.usuarioId) ?? "—"}
                    </TableCell>
                    {esAdmin ? (
                      <TableCell className="text-sm text-muted-foreground">
                        {!m.activo && m.usuarioInactivoId ? (
                          <span className="text-destructive">
                            Inactivó {nombrePor.get(m.usuarioInactivoId) ?? "—"}{" "}
                            el {formatoFecha(m.fechaInactivacion!)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right">
                      {abierto &&
                      puedeInactivarGastos &&
                      m.activo &&
                      m.origen === OrigenMovimiento.GASTO ? (
                        <InactivarGastoBoton
                          movimientoId={m.id}
                          descripcion={m.descripcion}
                          monto={formatoMoneda(m.monto.toString())}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {corte.compras.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Compras a proveedor</h2>
          {corte.compras.map((compra) => (
            <Card key={compra.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {compra.proveedor}
                    {compra.folioNota ? (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        Nota {compra.folioNota}
                      </span>
                    ) : null}
                  </CardTitle>
                  <span className="font-semibold tabular-nums">
                    {formatoMoneda(compra.total.toString())}
                  </span>
                </div>
                <CardDescription>
                  {formatoFecha(compra.createdAt)} ·{" "}
                  {nombrePor.get(compra.usuarioId) ?? "—"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {compra.detalles.map((d) => (
                    <li key={d.id} className="flex justify-between gap-3">
                      <span>
                        {d.cantidad.toString()} × {d.descripcion}
                        {d.sumaInventario ? (
                          <Badge variant="outline" className="ml-2">
                            Sumó a inventario
                          </Badge>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatoMoneda(
                          d.cantidad.times(d.precioUnitario).toString()
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
