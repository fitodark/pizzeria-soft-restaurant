import { describe, expect, it } from "vitest";
import {
  aplanarLineas,
  calcularCambio,
  calcularLineas,
  type LineaEntrada,
  type ProductoCatalogo,
  type PromocionCatalogo,
  totalVenta,
} from "./precios";
import { Prisma } from "@/generated/prisma/client";
import {
  CanalVenta,
  RolPromoProducto,
  TipoArticulo,
  TipoProducto,
  TipoPromocion,
} from "@/generated/prisma/enums";

const D = (v: string | number) => new Prisma.Decimal(v);

// Martes 7 de julio de 2026 / domingo 12 de julio de 2026 (hora local)
const MARTES = new Date(2026, 6, 7, 13, 30);
const DOMINGO = new Date(2026, 6, 12, 13, 30);

function producto(
  id: string,
  nombre: string,
  extra: Partial<ProductoCatalogo> = {}
): ProductoCatalogo {
  return {
    id,
    nombre,
    tipo: TipoProducto.COMIDA,
    tipoArticulo: TipoArticulo.VENTA,
    categoria: "comida",
    activo: true,
    ventaDomicilio: true,
    ventaEstablecimiento: true,
    esEspecialidad: false,
    permiteExtrasNotas: true,
    variantes: [],
    ...extra,
  };
}

const hawaiana = producto("hawaiana", "Pizza Hawaiana", {
  esEspecialidad: true,
  variantes: [
    { id: "haw-ch", tamano: "chica", precio: D(99), maxSabores: 1, activa: true },
    { id: "haw-gr", tamano: "grande", precio: D(179), maxSabores: 1, activa: true },
  ],
});

const barbosa = producto("barbosa", "Pizza Barbosa", {
  esEspecialidad: true,
  variantes: [
    { id: "bar-ch", tamano: "chica", precio: D(125), maxSabores: 1, activa: true },
    { id: "bar-gr", tamano: "grande", precio: D(215), maxSabores: 1, activa: true },
  ],
});

const coca = producto("coca", "Coca-Cola", {
  tipo: TipoProducto.BEBIDA,
  ventaDomicilio: false, // solo establecimiento (para probar canal)
  permiteExtrasNotas: false,
  variantes: [{ id: "coca-un", tamano: "unico", precio: D(25), maxSabores: 1, activa: true }],
});

const queso = producto("queso", "Queso extra", {
  tipoArticulo: TipoArticulo.EXTRA,
  permiteExtrasNotas: false,
  variantes: [
    { id: "queso-un", tamano: "unico", precio: D("25.50"), maxSabores: 1, activa: true },
  ],
});

const hamburguesa = producto("hamb", "Hamburguesa", {
  permiteExtrasNotas: false,
  variantes: [{ id: "hamb-un", tamano: "unico", precio: D(80), maxSabores: 1, activa: true }],
});

// Sabores de alitas: precio fijo por orden; max_sabores limita la combinación
const ordenesAlitas = (prefijo: string) => [
  { id: `${prefijo}-7`, tamano: "7 pzas", precio: D(110), maxSabores: 1, activa: true },
  { id: `${prefijo}-10`, tamano: "10 pzas", precio: D(150), maxSabores: 2, activa: true },
  { id: `${prefijo}-20`, tamano: "20 pzas", precio: D(290), maxSabores: 3, activa: true },
];

const alitasBbq = producto("bbq", "Alitas BBQ", {
  categoria: "alitas",
  variantes: ordenesAlitas("bbq"),
});
const alitasBufalo = producto("bufalo", "Alitas Búfalo", {
  categoria: "alitas",
  variantes: ordenesAlitas("bufalo"),
});
const alitasHabanero = producto("habanero", "Alitas Habanero", {
  categoria: "alitas",
  variantes: ordenesAlitas("habanero"),
});

function promoCatalogo(
  extra: Partial<PromocionCatalogo> = {}
): PromocionCatalogo {
  return {
    id: "promo",
    nombre: "Promo",
    tipo: TipoPromocion.PAQUETE,
    precioEspecial: D(199),
    activa: true,
    ventaDomicilio: true,
    ventaEstablecimiento: true,
    fechaInicio: null,
    fechaFin: null,
    diasSemana: [],
    productos: [],
    ...extra,
  };
}

