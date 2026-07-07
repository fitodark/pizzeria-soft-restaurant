import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { formatoMoneda } from "@/lib/utils";
import { promocionVigente } from "@/lib/precios";
import { CanalVenta } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { TablaPromociones, type FilaPromocion } from "./TablaPromociones";

const ETIQUETA_TIPO: Record<string, string> = {
  PROMOCION: "Promoción",
  PAQUETE: "Paquete",
  DOS_POR_UNO: "2x1",
};

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function resumenVigencia(promo: {
  tipo: string;
  diasSemana: number[];
  fechaInicio: Date | null;
  fechaFin: Date | null;
}): string {
  if (promo.tipo === "PAQUETE") {
    return "Todos los días";
  }
  const partes: string[] = [];
  partes.push(
    promo.diasSemana.length === 0
      ? "Todos los días"
      : promo.diasSemana.map((d) => DIAS_CORTOS[d]).join(", ")
  );
  if (promo.fechaInicio || promo.fechaFin) {
    const inicio = promo.fechaInicio?.toISOString().slice(0, 10) ?? "…";
    const fin = promo.fechaFin?.toISOString().slice(0, 10) ?? "…";
    partes.push(`${inicio} a ${fin}`);
  }
  return partes.join(" · ");
}

export default async function PaginaPromociones() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "promociones.ver")) {
    redirect("/");
  }
  const puedeGestionar = tienePermiso(sesion.rol, "promociones.gestionar");

  const promociones = await db.promocion.findMany({
    orderBy: [{ activa: "desc" }, { nombre: "asc" }],
  });

  const hoy = new Date();
  const filas: FilaPromocion[] = promociones.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    tipo: ETIQUETA_TIPO[p.tipo],
    precio: p.precioEspecial
      ? formatoMoneda(p.precioEspecial.toString())
      : "Pizza comprada",
    vigencia: resumenVigencia(p),
    canales:
      [
        p.ventaEstablecimiento ? "Establecimiento" : null,
        p.ventaDomicilio ? "Domicilio" : null,
      ]
        .filter(Boolean)
        .join(" · ") || "—",
    vigenteHoy:
      promocionVigente(p, hoy, CanalVenta.ESTABLECIMIENTO) ||
      promocionVigente(p, hoy, CanalVenta.DOMICILIO),
    activa: p.activa,
    puedeGestionar,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Promociones</h1>
          <p className="text-muted-foreground">
            Promociones por temporada, paquetes y 2x1.
          </p>
        </div>
        {puedeGestionar ? (
          <Button asChild className="h-11">
            <Link href="/promociones/nueva">
              <Plus className="size-4" />
              Nueva promoción
            </Link>
          </Button>
        ) : null}
      </div>
      <TablaPromociones datos={filas} />
    </div>
  );
}
