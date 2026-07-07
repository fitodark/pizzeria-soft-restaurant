import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { NuevaSucursal } from "./NuevaSucursal";
import { TablaSucursales, type FilaSucursal } from "./TablaSucursales";

export default async function PaginaSucursales() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "sucursales.gestionar")) {
    redirect("/");
  }

  const sucursales = await db.sucursal.findMany({
    include: { _count: { select: { usuarios: true } } },
    orderBy: { nombre: "asc" },
  });

  const filas: FilaSucursal[] = sucursales.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    direccion: `${s.calle}, ${s.colonia}, ${s.ciudad}`,
    telefono: s.telefono,
    usuarios: s._count.usuarios,
    activa: s.activa,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sucursales</h1>
          <p className="text-muted-foreground">
            Alta y edición de sucursales y sus usuarios.
          </p>
        </div>
        <NuevaSucursal />
      </div>
      <TablaSucursales datos={filas} />
    </div>
  );
}
