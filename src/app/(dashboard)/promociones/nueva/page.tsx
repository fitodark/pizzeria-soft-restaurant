import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { productosParaPromo } from "@/lib/consultas/productos";
import { FormularioPromocion } from "@/components/forms/FormularioPromocion";
import { Card, CardContent } from "@/components/ui/card";

export default async function PaginaPromocionNueva() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "promociones.gestionar")) {
    redirect("/promociones");
  }

  const productos = await productosParaPromo();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/promociones"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Promociones
        </Link>
        <h1 className="text-2xl font-semibold">Nueva promoción</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <FormularioPromocion productos={productos} />
        </CardContent>
      </Card>
    </div>
  );
}
