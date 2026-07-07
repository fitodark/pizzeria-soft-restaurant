import { Rol } from "@/generated/prisma/enums";
import { tienePermiso, type Accion } from "@/lib/permisos";

/** Nombres de icono soportados por el Sidebar (lucide). */
export type IconoNav =
  | "resumen"
  | "ventas"
  | "clientes"
  | "productos"
  | "inventario"
  | "promociones"
  | "cortes"
  | "compras"
  | "reportes"
  | "sucursales"
  | "usuarios"
  | "configuracion";

export type ElementoNav = {
  href: string;
  etiqueta: string;
  icono: IconoNav;
};

type DefinicionNav = ElementoNav & {
  /** Visible si el rol tiene AL MENOS UNA de estas acciones; vacío = todos. */
  permisos: readonly Accion[];
};

const NAVEGACION: readonly DefinicionNav[] = [
  { href: "/", etiqueta: "Resumen", icono: "resumen", permisos: [] },
  {
    href: "/ventas",
    etiqueta: "Ventas",
    icono: "ventas",
    permisos: ["ventas.ver", "ventas.verAsignadas"],
  },
  { href: "/clientes", etiqueta: "Clientes", icono: "clientes", permisos: ["clientes.ver"] },
  { href: "/productos", etiqueta: "Productos", icono: "productos", permisos: ["productos.ver"] },
  { href: "/inventario", etiqueta: "Inventario", icono: "inventario", permisos: ["inventario.ver"] },
  {
    href: "/promociones",
    etiqueta: "Promociones",
    icono: "promociones",
    permisos: ["promociones.ver"],
  },
  { href: "/cortes", etiqueta: "Cortes de caja", icono: "cortes", permisos: ["cortes.ver"] },
  { href: "/compras/nueva", etiqueta: "Compras", icono: "compras", permisos: ["compras.registrar"] },
  { href: "/reportes", etiqueta: "Reportes", icono: "reportes", permisos: ["reportes.ver"] },
  {
    href: "/sucursales",
    etiqueta: "Sucursales",
    icono: "sucursales",
    permisos: ["sucursales.gestionar"],
  },
  { href: "/usuarios", etiqueta: "Usuarios", icono: "usuarios", permisos: ["usuarios.gestionar"] },
  {
    href: "/configuracion",
    etiqueta: "Configuración",
    icono: "configuracion",
    permisos: ["configuracion.gestionar"],
  },
];

/** Elementos de navegación visibles para un rol (la página valida de nuevo). */
export function navegacionPorRol(rol: Rol): ElementoNav[] {
  return NAVEGACION.filter(
    (item) =>
      item.permisos.length === 0 ||
      item.permisos.some((accion) => tienePermiso(rol, accion))
  ).map(({ href, etiqueta, icono }) => ({ href, etiqueta, icono }));
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  ENCARGADO: "Encargado",
  MESERO: "Mesero",
  REPARTIDOR: "Repartidor",
};
