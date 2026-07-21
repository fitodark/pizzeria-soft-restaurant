import { Rol } from "@/generated/prisma/enums";
import { registrarEventoSeguridad } from "@/lib/log-seguridad";

/**
 * Matriz rol → acción (blueprint §8). TODA server action debe validar aquí;
 * la UI solo oculta, nunca protege.
 */
export const ACCIONES = [
  // Ventas
  "ventas.crear",
  "ventas.agregarLineas",
  "ventas.inactivarLinea",
  "ventas.cobrar",
  "ventas.cancelar", // pedido no aceptado: pérdida que absorbe la sucursal
  "ventas.asignarRepartidor",
  "ventas.validarTransferencia",
  "ventas.ver",
  "ventas.verAsignadas", // repartidor: solo sus ventas a domicilio
  // Cortes de caja
  "cortes.abrir",
  "cortes.cerrar",
  "cortes.ver",
  "gastos.registrar",
  "gastos.inactivar",
  "compras.registrar",
  "sueldos.registrar",
  // Catálogos
  "clientes.gestionar",
  "clientes.ver",
  "productos.gestionar",
  "productos.ver",
  "promociones.gestionar",
  "promociones.ver",
  "inventario.ajustar",
  "inventario.ver",
  // Administración
  "sucursales.gestionar",
  "usuarios.gestionar",
  "reportes.ver",
  "configuracion.gestionar",
  "festivos.gestionar", // catálogo global de días festivos — solo ADMINISTRADOR
  // Otros
  "impresion.reimprimir",
  "auditoria.verInactivos", // solo ADMINISTRADOR
] as const;

export type Accion = (typeof ACCIONES)[number];

const PERMISOS_ENCARGADO: readonly Accion[] = [
  "ventas.crear",
  "ventas.agregarLineas",
  "ventas.inactivarLinea",
  "ventas.cobrar",
  "ventas.cancelar",
  "ventas.asignarRepartidor",
  "ventas.validarTransferencia",
  "ventas.ver",
  "cortes.abrir",
  "cortes.cerrar",
  "cortes.ver",
  "gastos.registrar",
  "gastos.inactivar",
  "compras.registrar",
  "sueldos.registrar",
  "clientes.gestionar",
  "clientes.ver",
  "productos.ver",
  "promociones.ver",
  "inventario.ajustar",
  "inventario.ver",
  "reportes.ver",
  "configuracion.gestionar",
  "impresion.reimprimir",
];

const PERMISOS_MESERO: readonly Accion[] = [
  "ventas.crear",
  "ventas.agregarLineas",
  "ventas.inactivarLinea", // con su propio PIN
  "ventas.cobrar",
  "ventas.ver",
  "clientes.gestionar", // alta y búsqueda en el wizard
  "clientes.ver",
  "productos.ver",
  "promociones.ver",
  "impresion.reimprimir",
];

const PERMISOS_REPARTIDOR: readonly Accion[] = ["ventas.verAsignadas"];

const MATRIZ: Record<Rol, ReadonlySet<Accion>> = {
  ADMINISTRADOR: new Set(ACCIONES), // todo, en todas las sucursales
  ENCARGADO: new Set(PERMISOS_ENCARGADO),
  MESERO: new Set(PERMISOS_MESERO),
  REPARTIDOR: new Set(PERMISOS_REPARTIDOR),
};

export function tienePermiso(rol: Rol, accion: Accion): boolean {
  return MATRIZ[rol].has(accion);
}

/** Lanza un error en español si el rol no tiene la acción. Usar en TODA mutación. */
export function verificarPermiso(rol: Rol, accion: Accion): void {
  if (!tienePermiso(rol, accion)) {
    registrarEventoSeguridad("permiso_denegado", { rol, accion });
    throw new Error("No tienes permiso para realizar esta acción.");
  }
}
