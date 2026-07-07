import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NuevoCliente } from "./NuevoCliente";
import { TablaClientes, type FilaCliente } from "./TablaClientes";

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "clientes.ver")) {
    redirect("/");
  }

  const { q } = await searchParams;
  const busqueda = q?.trim() ?? "";

  const clientes = await db.cliente.findMany({
    where: busqueda
      ? {
          OR: [
            { telefono: { contains: busqueda.replace(/[\s\-()]/g, "") } },
            { nombre: { contains: busqueda, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { direcciones: { where: { activa: true } } } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const filas: FilaCliente[] = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono,
    direcciones: c._count.direcciones,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground">
            Búsqueda por teléfono y gestión de direcciones.
          </p>
        </div>
        <NuevoCliente />
      </div>
      <form method="get" className="flex max-w-md gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={busqueda}
          placeholder="Teléfono o nombre…"
          className="h-11"
          inputMode="tel"
        />
        <Button type="submit" variant="secondary" className="h-11">
          <Search className="size-4" />
          Buscar
        </Button>
      </form>
      <TablaClientes datos={filas} />
    </div>
  );
}
