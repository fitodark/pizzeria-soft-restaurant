import { getSesion } from "@/lib/auth";
import { db } from "@/lib/db";
import { navegacionPorRol } from "@/components/layout/navegacion";
import { ShellDashboard } from "@/components/layout/ShellDashboard";
import { Rol } from "@/generated/prisma/enums";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sesion = await getSesion();

  const sucursalActiva = await db.sucursal.findUniqueOrThrow({
    where: { id: sesion.sucursalId },
    select: { id: true, nombre: true },
  });

  // Solo el administrador cambia de sucursal desde el header.
  const sucursales =
    sesion.rol === Rol.ADMINISTRADOR
      ? await db.sucursal.findMany({
          where: { activa: true },
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        })
      : [];

  return (
    <ShellDashboard
      usuario={sesion.usuario}
      sucursalActiva={sucursalActiva}
      sucursales={sucursales}
      items={navegacionPorRol(sesion.rol)}
    >
      {children}
    </ShellDashboard>
  );
}
