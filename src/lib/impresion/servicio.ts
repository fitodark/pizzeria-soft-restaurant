import { db } from "@/lib/db";
import { enviarBuffer } from "@/lib/impresion/escpos";
import {
  comandaBarra,
  comandaCocina,
  ticketCobro,
  ticketCuenta,
  type DatosComanda,
} from "@/lib/impresion/tickets";
import { ventaConDetalles, type VentaDTO } from "@/lib/consultas/ventas";

/**
 * Orquestación de impresión (blueprint Step 11). NUNCA lanza: la venta ya
 * está guardada cuando se llega aquí; un fallo de impresora se reporta como
 * aviso en español para que la UI ofrezca "Reimprimir".
 */

export type TipoImpresion = "comandas" | "cuenta" | "cobro";

type Contexto = {
  venta: VentaDTO;
  sucursal: { nombre: string; direccion: string; telefono: string };
  config: {
    impresoraPrincipalModo: string;
    impresoraPrincipalRuta: string;
    impresoraCocinaModo: string;
    impresoraCocinaRuta: string;
    impresoraBebidasModo: string;
    impresoraBebidasRuta: string;
    leyendaPie: string | null;
  } | null;
};

async function cargarContexto(ventaId: string): Promise<Contexto | null> {
  const referencia = await db.venta.findUnique({
    where: { id: ventaId },
    select: { sucursalId: true },
  });
  if (!referencia) return null;

  const [venta, sucursal, config] = await Promise.all([
    ventaConDetalles(ventaId, referencia.sucursalId, false),
    db.sucursal.findUnique({ where: { id: referencia.sucursalId } }),
    db.configuracionSucursal.findUnique({
      where: { sucursalId: referencia.sucursalId },
    }),
  ]);
  if (!venta || !sucursal) return null;

  return {
    venta,
    sucursal: {
      nombre: sucursal.nombre,
      direccion: `${sucursal.calle}, ${sucursal.colonia}, ${sucursal.ciudad}`,
      telefono: sucursal.telefono,
    },
    config,
  };
}

const SIN_CONFIG =
  "La sucursal no tiene impresoras configuradas; captúralas en Configuración.";

async function enviarSeguro(
  destino: string,
  modo: string,
  ruta: string,
  buffer: Buffer
): Promise<string | null> {
  try {
    await enviarBuffer(modo, ruta, buffer);
    return null;
  } catch (e) {
    const detalle = e instanceof Error ? e.message : "error desconocido";
    return `${destino}: ${detalle}`;
  }
}

/**
 * Comandas de cocina y barra. `soloDetalleIds` limita a lo recién agregado
 * (agregarLineas imprime únicamente lo nuevo).
 */
export async function imprimirComandas(
  ventaId: string,
  soloDetalleIds?: string[]
): Promise<string[]> {
  const contexto = await cargarContexto(ventaId);
  if (!contexto) return ["No se encontró la venta para imprimir comandas."];
  if (!contexto.config) return [SIN_CONFIG];
  const { venta, config } = contexto;

  const lineas = venta.lineas.filter(
    (l) => !soloDetalleIds || soloDetalleIds.includes(l.id)
  );
  const base: Omit<DatosComanda, "lineas"> = {
    folio: venta.folio,
    canal: venta.canal,
    mesa: venta.mesa,
    cliente: venta.cliente?.nombre ?? null,
    fecha: new Date(),
  };
  const deCocina = lineas.filter((l) => l.tipoProducto !== "BEBIDA");
  const deBarra = lineas.filter((l) => l.tipoProducto === "BEBIDA");

  const avisos: string[] = [];
  if (deCocina.length > 0) {
    const aviso = await enviarSeguro(
      "Comanda de cocina",
      config.impresoraCocinaModo,
      config.impresoraCocinaRuta,
      comandaCocina({ ...base, lineas: deCocina })
    );
    if (aviso) avisos.push(aviso);
  }
  if (deBarra.length > 0) {
    const aviso = await enviarSeguro(
      "Comanda de barra",
      config.impresoraBebidasModo,
      config.impresoraBebidasRuta,
      comandaBarra({ ...base, lineas: deBarra })
    );
    if (aviso) avisos.push(aviso);
  }
  return avisos;
}

/** Ticket de cuenta o de cobro en la impresora principal. */
export async function imprimirTicket(
  ventaId: string,
  tipo: "cuenta" | "cobro"
): Promise<string[]> {
  const contexto = await cargarContexto(ventaId);
  if (!contexto) return ["No se encontró la venta para imprimir el ticket."];
  if (!contexto.config) return [SIN_CONFIG];
  const { venta, sucursal, config } = contexto;

  const datos = { venta, sucursal, leyendaPie: config.leyendaPie };
  const buffer = tipo === "cobro" ? ticketCobro(datos) : ticketCuenta(datos);
  const aviso = await enviarSeguro(
    tipo === "cobro" ? "Ticket de cobro" : "Ticket de cuenta",
    config.impresoraPrincipalModo,
    config.impresoraPrincipalRuta,
    buffer
  );
  return aviso ? [aviso] : [];
}

/** Reimpresión desde /api/impresion. */
export async function reimprimir(
  ventaId: string,
  tipo: TipoImpresion
): Promise<string[]> {
  if (tipo === "comandas") return imprimirComandas(ventaId);
  return imprimirTicket(ventaId, tipo);
}
