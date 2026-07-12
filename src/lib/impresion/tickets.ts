import type { ThermalPrinter } from "node-thermal-printer";
import { crearImpresora } from "@/lib/impresion/escpos";
import { formatoCodigo, formatoFecha, formatoMoneda } from "@/lib/utils";
import type { LineaVentaDTO, VentaDTO } from "@/lib/consultas/ventas";

/**
 * Las 4 plantillas de ticket (blueprint Step 11). Cada una devuelve el buffer
 * ESC/POS listo para enviarBuffer; aquí no hay red ni base de datos.
 */

export type SucursalTicket = {
  nombre: string;
  direccion: string;
  telefono: string;
};

export type DatosComanda = {
  folio: number;
  canal: VentaDTO["canal"];
  mesa: string | null;
  cliente: string | null;
  fecha: Date;
  lineas: LineaVentaDTO[];
};

export type DatosTicket = {
  venta: VentaDTO;
  sucursal: SucursalTicket;
  leyendaPie: string | null;
};

function encabezadoComanda(p: ThermalPrinter, titulo: string, datos: DatosComanda) {
  p.alignCenter();
  p.setTextDoubleHeight();
  p.bold(true);
  p.println(titulo);
  p.setTextQuadArea();
  p.println(`#${datos.folio}`);
  p.setTextNormal();
  p.bold(false);
  p.println(
    datos.canal === "DOMICILIO"
      ? `DOMICILIO${datos.cliente ? ` · ${datos.cliente}` : ""}`
      : datos.mesa
        ? `Mesa ${datos.mesa}`
        : "Mostrador"
  );
  p.println(formatoFecha(datos.fecha));
  p.drawLine();
}

function lineaComanda(p: ThermalPrinter, linea: LineaVentaDTO) {
  p.alignLeft();
  p.bold(true);
  p.setTextDoubleHeight();
  p.println(`${linea.cantidad} x ${linea.titulo}`);
  p.setTextNormal();
  p.bold(false);
  if (linea.subtitulo) {
    p.println(`   ${linea.subtitulo}`);
  }
  if (linea.notas) {
    p.println(`   >> ${linea.notas}`);
  }
  for (const extra of linea.extras.filter((e) => e.activo)) {
    p.println(`   + ${extra.cantidad} x ${extra.titulo}`);
  }
}

function comanda(titulo: string, datos: DatosComanda): Buffer {
  const p = crearImpresora();
  encabezadoComanda(p, titulo, datos);
  for (const linea of datos.lineas) {
    lineaComanda(p, linea);
  }
  p.drawLine();
  p.cut();
  return p.getBuffer();
}

/** Comanda de cocina: solo líneas de comida (con notas y mitades). */
export function comandaCocina(datos: DatosComanda): Buffer {
  return comanda("COCINA", datos);
}

/** Comanda de barra: solo bebidas. */
export function comandaBarra(datos: DatosComanda): Buffer {
  return comanda("BARRA", datos);
}

function encabezadoTicket(p: ThermalPrinter, datos: DatosTicket) {
  const { venta, sucursal } = datos;
  p.alignCenter();
  p.setTextDoubleHeight();
  p.bold(true);
  p.println("Pizzeria Barbosa");
  p.setTextNormal();
  p.println(sucursal.nombre);
  p.bold(false);
  p.println(sucursal.direccion);
  p.println(`Tel. ${sucursal.telefono}`);
  p.newLine();
  p.alignLeft();
  p.leftRight(`Folio #${venta.folio}`, formatoFecha(venta.createdAt));
  if (venta.codigo) {
    // El cliente lo dicta en aclaraciones: alfabeto sin caracteres ambiguos
    p.println(`Codigo de aclaracion: ${formatoCodigo(venta.codigo)}`);
  }
  if (venta.canal === "DOMICILIO") {
    p.println(
      `Cliente: ${venta.cliente ? `${venta.cliente.nombre} · ${venta.cliente.telefono}` : "—"}`
    );
    if (venta.direccion) {
      p.println(`Entrega: ${venta.direccion}`);
    }
  } else {
    p.println(venta.mesa ? `Mesa ${venta.mesa}` : "Mostrador");
  }
  p.println(`Atendió: ${venta.capturadaPor}`);
  p.drawLine();
}

