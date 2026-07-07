import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { crearClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { formatoMoneda } from "@/lib/utils";
import { ETIQUETA_ROL } from "@/components/layout/navegacion";
import { NuevoUsuario } from "./NuevoUsuario";
import { TablaUsuarios, type FilaUsuario } from "./TablaUsuarios";

const ETIQUETA_PERIODO: Record<string, string> = {
  DIARIO: "diario",
  SEMANAL: "semanal",
  MENSUAL: "mensual",
};

export default async function PaginaUsuarios() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "usuarios.gestionar")) {
    redirect("/");
  }

  const [perfiles, sucursales] = await Promise.all([
    db.perfil.findMany({
      include: { sucursales: { include: { sucursal: true } } },
      orderBy: { nombre: "asc" },
    }),
    db.sucursal.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  // El correo vive solo en Supabase Auth; se cruza por id.
  const supabaseAdmin = crearClienteSupabaseAdmin();
  const { data } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emails = new Map(data?.users.map((u) => [u.id, u.email ?? ""]) ?? []);

  const filas: FilaUsuario[] = perfiles.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    email: emails.get(p.id) ?? "—",
    rol: ETIQUETA_ROL[p.rol],
    sueldo: `${formatoMoneda(p.sueldo.toString())} ${ETIQUETA_PERIODO[p.periodoSueldo]}`,
    sucursales:
      p.rol === "ADMINISTRADOR"
        ? "Todas"
        : p.sucursales.map((us) => us.sucursal.nombre).join(", ") || "—",
    activo: p.activo,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-muted-foreground">
            Roles, sueldos, PIN de seguridad y sucursales asignadas.
          </p>
        </div>
        <NuevoUsuario sucursales={sucursales} />
      </div>
      <TablaUsuarios datos={filas} />
    </div>
  );
}
