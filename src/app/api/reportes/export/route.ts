import { format } from "date-fns";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { esRango, reporteMovimientos } from "@/lib/consultas/reportes";
import { formatoFecha } from "@/lib/utils";
import { Rol } from "@/generated/prisma/enums";

const ORIGEN: Record<string, string> = {
  VENTA: "Ventas",
  GASTO: "Gastos",
  COMPRA_PROVEEDOR: "Compras",
  SUELDO: "Sueldos",
};

/**
 * Celda CSV escapada (comillas dobladas, campo entre comillas). Antepone un
 * apóstrofe si el valor arranca con =, +, -, @, tab o CR: evita que Excel/
 * LibreOffice lo interprete como fórmula (CWE-1236).
 */
function celda(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replaceAll('"', '""')}"`;
}

/** Export CSV de los movimientos del periodo (blueprint Step 13). */
export async function GET(request: Request) {
  let sesion;
  try {
    sesion = await getSesion();
  } catch {
    return new Response("Sesión inválida.", { status: 401 });
  }
  if (!tienePermiso(sesion.rol, "reportes.ver")) {
    return new Response("Sin permiso.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parametroRango = searchParams.get("rango") ?? undefined;
  const rango = esRango(parametroRango) ? parametroRango : "dia";
  // El encargado solo exporta su sucursal, sin importar el parámetro
  const sucursalId =
    sesion.rol === Rol.ADMINISTRADOR
      ? searchParams.get("sucursal") || null
      : sesion.sucursalId;

  const { movimientos, totales } = await reporteMovimientos(rango, sucursalId);

  const filas = [
    ["Fecha", "Sucursal", "Tipo", "Origen", "Descripción", "Usuario", "Monto"],
    ...movimientos.map((m) => [
      formatoFecha(m.fecha),
      m.sucursal,
      m.tipo === "INGRESO" ? "Ingreso" : "Egreso",
      ORIGEN[m.origen],
      m.descripcion,
      m.usuario,
      m.tipo === "EGRESO" ? `-${m.monto}` : m.monto,
    ]),
    [],
    ["", "", "", "", "", "Ingresos", totales.ingresos],
    ["", "", "", "", "", "Egresos", `-${totales.egresos}`],
    ["", "", "", "", "", "Neto", totales.neto],
  ];
  // BOM para que Excel abra el UTF-8 con acentos correctos
  const csv =
    "\uFEFF" + filas.map((f) => f.map(celda).join(",")).join("\r\n");

  const nombre = `reporte-${rango}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
