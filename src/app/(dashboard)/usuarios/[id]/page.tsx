import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { db } from "@/lib/db";
import { crearClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { FormularioUsuario } from "@/components/forms/FormularioUsuario";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PaginaUsuarioDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "usuarios.gestionar")) {
    redirect("/");
  }

  const { id } = await params;
  const [perfil, sucursales] = await Promise.all([
    db.perfil.findUnique({
      where: { id },
      include: { sucursales: true },
    }),
    db.sucursal.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);
  if (!perfil) {
    notFound();
  }

  const supabaseAdmin = crearClienteSupabaseAdmin();
  const { data } = await supabaseAdmin.auth.admin.getUserById(id);
  const email = data?.user?.email ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/usuarios"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Usuarios
        </Link>
        <h1 className="text-2xl font-semibold">{perfil.nombre}</h1>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Datos del usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioUsuario
            sucursales={sucursales}
            usuario={{
              id: perfil.id,
              email,
              nombre: perfil.nombre,
              rol: perfil.rol,
              sueldo: perfil.sueldo.toString(),
              periodoSueldo: perfil.periodoSueldo,
              sucursalIds: perfil.sucursales.map((us) => us.sucursalId),
              activo: perfil.activo,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
