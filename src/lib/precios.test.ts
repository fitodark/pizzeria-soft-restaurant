import { describe, expect, it } from "vitest";
import { promocionesVigentes, promocionVigente, type PromocionVigencia } from "./precios";
import { CanalVenta, TipoPromocion } from "@/generated/prisma/enums";

/** Base: promo válida en establecimiento, sin restricciones temporales. */
function promo(extra: Partial<PromocionVigencia> = {}): PromocionVigencia {
  return {
    activa: true,
    tipo: TipoPromocion.PROMOCION,
    ventaDomicilio: false,
    ventaEstablecimiento: true,
    fechaInicio: null,
    fechaFin: null,
    diasSemana: [],
    ...extra,
  };
}

// Martes 7 de julio de 2026, 13:30 hora local
const MARTES = new Date(2026, 6, 7, 13, 30);
// Domingo 12 de julio de 2026
const DOMINGO = new Date(2026, 6, 12, 13, 30);

describe("promocionVigente — canal", () => {
  it("rechaza promoción inactiva", () => {
    expect(promocionVigente(promo({ activa: false }), MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(false);
  });

  it("respeta la bandera de canal establecimiento", () => {
    const p = promo({ ventaEstablecimiento: false, ventaDomicilio: true });
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(false);
    expect(promocionVigente(p, MARTES, CanalVenta.DOMICILIO)).toBe(true);
  });

  it("respeta la bandera de canal domicilio", () => {
    const p = promo(); // solo establecimiento
    expect(promocionVigente(p, MARTES, CanalVenta.DOMICILIO)).toBe(false);
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(true);
  });
});

describe("promocionVigente — PAQUETE", () => {
  it("se vende todos los días, ignorando fechas y días de semana", () => {
    const p = promo({
      tipo: TipoPromocion.PAQUETE,
      // Aunque tuviera restricciones capturadas, PAQUETE las ignora
      diasSemana: [3],
      fechaInicio: new Date("2020-01-01"),
      fechaFin: new Date("2020-01-31"),
    });
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(true);
    expect(promocionVigente(p, DOMINGO, CanalVenta.ESTABLECIMIENTO)).toBe(true);
  });

  it("aún así respeta canal y bandera activa", () => {
    expect(
      promocionVigente(
        promo({ tipo: TipoPromocion.PAQUETE, activa: false }),
        MARTES,
        CanalVenta.ESTABLECIMIENTO
      )
    ).toBe(false);
    expect(
      promocionVigente(
        promo({ tipo: TipoPromocion.PAQUETE }),
        MARTES,
        CanalVenta.DOMICILIO
      )
    ).toBe(false);
  });
});

describe("promocionVigente — días de la semana", () => {
  it("aplica solo el día configurado (martes = 2)", () => {
    const p = promo({ diasSemana: [2] });
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(true);
    expect(promocionVigente(p, DOMINGO, CanalVenta.ESTABLECIMIENTO)).toBe(false);
  });

  it("días vacíos significa todos los días", () => {
    expect(promocionVigente(promo(), DOMINGO, CanalVenta.ESTABLECIMIENTO)).toBe(true);
  });

  it("acepta varios días", () => {
    const p = promo({ diasSemana: [0, 2] }); // domingo y martes
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(true);
    expect(promocionVigente(p, DOMINGO, CanalVenta.ESTABLECIMIENTO)).toBe(true);
  });

  it("DOS_POR_UNO usa las mismas reglas de vigencia", () => {
    const p = promo({ tipo: TipoPromocion.DOS_POR_UNO, diasSemana: [2] });
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(true);
    expect(promocionVigente(p, DOMINGO, CanalVenta.ESTABLECIMIENTO)).toBe(false);
  });
});

describe("promocionVigente — temporada (fechas @db.Date en UTC)", () => {
  // Prisma devuelve @db.Date como medianoche UTC: así se construyen aquí.
  const inicioJulio = new Date("2026-07-01T00:00:00.000Z");
  const finJulio = new Date("2026-07-31T00:00:00.000Z");

  it("dentro del rango aplica", () => {
    const p = promo({ fechaInicio: inicioJulio, fechaFin: finJulio });
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(true);
  });

  it("antes del inicio no aplica", () => {
    const p = promo({ fechaInicio: new Date("2026-07-10T00:00:00.000Z") });
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(false);
  });

  it("después del fin no aplica", () => {
    const p = promo({ fechaFin: new Date("2026-07-06T00:00:00.000Z") });
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(false);
  });

  it("el día exacto de inicio y de fin SÍ aplican (rango inclusivo)", () => {
    const p = promo({
      fechaInicio: new Date("2026-07-07T00:00:00.000Z"),
      fechaFin: new Date("2026-07-07T00:00:00.000Z"),
    });
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(true);
  });

  it("sin fecha fin = sin límite superior", () => {
    const p = promo({ fechaInicio: inicioJulio });
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(true);
  });

  it("no se corre de día en zonas horarias negativas (UTC-6)", () => {
    // La medianoche UTC del 7 de julio es 6pm del 6 de julio en CDMX;
    // la comparación por texto ISO evita que el rango se recorra.
    const p = promo({
      fechaInicio: new Date("2026-07-07T00:00:00.000Z"),
      fechaFin: new Date("2026-07-07T00:00:00.000Z"),
    });
    const martesTemprano = new Date(2026, 6, 7, 0, 5); // 00:05 local
    const martesTarde = new Date(2026, 6, 7, 23, 55); // 23:55 local
    expect(promocionVigente(p, martesTemprano, CanalVenta.ESTABLECIMIENTO)).toBe(true);
    expect(promocionVigente(p, martesTarde, CanalVenta.ESTABLECIMIENTO)).toBe(true);
  });

  it("combina temporada con día de la semana", () => {
    const p = promo({
      diasSemana: [2],
      fechaInicio: inicioJulio,
      fechaFin: finJulio,
    });
    expect(promocionVigente(p, MARTES, CanalVenta.ESTABLECIMIENTO)).toBe(true);
    expect(promocionVigente(p, DOMINGO, CanalVenta.ESTABLECIMIENTO)).toBe(false);
  });
});

describe("promocionesVigentes", () => {
  it("filtra la lista conservando solo las vigentes para el canal", () => {
    const martes2x1 = promo({ tipo: TipoPromocion.DOS_POR_UNO, diasSemana: [2] });
    const paquete = promo({ tipo: TipoPromocion.PAQUETE, ventaDomicilio: true });
    const inactiva = promo({ activa: false });
    const soloDomicilio = promo({
      ventaEstablecimiento: false,
      ventaDomicilio: true,
    });

    const enMartes = promocionesVigentes(
      [martes2x1, paquete, inactiva, soloDomicilio],
      MARTES,
      CanalVenta.ESTABLECIMIENTO
    );
    expect(enMartes).toEqual([martes2x1, paquete]);

    const domingoDomicilio = promocionesVigentes(
      [martes2x1, paquete, inactiva, soloDomicilio],
      DOMINGO,
      CanalVenta.DOMICILIO
    );
    expect(domingoDomicilio).toEqual([paquete, soloDomicilio]);
  });
});
