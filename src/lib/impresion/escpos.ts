import net from "node:net";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CharacterSet, PrinterTypes, ThermalPrinter } from "node-thermal-printer";

const PUERTO_ESCPOS = 9100;
const TIMEOUT_MS = 5000;

/** Modo de envío por impresora (ConfiguracionSucursal): red directa o share. */
export type ModoImpresora = "tcp" | "share";

/**
 * Impresora en memoria para armar el buffer ESC/POS (las plantillas de
 * tickets.ts escriben aquí). El envío real lo hace enviarBuffer.
 */
export function crearImpresora(): ThermalPrinter {
  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: "buffer", // nunca se ejecuta: solo getBuffer()
    characterSet: CharacterSet.PC858_EURO, // acentos es-MX
    width: 48, // papel de 80 mm
  });
}

/** Envía por TCP crudo al puerto 9100 (ruta "192.168.1.50" o "host:puerto"). */
function enviarTcp(ruta: string, buffer: Buffer): Promise<void> {
  const [host, puertoTexto] = ruta.split(":");
  const puerto = puertoTexto ? Number(puertoTexto) : PUERTO_ESCPOS;

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: puerto });
    const fallar = (mensaje: string) => {
      socket.destroy();
      reject(new Error(mensaje));
    };
    socket.setTimeout(TIMEOUT_MS, () =>
      fallar(`La impresora ${ruta} no respondió a tiempo.`)
    );
    socket.on("error", () => fallar(`No se pudo conectar con la impresora ${ruta}.`));
    socket.on("close", (conError) => {
      if (!conError) resolve();
    });
    socket.on("connect", () => {
      socket.end(buffer);
    });
  });
}

/**
 * Fallback Windows: la impresora está compartida (\\EQUIPO\Nombre); se copia
 * el buffer en binario directo al UNC path (sin invocar una shell).
 */
async function enviarShare(ruta: string, buffer: Buffer): Promise<void> {
  const carpeta = await mkdtemp(path.join(tmpdir(), "ticket-"));
  const archivo = path.join(carpeta, "ticket.bin");
  try {
    await writeFile(archivo, buffer);
    await copyFile(archivo, ruta);
  } catch {
    throw new Error(`No se pudo imprimir en el recurso compartido ${ruta}.`);
  } finally {
    await rm(carpeta, { recursive: true, force: true });
  }
}

/** Envía un buffer ESC/POS ya armado a la impresora indicada. */
export async function enviarBuffer(
  modo: string,
  ruta: string,
  buffer: Buffer
): Promise<void> {
  if (modo === "share") {
    return enviarShare(ruta, buffer);
  }
  return enviarTcp(ruta, buffer);
}
