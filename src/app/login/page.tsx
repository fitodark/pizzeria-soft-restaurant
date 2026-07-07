import type { Metadata } from "next";
import { FormularioLogin } from "@/components/forms/FormularioLogin";

export const metadata: Metadata = {
  title: "Iniciar sesión — Pizzería Barbosa",
};

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-semibold">
            PB
          </div>
          <h1 className="text-2xl font-semibold pt-2">Pizzería Barbosa</h1>
          <p className="text-muted-foreground">Punto de venta</p>
        </div>
        <FormularioLogin />
      </div>
    </main>
  );
}