const dosPorUno = promoCatalogo({
  id: "2x1",
  nombre: "2x1 Martes",
  tipo: TipoPromocion.DOS_POR_UNO,
  precioEspecial: null,
  diasSemana: [2],
  productos: [
    {
      rol: RolPromoProducto.REQUERIDO,
      productoId: null,
      varianteId: null,
      cantidad: 1,
    },
    {
      rol: RolPromoProducto.REGALO,
      productoId: null,
      varianteId: null,
      cantidad: 1,
    },
  ],
});

const catalogo = {
  productos: new Map(
    [
      hawaiana,
      barbosa,
      coca,
      queso,
      hamburguesa,
      alitasBbq,
      alitasBufalo,
      alitasHabanero,
    ].map((p) => [p.id, p])
  ),
  promociones: new Map([
    ["promo", promoCatalogo()],
    ["2x1", dosPorUno],
  ]),
};

const EST = CanalVenta.ESTABLECIMIENTO;
const DOM = CanalVenta.DOMICILIO;

function calcular(entradas: LineaEntrada[], canal = EST, fecha = MARTES) {
  return calcularLineas(entradas, catalogo, canal, fecha);
}

describe("calcularLineas — producto normal (regla 1)", () => {
  it("usa el precio de la variante elegida", () => {
    const [linea] = calcular([
      {
        tipoLinea: "PRODUCTO",
        productoId: "hawaiana",
        varianteId: "haw-gr",
        cantidad: 2,
      },
    ]);
    expect(linea.precioUnitario.toString()).toBe("179");
    expect(linea.cantidad).toBe(2);
  });

  it("rechaza un extra vendido solo", () => {
    expect(() =>
      calcular([
        {
          tipoLinea: "PRODUCTO",
          productoId: "queso",
          varianteId: "queso-un",
          cantidad: 1,
        },
      ])
    ).toThrow(/no se vende solo/);
  });

  it("rechaza producto fuera de su canal (regla 7)", () => {
    expect(() =>
      calcular(
        [
          {
            tipoLinea: "PRODUCTO",
            productoId: "coca",
            varianteId: "coca-un",
            cantidad: 1,
          },
        ],
        DOM
      )
    ).toThrow(/no está disponible en este canal/);
  });
});

describe("calcularLineas — pizza personalizada (regla 2)", () => {
  it("cobra la mitad más cara, en ambos órdenes", () => {
    const orden1 = calcular([
      {
        tipoLinea: "PIZZA_PERSONALIZADA",
        tamano: "grande",
        mitad1ProductoId: "hawaiana",
        mitad2ProductoId: "barbosa",
        cantidad: 1,
      },
    ]);
    const orden2 = calcular([
      {
        tipoLinea: "PIZZA_PERSONALIZADA",
        tamano: "grande",
        mitad1ProductoId: "barbosa",
        mitad2ProductoId: "hawaiana",
        cantidad: 1,
      },
    ]);
    expect(orden1[0].precioUnitario.toString()).toBe("215");
    expect(orden2[0].precioUnitario.toString()).toBe("215");
    expect(orden1[0].varianteId).toBe("bar-gr");
    expect(orden1[0].mitades).toEqual([
      { mitad: 1, productoId: "hawaiana" },
      { mitad: 2, productoId: "barbosa" },
    ]);
  });

  it("rechaza mitades que no son especialidad", () => {
    expect(() =>
      calcular([
        {
          tipoLinea: "PIZZA_PERSONALIZADA",
          tamano: "unico",
          mitad1ProductoId: "hamb",
          mitad2ProductoId: "hawaiana",
          cantidad: 1,
        },
      ])
    ).toThrow(/no es especialidad/);
  });

  it("rechaza tamaño sin variante en alguna mitad", () => {
    expect(() =>
      calcular([
        {
          tipoLinea: "PIZZA_PERSONALIZADA",
          tamano: "mediana",
          mitad1ProductoId: "hawaiana",
          mitad2ProductoId: "barbosa",
          cantidad: 1,
        },
      ])
    ).toThrow(/no tiene tamaño mediana/);
  });
});

