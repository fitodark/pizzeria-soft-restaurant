import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { listaDiasFestivos } from "@/lib/consultas/festivos";
import { FormularioConfiguracion } from "@/components/forms/FormularioConfiguracion";
import { DiasFestivos } from "@/components/forms/DiasFestivos";
import type { DatosConfiguracion, ModoImpresora } from "@/lib/esquemas/configuracion";

export default async function PaginaConfiguracion() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "configuracion.gestionar")) {
    redirect("/");
  }
  const puedeFestivos = tienePermiso(sesion.rol, "festivos.gestionar");

  const [sucursal, config, festivos] = await Promise.all([
    db.sucursal.findUnique({
      where: { id: sesion.sucursalId },
      select: { nombre: true },
    }),
    db.configuracionSucursal.findUnique({
      where: { sucursalId: sesion.sucursalId },
    }),
    puedeFestivos ? listaDiasFestivos() : Promise.resolve([]),
  ]);

  const valoresIniciales: DatosConfiguracion | null = config
    ? {
        impresoraPrincipalModo: config.impresoraPrincipalModo as ModoImpresora,
        impresoraPrincipalRuta: config.impresoraPrincipalRuta,
        impresoraCocinaModo: config.impresoraCocinaModo as ModoImpresora,
        impresoraCocinaRuta: config.impresoraCocinaRuta,
        impresoraBebidasModo: config.impresoraBebidasModo as ModoImpresora,
        impresoraBebidasRuta: config.impresoraBebidasRuta,
        logoUrl: config.logoUrl ?? "",
        leyendaPie: config.leyendaPie ?? "",
      }
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground">
          Impresoras y ticket de {sucursal?.nombre ?? "la sucursal"}. La prueba
          usa los valores capturados aunque no estén guardados.
        </p>
      </div>
      <FormularioConfiguracion valoresIniciales={valoresIniciales} />
      {puedeFestivos ? <DiasFestivos festivos={festivos} /> : null}
    </div>
  );
}
