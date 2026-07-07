"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import type { ElementoNav } from "@/components/layout/navegacion";
import type { Rol } from "@/generated/prisma/enums";

type SucursalMin = { id: string; nombre: string };

type Props = {
  usuario: { nombre: string; rol: Rol };
  sucursalActiva: SucursalMin;
  sucursales: SucursalMin[];
  items: ElementoNav[];
  children: React.ReactNode;
};

export function ShellDashboard({
  usuario,
  sucursalActiva,
  sucursales,
  items,
  children,
}: Props) {
  const [colapsada, setColapsada] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar items={items} colapsada={colapsada} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          usuario={usuario}
          sucursalActiva={sucursalActiva}
          sucursales={sucursales}
          onAlternarSidebar={() => setColapsada((v) => !v)}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