describe("calcularLineas — alitas personalizadas", () => {
  it("orden de 10 con 2 sabores: precio fijo de la orden y una porción por sabor", () => {
    const [linea] = calcular([
      {
        tipoLinea: "ALITAS_PERSONALIZADAS",
        tamano: "10 pzas",
        saboresProductoIds: ["bbq", "bufalo"],
        cantidad: 1,
      },
    ]);
    expect(linea.tipoLinea).toBe("ALITAS_PERSONALIZADAS");
    expect(linea.precioUnitario.toString()).toBe("150");
    expect(linea.productoId).toBeNull();
    expect(linea.mitades).toEqual([
      { mitad: 1, productoId: "bbq" },
      { mitad: 2, productoId: "bufalo" },
    ]);
  });

  it("orden de 20 con 3 sabores", () => {
    const [linea] = calcular([
      {
        tipoLinea: "ALITAS_PERSONALIZADAS",
        tamano: "20 pzas",
        saboresProductoIds: ["bbq", "bufalo", "habanero"],
        cantidad: 2,
      },
    ]);
    expect(linea.precioUnitario.toString()).toBe("290");
    expect(linea.mitades).toHaveLength(3);
  });

  it("rechaza 3 sabores en la orden de 10 (max_sabores = 2)", () => {
    expect(() =>
      calcular([
        {
          tipoLinea: "ALITAS_PERSONALIZADAS",
          tamano: "10 pzas",
          saboresProductoIds: ["bbq", "bufalo", "habanero"],
          cantidad: 1,
        },
      ])
    ).toThrow(/admite máximo 2 sabores/);
  });

  it("rechaza combinar la orden de 7 (un solo sabor)", () => {
    expect(() =>
      calcular([
        {
          tipoLinea: "ALITAS_PERSONALIZADAS",
          tamano: "7 pzas",
          saboresProductoIds: ["bbq", "bufalo"],
          cantidad: 1,
        },
      ])
    ).toThrow(/un solo sabor/);
  });

  it("rechaza sabores repetidos", () => {
    expect(() =>
      calcular([
        {
          tipoLinea: "ALITAS_PERSONALIZADAS",
          tamano: "10 pzas",
          saboresProductoIds: ["bbq", "bbq"],
          cantidad: 1,
        },
      ])
    ).toThrow(/deben ser distintos/);
  });

  it("rechaza productos que no son de alitas (aunque sean especialidad)", () => {
    expect(() =>
      calcular([
        {
          tipoLinea: "ALITAS_PERSONALIZADAS",
          tamano: "10 pzas",
          saboresProductoIds: ["bbq", "hawaiana"],
          cantidad: 1,
        },
      ])
    ).toThrow(/no es un sabor de alitas/);
  });

  it("suma aderezos como extras y el total incluye la orden combinada", () => {
    const lineas = calcular([
      {
        tipoLinea: "ALITAS_PERSONALIZADAS",
        tamano: "10 pzas",
        saboresProductoIds: ["bbq", "habanero"],
        cantidad: 1,
        extras: [{ productoId: "queso", cantidad: 1 }],
      },
    ]);
    expect(lineas[0].extras).toHaveLength(1);
    const total = totalVenta(
      aplanarLineas(lineas).map((l) => ({ ...l, activo: true }))
    );
    expect(total.toString()).toBe("175.5");
  });
});

describe("calcularLineas — extras y notas (regla 3)", () => {
  it("cada extra suma su precio 'unico' como línea hija", () => {
    const [linea] = calcular([
      {
        tipoLinea: "PRODUCTO",
        productoId: "hawaiana",
        varianteId: "haw-ch",
        cantidad: 1,
        notas: "sin piña",
        extras: [{ productoId: "queso", cantidad: 2 }],
      },
    ]);
    expect(linea.extras).toHaveLength(1);
    expect(linea.extras[0].precioUnitario.toString()).toBe("25.5");
    expect(linea.extras[0].cantidad).toBe(2);
    // Quitar ingredientes NO descuenta: la nota no altera el precio
    expect(linea.precioUnitario.toString()).toBe("99");
    expect(linea.notas).toBe("sin piña");
  });

  it("rechaza extras o notas en productos que no los permiten", () => {
    expect(() =>
      calcular([
        {
          tipoLinea: "PRODUCTO",
          productoId: "hamb",
          varianteId: "hamb-un",
          cantidad: 1,
          extras: [{ productoId: "queso", cantidad: 1 }],
        },
      ])
    ).toThrow(/no permite extras ni notas/);
    expect(() =>
      calcular([
        {
          tipoLinea: "PRODUCTO",
          productoId: "hamb",
          varianteId: "hamb-un",
          cantidad: 1,
          notas: "sin cebolla",
        },
      ])
    ).toThrow(/no permite extras ni notas/);
  });

  it("rechaza usar un producto normal como extra", () => {
    expect(() =>
      calcular([
        {
          tipoLinea: "PRODUCTO",
          productoId: "hawaiana",
          varianteId: "haw-ch",
          cantidad: 1,
          extras: [{ productoId: "coca", cantidad: 1 }],
        },
      ])
    ).toThrow(/no es un extra/);
  });
});

