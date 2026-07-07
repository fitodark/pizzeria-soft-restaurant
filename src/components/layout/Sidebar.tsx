"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BarChart3,
  LayoutDashboard,
  Package,
  Pizza,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ElementoNav, IconoNav } from "@/components/layout/navegacion";

const ICONOS: Record<IconoNav, LucideIcon> = {
  resumen: LayoutDashboard,
  ventas: ShoppingCart,
  clientes: Users,
  productos: Pizza,
  inventario: Package,
  promociones: BadgePercent,
  cortes: Wallet,
  compras: Truck,
  reportes: BarChart3,
  sucursales: Store,
  usuarios: UserCog,
  configuracion: Settings,
};

type Props = {
  items: ElementoNav[];
  colapsada: boolean;
};

export function Sidebar({ items, colapsada }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 border-r bg-sidebar transition-[width] duration-150",
        colapsada ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          PB
        </div>
        {!colapsada && (
          <span className="truncate font-semibold">Pizzería Barbosa</span>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const Icono = ICONOS[item.icono];
          const activa =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={colapsada ? item.etiqueta : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                activa
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
                colapsada && "justify-center px-0"
              )}
            >
              <Icono className="size-5 shrink-0" />
              {!colapsada && <span className="truncate">{item.etiqueta}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
