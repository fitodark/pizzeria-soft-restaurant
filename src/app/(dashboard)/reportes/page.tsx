import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import {
  esRango,
  reporteMovimientos,
  type Rango,
} from "@/lib/consultas/reportes";
import { formatoFecha, formatoMoneda } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiltrosReporte } from "@/components/reportes/FiltrosReporte";
import { Rol } from "@/generated/prisma/enums";

const ORIGEN: Record<string, string> = {
  VENTA: "Ventas",
  GASTO: "Gastos",
  COMPRA_PROVEEDOR: "Compras",
  SUELDO: "Sueldos",
  CANCELACION: "Cancelaciones",
};

function Tarjeta({
  titulo,
  monto,
  clase,
}: {
  titulo: string;
  monto: string;
  clase?: string;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{titulo}</p>
        <p className={`text-2xl font-semibold tabular-nums ${clase ?? ""}`}>
          {formatoMoneda(monto)}
        </p>
      </CardContent>
    </Card>
  );
}

type Props = {
  searchParams: Promise<{ rango?: string; sucursal?: string }>;
};

export default async function PaginaReportes({ searchParams }: Props) {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "reportes.ver")) {
    redirect("/");
  }
  const esAdmin = sesion.rol === Rol.ADMINISTRADOR;

  const params = await searchParams;
  const rango: Rango = esRango(params.rango) ? params.rango : "dia";
  // Encargado: siempre su sucursal. Admin: la elegida o todas.
  const sucursalId = esAdmin ? params.sucursal || null : sesion.sucursalId;

  const [reporte, sucursales] = await Promise.all([
    reporteMovimientos(rango, sucursalId),
    esAdmin
      ? db.sucursal.findMany({
          where: { activa: true },
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        })
      : null,
  ]);
  const { totales, porOrigen, nomina, movimientos } = reporte;
  const diferenciaNomina = Number(nomina.proyectada) - Number(nomina.pagado);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="text-muted-foreground">
          Movimientos activos de caja del periodo (los inactivados no cuentan).
        </p>
      </div>

      <FiltrosReporte
        rango={rango}
        sucursalId={sucursalId}
        sucursales={sucursales}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta titulo="Ingresos" monto={totales.ingresos} clase="text-success" />
        <Tarjeta titulo="Egresos" monto={totales.egresos} clase="text-destructive" />
        <Tarjeta titulo="Neto" monto={totales.neto} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(ORIGEN) as (keyof typeof porOrigen)[]).map((origen) => (
          <Tarjeta
            key={origen}
            titulo={ORIGEN[origen]}
            monto={porOrigen[origen]}
          />
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">
              Sueldos pagados en el periodo
            </p>
            <p className="text-xl font-semibold tabular-nums">
              {formatoMoneda(nomina.pagado)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Nómina activa proyectada ({nomina.empleados} empleado
              {nomina.empleados === 1 ? "" : "s"})
            </p>
            <p className="text-xl font-semibold tabular-nums">
              {formatoMoneda(nomina.proyectada)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Por pagar (proyección)</p>
            <p
              className={`text-xl font-semibold tabular-nums ${
                diferenciaNomina < 0 ? "text-destructive" : ""
              }`}
            >
              {formatoMoneda(diferenciaNomina.toFixed(2))}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              {sucursalId ? null : <TableHead>Sucursal</TableHead>}
              <TableHead>Origen</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={sucursalId ? 5 : 6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Sin movimientos en el periodo.
                </TableCell>
              </TableRow>
            ) : (
              movimientos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatoFecha(m.fecha)}
                  </TableCell>
                  {sucursalId ? null : <TableCell>{m.sucursal}</TableCell>}
                  <TableCell>{ORIGEN[m.origen]}</TableCell>
                  <TableCell>{m.descripcion}</TableCell>
                  <TableCell>{m.usuario}</TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${
                      m.tipo === "EGRESO" ? "text-destructive" : "text-success"
                    }`}
                  >
                    {m.tipo === "EGRESO" ? "−" : ""}
                    {formatoMoneda(m.monto)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