describe("calcularLineas — promociones y paquetes (regla 4)", () => {
  it("el paquete cobra su precio especial", () => {
    const lineas = calcular([
      { tipoLinea: "PROMOCION", promocionId: "promo", cantidad: 1 },
    ]);
    expect(lineas).toHaveLength(1);
    expect(lineas[0].precioUnitario.toString()).toBe("199");
    expect(lineas[0].promocionId).toBe("promo");
  });

  it("rechaza una promoción no vigente ese día", () => {
    expect(() =>
      calcular(
        [
          {
            tipoLinea: "PROMOCION",
            promocionId: "2x1",
            cantidad: 1,
            compraProductoId: "hawaiana",
            compraVarianteId: "haw-gr",
            regaloProductoId: "barbosa",
            regaloVarianteId: "bar-gr",
          },
        ],
        EST,
        DOMINGO // el 2x1 es solo martes
      )
    ).toThrow(/no está vigente/);
  });
});

describe("calcularLineas — 2x1 (regla 5)", () => {
  const entrada2x1: LineaEntrada = {
    tipoLinea: "PROMOCION",
    promocionId: "2x1",
    cantidad: 1,
    compraProductoId: "hawaiana",
    compraVarianteId: "haw-gr",
    regaloProductoId: "barbosa",
    regaloVarianteId: "bar-gr",
  };

  it("cobra la pizza comprada y el regalo entra a $0", () => {
    const lineas = calcular([entrada2x1]);
    expect(lineas).toHaveLength(2);
    expect(lineas[0].precioUnitario.toString()).toBe("179");
    expect(lineas[1].precioUnitario.toString()).toBe("0");
    expect(lineas[1].productoId).toBe("barbosa");
    expect(lineas[0].promocionId).toBe("2x1");
    expect(lineas[1].promocionId).toBe("2x1");
  });

  it("rechaza regalo que no es especialidad cuando la regla es libre", () => {
    expect(() =>
      calcular([
        {
          ...entrada2x1,
          regaloProductoId: "hamb",
          regaloVarianteId: "hamb-un",
        },
      ])
    ).toThrow(/debe ser una especialidad/);
  });

  it("exige compra y regalo completos", () => {
    expect(() =>
      calcular([{ tipoLinea: "PROMOCION", promocionId: "2x1", cantidad: 1 }])
    ).toThrow(/requiere la pizza comprada y la de regalo/);
  });
});

describe("totalVenta (regla 6) y cambio", () => {
  it("suma solo líneas activas, incluyendo extras", () => {
    const lineas = calcular([
      {
        tipoLinea: "PRODUCTO",
        productoId: "hawaiana",
        varianteId: "haw-ch",
        cantidad: 1,
        extras: [{ productoId: "queso", cantidad: 1 }],
      },
      {
        tipoLinea: "PRODUCTO",
        productoId: "coca",
        varianteId: "coca-un",
        cantidad: 2,
      },
    ]);
    const planas = aplanarLineas(lineas).map((l) => ({ ...l, activo: true }));
    // 99 + 25.50 + (2 × 25) = 174.50
    expect(totalVenta(planas).toString()).toBe("174.5");

    // Inactivar la coca la excluye del total
    planas[2].activo = false;
    expect(totalVenta(planas).toString()).toBe("124.5");
  });

  it("calcula el cambio y rechaza pagos insuficientes", () => {
    expect(calcularCambio(D("174.50"), D(200)).toString()).toBe("25.5");
    expect(calcularCambio(D(100), D(100)).toString()).toBe("0");
    expect(() => calcularCambio(D(100), D(99))).toThrow(/no cubre el total/);
  });
});