function cuerpoCuenta(p: ThermalPrinter, datos: DatosTicket) {
  const { venta } = datos;
  // Lo más reciente primero (las líneas llegan por fecha de ingreso asc)
  const activas = venta.lineas.filter((l) => l.activo).reverse();
  for (const linea of activas) {
    const importe = Number(linea.precioUnitario) * linea.cantidad;
    p.leftRight(
      `${linea.cantidad} x ${linea.titulo}`,
      formatoMoneda(importe.toFixed(2))
    );
    if (linea.subtitulo) {
      p.println(`   ${linea.subtitulo}`);
    }
    if (linea.notas) {
      p.println(`   ${linea.notas}`);
    }
    for (const extra of linea.extras.filter((e) => e.activo)) {
      const importeExtra = Number(extra.precioUnitario) * extra.cantidad;
      p.leftRight(
        `   + ${extra.cantidad} x ${extra.titulo}`,
        formatoMoneda(importeExtra.toFixed(2))
      );
    }
  }
  p.drawLine();
  p.bold(true);
  p.setTextDoubleHeight();
  p.leftRight("TOTAL", formatoMoneda(venta.total));
  p.setTextNormal();
  p.bold(false);
}

function pieTicket(p: ThermalPrinter, leyendaPie: string | null) {
  p.newLine();
  p.alignCenter();
  p.println(leyendaPie || "¡Gracias por su compra!");
  p.cut();
}

/** Ticket de cuenta: líneas activas y total, sin datos de pago. */
export function ticketCuenta(datos: DatosTicket): Buffer {
  const p = crearImpresora();
  encabezadoTicket(p, datos);
  cuerpoCuenta(p, datos);
  pieTicket(p, datos.leyendaPie);
  return p.getBuffer();
}

/** Ticket de prueba del botón "Imprimir prueba" de /configuracion. */
export function ticketPrueba(datos: {
  sucursal: string;
  impresora: string;
  fecha: Date;
}): Buffer {
  const p = crearImpresora();
  p.alignCenter();
  p.setTextDoubleHeight();
  p.bold(true);
  p.println("PRUEBA DE IMPRESION");
  p.setTextNormal();
  p.bold(false);
  p.println(datos.sucursal);
  p.println(`Impresora: ${datos.impresora}`);
  p.println(formatoFecha(datos.fecha));
  p.drawLine();
  p.println("áéíóúñ ÁÉÍÓÚÑ ¿? ¡! $1,234.50");
  p.cut();
  return p.getBuffer();
}

/** Ticket de cobro: cuenta + pagó con / cambio (y pago anticipado a domicilio). */
export function ticketCobro(datos: DatosTicket): Buffer {
  const { venta } = datos;
  const p = crearImpresora();
  encabezadoTicket(p, datos);
  cuerpoCuenta(p, datos);
  p.leftRight(
    venta.metodoPago === "TRANSFERENCIA" ? "Transferencia" : "Pagó con",
    formatoMoneda(venta.montoPagado ?? venta.total)
  );
  p.leftRight("Cambio", formatoMoneda(venta.cambio ?? "0"));
  if (venta.metodoPago === "TRANSFERENCIA" && !venta.transferenciaValidada) {
    p.alignCenter();
    p.bold(true);
    p.println("TRANSFERENCIA POR VALIDAR");
    p.bold(false);
  }
  if (venta.canal === "DOMICILIO" && venta.pagaCon) {
    p.alignLeft();
    p.leftRight("Paga con (anticipado)", formatoMoneda(venta.pagaCon));
  }
  pieTicket(p, datos.leyendaPie);
  return p.getBuffer();
}
