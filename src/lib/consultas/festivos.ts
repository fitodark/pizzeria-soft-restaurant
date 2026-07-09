import { db } from "@/lib/db";
import { fechaLocalTexto } from "@/lib/precios";

/**
 * ¿La fecha operativa (reloj local de la sucursal) es día festivo?
 * Las fechas @db.Date se guardan como medianoche UTC (igual que las
 * temporadas de promociones), por eso la igualdad se arma desde el texto
 * local "yyyy-MM-dd".
 */
export async function esDiaFestivo(fecha: Date): Promise<boolean> {
  const festivo = await db.diaFestivo.findUnique({
    where: { fecha: new Date(`${fechaLocalTexto(fecha)}T00:00:00.000Z`) },
    select: { id: true },
  });
  return festivo !== null;
}

export type DiaFestivoDTO = {
  id: string;
  /** "yyyy-MM-dd" */
  fecha: string;
  descripcion: string;
};

/** Catálogo completo de festivos, próximos primero (para el CRUD). */
export async function listaDiasFestivos(): Promise<DiaFestivoDTO[]> {
  const festivos = await db.diaFestivo.findMany({ orderBy: { fecha: "asc" } });
  return festivos.map((f) => ({
    id: f.id,
    fecha: f.fecha.toISOString().slice(0, 10),
    descripcion: f.descripcion,
  }));
}
