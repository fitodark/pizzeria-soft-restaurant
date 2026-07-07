import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBasket } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { corteAbierto, totalesCorte } from "@/lib/consultas/cortes";
import { formatoFecha, formatoMoneda } from "@/lib/utils";
import { AperturaCorteDialog } from "@/components/cortes/AperturaCorteDialog";
import { CierreCorteDialog } from "@/components/cortes/CierreCorteDialog";
import { GastoDialog } from "@/components/cortes/GastoDialog";
import {
  SueldoDialog,
  type EmpleadoParaSueldo,
} from "@/components/cortes/SueldoDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const ETIQUETA_PERIODO: Record<string, string> = {
  DIARIO: "diario",
  SEMANAL: "semanal",
  MENSUAL: "mensual",
};

export default async function PaginaCortes() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "cortes.ver")) {
    redirect("/");
  }

  const corte = await corteAbierto(sesion.sucursalId);
  const totales = corte ? await totalesCorte(corte.id) : null;
  const saldoEsperado =
    corte && totales
      ? corte.saldoInicial.plus(totales.ingresos).minus(totales.egresos)
      : null;

  const [historial, asignaciones] = await Promise.all([
    db.corteCaja.findMany({
      where: { sucursalId: sesion.sucursalId },
      orderBy: { fechaApertura: "desc" },
      take: 30,
    }),
    db.usuarioSucursal.findMany({
      where: { sucursalId: sesion.sucursalId, usuario: { activo: true } },
      include: { usuario: true },
      orderBy: { usuario: { nombre: "asc" } },
    }),
  ]);

  const empleados: EmpleadoParaSueldo[] = asignaciones.map(({ usuario }) => ({
    id: usuario.id,
    nombre: usuario.nombre,
    sueldo: usuario.sueldo.toString(),
    periodo: ETIQUETA_PERIODO[usuario.periodoSueldo],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cortes de caja</h1>
          <p className="text-muted-foreground">
            Corte activo e historial de la sucursal.
          </p>
        </div>
        {!corte ? <AperturaCorteDialog /> : null}
      </div>

      {corte && totales && saldoEsperado ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Corte abierto</CardTitle>
                <CardDescription>
                  Desde {formatoFecha(corte.fechaApertura)}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-success border-success/40">
                Abierto
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Saldo inicial</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatoMoneda(corte.saldoInicial.toString())}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos activos</p>
                <p className="text-xl font-semibold tabular-nums text-success">
                  +{formatoMoneda(totales.ingresos.toString())}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Egresos activos</p>
                <p className="text-xl font-semibold tabular-nums text-destructive">
                  −{formatoMoneda(totales.egresos.toString())}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo esperado</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatoMoneda(saldoEsperado.toString())}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <GastoDialog />
              <SueldoDialog empleados={empleados} />
              <Button asChild variant="outline" className="h-11">
                <Link href="/compras/nueva">
                  <ShoppingBasket className="size-4" />
                  Compra a proveedor
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11">
                <Link href={`/cortes/${corte.id}`}>Ver movimientos</Link>
              </Button>
              <CierreCorteDialog
                saldoInicial={corte.saldoInicial.toString()}
                ingresos={totales.ingresos.toString()}
                egresos={totales.egresos.toString()}
                saldoEsperado={saldoEsperado.toString()}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex h-32 items-center justify-center pt-6">
            <p className="text-muted-foreground">
              No hay corte abierto. Abre uno para registrar ventas y gastos.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Historial</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apertura</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead className="text-right">Saldo inicial</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Egresos</TableHead>
                <TableHead className="text-right">Saldo final</TableHead>
                <TableHead>Estatus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Sin cortes registrados.
                  </TableCell>
                </TableRow>
              ) : (
                historial.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/cortes/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {formatoFecha(c.fechaApertura)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {c.fechaCierre ? formatoFecha(c.fechaCierre) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatoMoneda(c.saldoInicial.toString())}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.totalIngresos
                        ? formatoMoneda(c.totalIngresos.toString())
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.totalEgresos
                        ? formatoMoneda(c.totalEgresos.toString())
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {c.saldoFinal ? formatoMoneda(c.saldoFinal.toString()) : "—"}
                    </TableCell>
                    <TableCell>
                      {c.estatus === "ABIERTO" ? (
                        <Badge
                          variant="outline"
                          className="text-success border-success/40"
                        >
                          Abierto
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Cerrado
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
