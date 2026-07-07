import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSesion } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { corteAbierto } from "@/lib/consultas/cortes";
import { catalogoWizard } from "@/lib/consultas/ventas";
import { WizardVenta } from "@/components/ventas/WizardVenta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function PaginaVentaNueva() {
  const sesion = await getSesion();
  if (!tienePermiso(sesion.rol, "ventas.crear")) {
    redirect("/ventas");
  }

  const corte = await corteAbierto(sesion.sucursalId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/ventas"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Ventas
        </Link>
        <h1 className="text-2xl font-semibold">Nueva venta</h1>
      </div>
      {!corte ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-3 pt-6">
            <p className="text-muted-foreground">
              Abra un corte de caja para registrar ventas.
            </p>
            <Button asChild variant="outline" className="h-11">
              <Link href="/cortes">Ir a cortes de caja</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <WizardVenta catalogo={await catalogoWizard(new Date())} />
      )}
    </div>
  );
}
