/**
 * Limpieza de datos demo + carga del menú real (knowledge/menu barbosa.xlsx).
 *
 * Ejecutar:  npx tsx --env-file=.env scripts/cargar-menu.ts
 *
 * Borra TODO lo operativo (ventas, cortes, compras, movimientos) y el catálogo
 * demo, conservando: sucursales, usuarios, clientes, configuración, días
 * festivos, refrescos embotellados, extras existentes (queso/aderezos) y los
 * sabores de alitas ya cargados. Luego inserta el menú real. Es idempotente:
 * los productos/promociones se buscan por nombre y solo se crean si faltan.
 *
 * Decisiones aplicadas (ver knowledge/menu-normalizado.md):
 * - D2: las 3 vegetarianas llevan nombre descriptivo.
 * - D4: especialidades + pollo + vegetarianas son `es_especialidad`
 *   (mitades de pizza personalizada); Rellena, Calzone y Stromboli no.
 * - D5: sabores de precio único = variantes del producto (tamano = sabor).
 * - D6: orilla/deditos de queso como extras por tamaño (el cajero elige el
 *   del tamaño de la pizza) — interino hasta implementar herencia de tamaño.
 * - Burrito de Costilla BBQ: variantes combinadas tamaño × salsa (6).
 * - Paquetes: tipo PAQUETE, L-V, sin festivos, solo sucursal; composición
 *   con "paquete con elección": componentes fijos (por nombre) y libres
 *   (por categoría, tamaño fijo). El "refresco chico" de los paquetes 1-5
 *   es elección libre entre los embotellados (categoría "refresco"); el
 *   familiar 1.5L vive en su propia categoría para no aparecer ahí.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: process.env.DATABASE_URL },
    { schema: "schema_barbosa_v2" }
  ),
});

// ── Tipos de captura ──────────────────────────────────────────────────────

type Variante = { tamano: string; precio: number; maxSabores?: number };

type ProductoNuevo = {
  nombre: string;
  descripcion?: string;
  categoria: string;
  tipo?: "COMIDA" | "BEBIDA";
  tipoArticulo?: "VENTA" | "EXTRA";
  esEspecialidad?: boolean;
  ventaDomicilio?: boolean;
  inventariable?: boolean;
  variantes: Variante[];
};

type PromocionNueva = {
  nombre: string;
  descripcion: string;
  tipo: "PROMOCION" | "PAQUETE";
  precioEspecial: number;
  componentes: ComponenteNuevo[];
};

/** Componente de paquete: fijo (`producto` por nombre) o libre (`categoria`
 *  de la que el cajero elige en "arma tu paquete"). `tamano` fija la
 *  variante por nombre; si se omite, el producto debe tener variante única. */
type ComponenteNuevo = {
  producto?: string;
  categoria?: string;
  tamano?: string;
  /** Alitas en paquete: límite de sabores (1 = sin combinar). */
  maxSabores?: number;
  cantidad?: number;
};

// ── Tamaños de pizza (canónicos: deben ser idénticos entre pizzas para la
//    pizza personalizada por mitades) ──────────────────────────────────────

const T = {
  mega: "mega",
  c20: "cuadrada 20",
  c16: "cuadrada 16",
  familiar: "familiar",
  grande: "grande",
  mediana: "mediana",
  chica: "chica",
};

function tallas(precios: Partial<Record<keyof typeof T, number>>): Variante[] {
  return Object.entries(precios).map(([clave, precio]) => ({
    tamano: T[clave as keyof typeof T],
    precio: precio as number,
  }));
}

const PRECIOS_ESPECIALIDADES = {
  mega: 440, c20: 310, c16: 255, familiar: 280, grande: 210, mediana: 190, chica: 170,
};
const PRECIOS_POLLO = {
  mega: 500, c20: 360, c16: 300, familiar: 300, grande: 280, mediana: 230, chica: 200,
};
const PRECIOS_VEGETARIANAS = {
  mega: 460, c20: 310, c16: 225, grande: 195, mediana: 170, chica: 140,
};

function pizza(
  categoria: string,
  nombre: string,
  descripcion: string,
  precios: Partial<Record<keyof typeof T, number>>,
  esEspecialidad = true
): ProductoNuevo {
  return { nombre, descripcion, categoria, esEspecialidad, variantes: tallas(precios) };
}

const orden = (precio: number): Variante[] => [{ tamano: "orden", precio }];
const unidad = (precio: number): Variante[] => [{ tamano: "unidad", precio }];
const sabores = (precio: number, lista: string[]): Variante[] =>
  lista.map((sabor) => ({ tamano: sabor.toLowerCase(), precio }));

// ── Catálogo del menú ─────────────────────────────────────────────────────

const PIZZAS_ESPECIALIDADES: ProductoNuevo[] = [
  ["Pizza Barbosa Combinada", "Jamón, salami, chorizo, champiñones, pimiento"],
  ["Pizza Barbosa Especial", "Jamón, chorizo, champiñones, cebolla, jalapeño"],
  ["Pizza Pepperoni", "Pepperoni"],
  ["Pizza Pepperoni Especial", "Pepperoni, champiñones, jalapeños"],
  ["Pizza Italiana", "Pepperoni, champiñones, jamón"],
  ["Pizza Americana", "Pepperoni, jamón, aceitunas negras, pimiento"],
  ["Pizza Hawaiana", "Jamón y piña"],
  ["Pizza Azteca", "Frijoles, cebolla, tocino, jalapeños, champiñones y aguacate"],
  ["Pizza Ranchera", "Jalapeños, chorizo, frijoles, tocino y aguacate"],
  ["Pizza Carnes Frías", "Salami, jamón, chorizo y pepperoni"],
  ["Pizza Pastor", "Carne al pastor, piña, cebolla y cilantro"],
  ["Pizza Boloñesa", "Carne molida, tocino y cebolla"],
  ["Pizza California", "Pepperoni, piña y jalapeño"],
  ["Pizza Oaxaqueña", "Jalapeños, chorizo y frijoles"],
].map(([nombre, desc]) =>
  pizza("pizzas especialidades", nombre, desc, PRECIOS_ESPECIALIDADES)
);

const PIZZAS_POLLO: ProductoNuevo[] = [
  ["Pizza Barbosa Mexicana", "Pollo, chorizo, champiñones, cebolla, jalapeños"],
  ["Pizza Brócoli con Pollo", "Pizza blanca base de ajo"],
  ["Pizza Champipollo", "Pollo, champiñones, queso cheddar"],
  ["Pizza BBQ", "Pollo, BBQ y aderezo ranch"],
  ["Pizza Parrillada", "Asada, pollo, carne al pastor, chorizo, cebolla, salsa de la casa y cilantro"],
  ["Pizza Arrachera", "Frijoles, aderezo picoso, queso"],
  ["Pizza Búfalo", "Pollo, aderezo picoso, queso"],
  ["Pizza Bacon Chicken Ranch", "Pollo, tocino, aderezo ranch"],
  ["Pizza Atún", "Jitomate, cebolla, aderezo y aguacate"],
].map(([nombre, desc]) => pizza("pizzas con pollo", nombre, desc, PRECIOS_POLLO));

const PIZZAS_VEGETARIANAS: ProductoNuevo[] = [
  ["Pizza Vegetariana de Espinacas", "Espinacas con jitomate"],
  ["Pizza Vegetariana Especial", "Brócoli, jitomate, cebolla, jalapeño y champiñones"],
  ["Pizza Vegetariana Clásica", "Brócoli, jitomate y jalapeño"],
].map(([nombre, desc]) =>
  pizza("pizzas vegetarianas", nombre, desc, PRECIOS_VEGETARIANAS)
);

const OTRAS_PIZZAS: ProductoNuevo[] = [
  pizza(
    "especial de la casa",
    "Pizza Rellena Especial",
    "Carne al pastor, jamón, aceitunas negras y chile morrón",
    { mega: 470, c20: 340, c16: 285, familiar: 310, grande: 245, mediana: 215 },
    false // la rellena no se combina por mitades
  ),
  { nombre: "Calzone", categoria: "pizza especial", variantes: [{ tamano: "pieza", precio: 110 }] },
  { nombre: "Stromboli", categoria: "pizza especial", variantes: [{ tamano: "pieza", precio: 110 }] },
];

const POSTRES: ProductoNuevo[] = [
  {
    nombre: "Crepa Sencilla (1 ingrediente)",
    descripcion: "Elige el ingrediente; admite fruta extra",
    categoria: "postres artesanales",
    variantes: sabores(45, [
      "Crema de avellana", "Lechera", "Cajeta", "Mermelada de fresa", "Crema de maní", "Philadelphia",
    ]),
  },
  ...[
    ["Crepa Light", "Queso crema, nuez, lechera y plátano"],
    ["Crepa Golosa", "Chocolate líquido, cajeta y mermelada de fresa"],
    ["Crepa Princesa", "Nutella, plátano y mermelada de fresa"],
    ["Crepa Vaquera", "Mermelada de frambuesa, queso crema, chantilly y crema"],
    ["Crepa Philadelphia", "Mermelada de zarzamora y queso crema"],
    ["Crepa Gringa", "Chocolate líquido, mermelada de fresa y chantilly"],
  ].map(([nombre, desc]): ProductoNuevo => ({
    nombre, descripcion: desc, categoria: "crepas especiales dulces", variantes: orden(75),
  })),
  ...[
    ["Crepa Hawaiana", "Queso manchego, jamón y piña"],
    ["Chrepizza", "Queso manchego y pepperoni"],
    ["Crepocino", "Queso manchego y tocino"],
    ["Choriqueso", "Queso manchego y chorizo"],
    ["Crepa Mexicana", "Queso, champiñón, chile verde y chorizo"],
  ].map(([nombre, desc]): ProductoNuevo => ({
    nombre, descripcion: desc, categoria: "crepas saladas", variantes: orden(85),
  })),
];

const A_LA_CARTA: ProductoNuevo[] = [
  // Texas Chilli
  { nombre: "Chilli Nachos", categoria: "texas chilli", variantes: orden(120) },
  { nombre: "Chilli Dogs", categoria: "texas chilli", variantes: orden(35) },
  { nombre: "Chilli Fries", categoria: "texas chilli", variantes: orden(100) },
  { nombre: "Tazón de Chilli", categoria: "texas chilli", variantes: orden(100) },
  // Snacks Papas
  { nombre: "Papas a la Francesa", categoria: "snacks papas", variantes: orden(50) },
  { nombre: "Papas Horneadas con Queso Mozzarella", categoria: "snacks papas", variantes: orden(75) },
  { nombre: "Papas con Queso Cheddar", categoria: "snacks papas", variantes: orden(75) },
  { nombre: "Papas Pizza", descripcion: "Salsa marinara, queso mozzarella y pepperoni", categoria: "snacks papas", variantes: orden(100) },
  { nombre: "Papas en Gajos", categoria: "snacks papas", variantes: orden(65) },
  // Snacks Bocadillos
  { nombre: "Palomitas de Camarón", categoria: "snacks bocadillos", variantes: orden(100) },
  { nombre: "Jalapeños Rellenos", categoria: "snacks bocadillos", variantes: orden(70) },
  { nombre: "Dedos de Queso con Mozzarella", categoria: "snacks bocadillos", variantes: orden(70) },
  { nombre: "Aros de Cebolla", categoria: "snacks bocadillos", variantes: orden(70) },
  { nombre: "Nuggets de Pollo", categoria: "snacks bocadillos", variantes: orden(80) },
  { nombre: "Combo Delipan", categoria: "snacks bocadillos", variantes: orden(190) },
  {
    nombre: "Q-tiras", categoria: "snacks bocadillos",
    variantes: sabores(100, ["Búfalo", "Agridulce", "BBQ Habanero", "Mango Habanero"]),
  },
  // Costillas / Boneless / Nachos
  {
    nombre: "Costillas BBQ", categoria: "snacks costillas",
    variantes: sabores(150, ["BBQ", "BBQ Piquín", "BBQ Habanero"]),
  },
  {
    nombre: "Boneless", descripcion: "Admite extra de papas", categoria: "snacks boneless",
    variantes: sabores(110, [
      "Búfalo", "Agridulce", "Orientales", "BBQ Habanero", "Mango Habanero",
      "Lemon Pepper", "Diego Splash", "Piña Mango Habanero",
    ]),
  },
  { nombre: "Nachos Sencillos", descripcion: "Queso cheddar, jalapeños, lechuga y jitomate", categoria: "snacks nachos", variantes: orden(65) },
  { nombre: "Nachos Especiales", descripcion: "Pollo, queso gratinado, frijoles, jalapeños, lechuga y jitomate", categoria: "snacks nachos", variantes: orden(85) },
  // Hamburguesas
  ...[
    ["Hamburguesa Barbosa Furiosa", "Lechuga, jitomate, aros de cebolla, tocino, salsa picante y queso amarillo", 100],
    ["Hamburguesa California", "Lechuga, jitomate, queso y cebolla", 100],
    ["Hamburguesa Barbosa Especial", "Champiñones, cebolla caramelizada, tocino y queso", 100],
    ["Hamburguesa Hawaiana", "Lechuga, jitomate, piña, jamón y queso mozzarella", 100],
    ["Hamburguesa Jumay", "Lechuga, jitomate, aderezo, tocino y queso amarillo", 100],
    ["Hamburguesa Queso y Tocino", "", 100],
    ["Hamburguesa Arrachera", "Lechuga, jitomate, cebolla, aguacate, jalapeños y queso mozzarella", 110],
  ].map(([nombre, desc, precio]): ProductoNuevo => ({
    nombre: nombre as string, descripcion: (desc as string) || undefined,
    categoria: "hamburguesas", variantes: unidad(precio as number),
  })),
  ...[
    ["Hamburguesa Pechuga a la Plancha", "Lechuga y jitomate"],
    ["Hamburguesa Pechuga Frita", "Lechuga y jitomate"],
    ["Hamburguesa Popeye", "Pechuga a la plancha, espinacas y queso gratinado"],
    ["Hamburguesa a la Rancherita", "Lechuga, jitomate, tocino, champiñones, queso y salsa BBQ"],
    ["Hamburguesa de Pollo Búfalo", "Lechuga, jitomate, tocino, queso y salsa búfalo"],
    ["Hamburguesa de Pollo BBQ", "Lechuga, jitomate, tocino, queso y salsa BBQ con aros de cebolla"],
  ].map(([nombre, desc]): ProductoNuevo => ({
    nombre, descripcion: desc, categoria: "hamburguesas de pollo", variantes: unidad(105),
  })),
  // Club sandwich / baguettes
  { nombre: "Club Mixto", descripcion: "Lechuga, jitomate, jamón, pollo, tocino y queso amarillo", categoria: "club sandwich", variantes: unidad(95) },
  { nombre: "Club de Jamón", descripcion: "Lechuga, jitomate, tocino y queso amarillo", categoria: "club sandwich", variantes: unidad(85) },
  ...[
    ["Baguette Pizza Steak", "Queso y salsa marinara"],
    ["Baguette Cheesesteak", "Tocino y queso"],
    ["Baguette Cheesesteak Barbosa", "Cebolla frita, champiñones, chile morrón y queso"],
    ["Baguette Cheesesteak de Pollo", "Cebolla frita, lechuga, jitomate y jalapeños"],
    ["Baguette Pepperoni Cheesesteak", "Pepperoni, cebolla, jalapeño y queso"],
  ].map(([nombre, desc]): ProductoNuevo => ({
    nombre, descripcion: desc, categoria: "baguettes", variantes: unidad(100),
  })),
  // Pastas (admiten Pan de Ajo)
  { nombre: "Pasta de Res", descripcion: "Spaguetti con albóndigas", categoria: "pastas", variantes: orden(140) },
  {
    nombre: "Pasta a la Diabla", categoria: "pastas",
    variantes: [{ tamano: "con pollo", precio: 140 }, { tamano: "con camarones", precio: 180 }],
  },
  { nombre: "Pasta con Pollo Parmesano", categoria: "pastas", variantes: orden(140) },
  {
    nombre: "Pasta Alfredo", categoria: "pastas",
    variantes: [{ tamano: "con pollo", precio: 140 }, { tamano: "con camarones", precio: 180 }],
  },
  { nombre: "Pasta Chow Mein", categoria: "pastas", variantes: orden(140) },
  { nombre: "Lasagna Italiana", descripcion: "Acompañada con pan de ajo", categoria: "pastas", variantes: orden(130) },
  // Ensaladas
  ...[
    ["Ensalada Chef", "Lechuga, jitomate, zanahoria, aderezo ranch y rollitos de carnes frías", 110],
    ["Ensalada César", "Lechuga, jitomate, crutones, aderezo césar y pechuga asada", 110],
    ["Ensalada Mediterránea", "Lechuga italiana, cebolla morada, jitomate, zanahoria, aderezo italiano, jamón, pepperoni, atún y camarones", 120],
    ["Ensalada César estilo Cajún", "Lechuga italiana, crutones, aderezo césar y pechuga a la plancha sazonada con condimento cajún", 120],
    ["Ensalada Tropical", "Lechuga, fresa, mango, naranja, arándanos, nuez y aderezo", 120],
    ["Ensalada de Atún", "Lechuga, jitomate, cebolla y mayonesa", 120],
  ].map(([nombre, desc, precio]): ProductoNuevo => ({
    nombre: nombre as string, descripcion: desc as string,
    categoria: "ensaladas", variantes: orden(precio as number),
  })),
  // Burritos (mediano/grande)
  ...[
    ["Rollito Primavera", "Pollo, lechuga, jitomate y aderezo"],
    ["Rollito Ranchero", "Bistec, cebolla frita, frijoles, jalapeños y aguacate"],
    ["Rollito Oaxaqueño", "Frijoles, carne molida y chipotles"],
    ["Rollito Pastor", "Carne al pastor, cebolla, piña y queso crema"],
    ["Rollito Supremo", "Carne molida, lechuga, jitomate, queso y crema"],
    ["Burrito Cubano", "Lechuga, jitomate, jamón, pollo, aguacate, jalapeño y queso"],
    ["Burrito Mexicano", "Bistec, jitomate, cebolla, chile, papa y queso"],
    ["Burrito California", "Asada, arroz, frijoles, cebolla y salsa mexicana"],
  ].map(([nombre, desc]): ProductoNuevo => ({
    nombre, descripcion: desc, categoria: "burritos",
    variantes: [{ tamano: "mediano", precio: 85 }, { tamano: "grande", precio: 100 }],
  })),
  ...[
    ["Burrito de Arrachera", "Arrachera, arroz, frijoles, cebolla y guacamole"],
    ["Burrito Arrachera Especial", "Arrachera, morrón, cebolla frita, guacamole y queso"],
  ].map(([nombre, desc]): ProductoNuevo => ({
    nombre, descripcion: desc, categoria: "burritos de arrachera",
    variantes: [{ tamano: "mediano", precio: 90 }, { tamano: "grande", precio: 110 }],
  })),
  {
    nombre: "Burrito de Costilla BBQ",
    descripcion: "Costilla de puerco con puré de papa; admite extra de papas",
    categoria: "burritos de costilla bbq",
    variantes: [
      { tamano: "mediano bbq", precio: 90 },
      { tamano: "mediano bbq habanero", precio: 90 },
      { tamano: "mediano bbq mango habanero", precio: 90 },
      { tamano: "grande bbq", precio: 110 },
      { tamano: "grande bbq habanero", precio: 110 },
      { tamano: "grande bbq mango habanero", precio: 110 },
    ],
  },
  // Tortas (admiten extra de papas)
  ...[
    ["Torta al Pastor", "Carne al pastor, cebolla, piña, lechuga, jitomate y aguacate", 90],
    ["Torta Cubana", "Pechuga a la plancha, jamón, lechuga, jitomate, jalapeños, aguacate y mayonesa", 110],
    ["Torta Barbosa", "Carne asada, pechuga a la plancha, queso, lechuga, jitomate, aguacate, cebolla y frijoles", 110],
    ["Italian Hogie", "Jamón, salami, pepperoni, queso, lechuga, jitomate, cebolla y jalapeño", 80],
    ["Torta Milanesa de Pollo estilo Italiano", "Salsa marinara y queso gratinado con papas", 100],
  ].map(([nombre, desc, precio]): ProductoNuevo => ({
    nombre: nombre as string, descripcion: desc as string,
    categoria: "tortas", variantes: unidad(precio as number),
  })),
  {
    nombre: "Torta de Milanesa",
    descripcion: "Lechuga, jitomate, jalapeños, frijoles y mayonesa",
    categoria: "tortas",
    variantes: sabores(90, ["Rollo", "Res", "Puerco"]),
  },
  // Hot dogs / quesadillas
  { nombre: "Hot Dog Clásico", categoria: "hot dogs", variantes: unidad(18) },
  { nombre: "Hot Dog con Queso", categoria: "hot dogs", variantes: unidad(20) },
  { nombre: "Hot Dog con Tocino", categoria: "hot dogs", variantes: unidad(20) },
  { nombre: "Hot Dog Especial", categoria: "hot dogs", variantes: unidad(28) },
  {
    nombre: "Quesadilla",
    descripcion: "Cebolla frita, queso cheddar, queso cheddar líquido, queso mozzarella, salsa de la casa",
    categoria: "quesadillas",
    variantes: sabores(75, ["Res", "Pollo"]),
  },
];

// Alitas: sabores como productos (se combinan entre sí); órdenes como variantes
const SABORES_ALITAS = [
  "Agridulce", "Búfalo", "BBQ", "Habanero", "Mango Habanero", "Lemon Pepper",
  "Queso Cheddar", "Takis Fuego", "Flamin Hot", "Diego Splash", "Valentina",
  "BBQ Habanero", "Parmesano", "Piña Mango Habanero", "Wild Lemon",
];
const ALITAS: ProductoNuevo[] = SABORES_ALITAS.map((sabor) => ({
  nombre: `Alitas ${sabor}`,
  categoria: "alitas",
  variantes: [
    { tamano: "7 pzas", precio: 110, maxSabores: 1 },
    { tamano: "10 pzas", precio: 150, maxSabores: 2 },
    { tamano: "14 pzas", precio: 210, maxSabores: 3 },
    { tamano: "20 pzas", precio: 290, maxSabores: 3 },
  ],
}));

// Bebidas: solo sucursal; sabor = variante (sin combinaciones)
const BEBIDAS: ProductoNuevo[] = [
  {
    nombre: "Frappe",
    variantes: sabores(80, [
      "Ferrero", "Rompope", "Capuchino", "Vainilla", "Chocoreta", "Moka", "Baileys",
      "Mazapán", "Gansito", "Cajeta", "Fresa", "Chocolate Blanco", "Oreo",
    ]),
  },
  {
    nombre: "Smoothie / Fruta Natural",
    variantes: sabores(85, [
      "Frambuesa", "Manzana Verde", "Blueberry Banana", "Fresa", "Arándano", "Mango",
    ]),
  },
  {
    nombre: "Soda con Perlas Explosivas",
    variantes: sabores(50, [
      "Fresa", "Mango", "Kiwi", "Frutos Rojos", "Mora Azul", "Manzana Verde",
      "Sandía", "Arándano", "Frambuesa",
    ]),
  },
  {
    nombre: "Soda Glitter",
    variantes: sabores(50, [
      "Mora Azul", "Bubaloo", "Frutos Rojos", "Fresa", "Chicle", "Frambuesa", "Mango",
    ]),
  },
  { nombre: "Granizado", variantes: sabores(80, ["Mango", "Fresa", "Limón Pepino"]) },
  { nombre: "Ice Especial", variantes: sabores(60, ["Cereza", "Mora Azul"]) },
].map((b) => ({
  ...b,
  categoria: "bebidas",
  tipo: "BEBIDA" as const,
  ventaDomicilio: false,
}));

// Extras del menú (precio único; el cajero elige el del tamaño correcto — D6)
const EXTRAS: ProductoNuevo[] = [
  ...[
    ["mega", 85], ["cuadrada", 65], ["familiar", 65],
    ["grande", 45], ["mediana", 45], ["chica", 45],
  ].flatMap(([tam, precio]) => [
    { nombre: `Orilla de queso (${tam})`, precio: precio as number },
    { nombre: `Deditos de queso (${tam})`, precio: precio as number },
  ]).map(({ nombre, precio }): ProductoNuevo => ({
    nombre, categoria: "extra", tipoArticulo: "EXTRA",
    variantes: [{ tamano: "unico", precio }],
  })),
  {
    nombre: "Pan de Ajo (6 pzas)", categoria: "extra", tipoArticulo: "EXTRA",
    variantes: [{ tamano: "unico", precio: 95 }],
  },
  {
    nombre: "Extra de papas a la francesa", categoria: "extra", tipoArticulo: "EXTRA",
    variantes: [{ tamano: "unico", precio: 20 }],
  },
  ...["Plátano", "Durazno", "Nuez", "Galleta Oreo", "Fresa"].map(
    (fruta): ProductoNuevo => ({
      nombre: `Fruta extra ${fruta}`, categoria: "extra", tipoArticulo: "EXTRA",
      variantes: [{ tamano: "unico", precio: 15 }],
    })
  ),
];

// Productos de apoyo para los paquetes (no vienen en las hojas de menú)
const APOYO_PAQUETES: ProductoNuevo[] = [
  {
    // El sabor de la rebanada se anota en el texto libre de "arma tu paquete"
    nombre: "Rebanada de pizza",
    categoria: "rebanadas",
    ventaDomicilio: false,
    variantes: unidad(25),
  },
  {
    // Categoría propia: el "refresco chico" de los paquetes es elección
    // libre de la categoría "refresco" y el familiar no debe aparecer ahí.
    nombre: "Refresco familiar (1.5L)",
    categoria: "refresco familiar",
    tipo: "BEBIDA",
    inventariable: true,
    variantes: [{ tamano: "unico", precio: 45 }],
  },
];

const PRODUCTOS: ProductoNuevo[] = [
  ...PIZZAS_ESPECIALIDADES,
  ...PIZZAS_POLLO,
  ...PIZZAS_VEGETARIANAS,
  ...OTRAS_PIZZAS,
  ...POSTRES,
  ...A_LA_CARTA,
  ...ALITAS,
  ...BEBIDAS,
  ...EXTRAS,
  ...APOYO_PAQUETES,
];

// Componentes compartidos entre paquetes
const REFRESCO_CHICO: ComponenteNuevo = { categoria: "refresco" };
const REFRESCO_FAMILIAR: ComponenteNuevo = { producto: "Refresco familiar (1.5L)" };
const PAPAS: ComponenteNuevo = { producto: "Papas a la Francesa" };
const ALITAS_10_UN_SABOR: ComponenteNuevo = {
  categoria: "alitas",
  tamano: "10 pzas",
  maxSabores: 1, // la orden normal de 10 permite 2; en paquete es 1 solo
};
const pizzaAElegir = (tamano: string): ComponenteNuevo => ({
  categoria: "pizzas especialidades", // sin pollo/vegetarianas
  tamano,
});

// Paquetes L-V, sin festivos, solo sucursal (hoja Paquetes).
// La pizza a elegir es de "pizzas especialidades" (sin pollo/vegetarianas);
// la hamburguesa del paquete 3/7 solo de "hamburguesas" (las de pollo no).
const PROMOCIONES: PromocionNueva[] = [
  {
    nombre: "Paquete 1", descripcion: "Rebanada de pizza + hot dog + refresco chico", tipo: "PAQUETE", precioEspecial: 65,
    componentes: [
      // El sabor de la rebanada va en el texto libre de "arma tu paquete"
      { producto: "Rebanada de pizza" },
      { categoria: "hot dogs" },
      REFRESCO_CHICO,
    ],
  },
  {
    nombre: "Paquete 2", descripcion: "2 hot dogs + refresco chico", tipo: "PAQUETE", precioEspecial: 65,
    componentes: [{ categoria: "hot dogs", cantidad: 2 }, REFRESCO_CHICO],
  },
  {
    nombre: "Paquete 3", descripcion: "1 hamburguesa + papas + refresco chico", tipo: "PAQUETE", precioEspecial: 100,
    componentes: [{ categoria: "hamburguesas" }, PAPAS, REFRESCO_CHICO],
  },
  {
    nombre: "Paquete 4", descripcion: "2 burritos + refresco chico", tipo: "PAQUETE", precioEspecial: 110,
    componentes: [
      { categoria: "burritos", tamano: "mediano", cantidad: 2 },
      REFRESCO_CHICO,
    ],
  },
  {
    nombre: "Paquete 5", descripcion: "1 cheesesteak + papas + refresco chico", tipo: "PAQUETE", precioEspecial: 110,
    componentes: [{ categoria: "baguettes" }, PAPAS, REFRESCO_CHICO],
  },
  {
    nombre: "Paquete 6", descripcion: "Pizza grande + papas + refresco familiar (1.5L)", tipo: "PAQUETE", precioEspecial: 265,
    componentes: [pizzaAElegir(T.grande), PAPAS, REFRESCO_FAMILIAR],
  },
  {
    nombre: "Paquete 7", descripcion: "5 hamburguesas con papas + refresco familiar (1.5L)", tipo: "PAQUETE", precioEspecial: 390,
    componentes: [
      // "con papas": cada hamburguesa lleva su orden
      { categoria: "hamburguesas", cantidad: 5 },
      { ...PAPAS, cantidad: 5 },
      REFRESCO_FAMILIAR,
    ],
  },
  {
    nombre: "Paquete 8", descripcion: "Pizza cuadrada (16 rebanadas) + papas a la francesa + refresco familiar (1.5L)", tipo: "PAQUETE", precioEspecial: 310,
    componentes: [pizzaAElegir(T.c16), PAPAS, REFRESCO_FAMILIAR],
  },
  {
    nombre: "Paquete 9", descripcion: "Pizza cuadrada (16 rebanadas) + 10 alitas (1 sabor) + papas a la francesa + refresco familiar (1.5L)", tipo: "PAQUETE", precioEspecial: 360,
    componentes: [pizzaAElegir(T.c16), ALITAS_10_UN_SABOR, PAPAS, REFRESCO_FAMILIAR],
  },
  {
    nombre: "Paquete 10", descripcion: "Pizza mega (30 rebanadas) + 10 alitas (1 sabor) + papas a la francesa + refresco familiar (1.5L)", tipo: "PAQUETE", precioEspecial: 610,
    componentes: [pizzaAElegir(T.mega), ALITAS_10_UN_SABOR, PAPAS, REFRESCO_FAMILIAR],
  },
  {
    nombre: "Para el antojo — pizza cuadrada", descripcion: "Pizza cuadrada (16 rebanadas) + papas a la francesa + refresco familiar (1.5L) + orden de 10 alitas (1 sabor)", tipo: "PROMOCION", precioEspecial: 400,
    componentes: [pizzaAElegir(T.c16), PAPAS, REFRESCO_FAMILIAR, ALITAS_10_UN_SABOR],
  },
  {
    nombre: "Para el antojo — pizza grande", descripcion: "Pizza grande + papas + refresco familiar (1.5L) + orden de 10 alitas (1 sabor)", tipo: "PROMOCION", precioEspecial: 360,
    componentes: [pizzaAElegir(T.grande), PAPAS, REFRESCO_FAMILIAR, ALITAS_10_UN_SABOR],
  },
];

// Categorías del catálogo previo que se CONSERVAN al limpiar
const CATEGORIAS_A_CONSERVAR = ["alitas", "extra", "refresco", "refresco familiar"];

// ── Ejecución ─────────────────────────────────────────────────────────────

async function limpiar() {
  console.log("— Limpieza de datos demo/operativos —");
  const borrado = {
    mitades: await db.ventaDetalleMitad.deleteMany(),
    detalles: await db.ventaDetalle.deleteMany(),
    movCorte: await db.movimientoCorte.deleteMany(),
    compraDetalles: await db.compraDetalle.deleteMany(),
    compras: await db.compraProveedor.deleteMany(),
    ventas: await db.venta.deleteMany(),
    cortes: await db.corteCaja.deleteMany(),
    movInventario: await db.movimientoInventario.deleteMany(),
    promoProductos: await db.promocionProducto.deleteMany(),
    promociones: await db.promocion.deleteMany(),
  };

  const productosDemo = await db.producto.findMany({
    where: { categoria: { notIn: CATEGORIAS_A_CONSERVAR } },
    select: { id: true, nombre: true },
  });
  const idsDemo = productosDemo.map((p) => p.id);
  await db.inventario.deleteMany({ where: { productoId: { in: idsDemo } } });
  await db.productoVariante.deleteMany({ where: { productoId: { in: idsDemo } } });
  await db.producto.deleteMany({ where: { id: { in: idsDemo } } });

  await db.folioContador.updateMany({ data: { siguiente: 1 } });

  for (const [tabla, r] of Object.entries(borrado)) {
    console.log(`  ${tabla}: ${r.count} filas eliminadas`);
  }
  console.log(`  productos demo: ${idsDemo.length} eliminados (${productosDemo.map((p) => p.nombre).join(", ") || "ninguno"})`);
  console.log("  folios reiniciados a 1");
}

async function cargar() {
  console.log("\n— Carga del menú real —");
  let creados = 0;
  let omitidos = 0;
  for (const p of PRODUCTOS) {
    const existente = await db.producto.findFirst({ where: { nombre: p.nombre } });
    if (existente) {
      if (existente.categoria !== p.categoria) {
        // p. ej. el familiar 1.5L pasó de "refresco" a "refresco familiar"
        await db.producto.update({
          where: { id: existente.id },
          data: { categoria: p.categoria },
        });
        console.log(`  recategorizado: ${p.nombre} → ${p.categoria}`);
      }
      omitidos += 1;
      continue;
    }
    await db.producto.create({
      data: {
        nombre: p.nombre,
        descripcion: p.descripcion ?? null,
        tipo: p.tipo ?? "COMIDA",
        tipoArticulo: p.tipoArticulo ?? "VENTA",
        categoria: p.categoria,
        ventaDomicilio: p.ventaDomicilio ?? true,
        ventaEstablecimiento: true,
        inventariable: p.inventariable ?? false,
        esEspecialidad: p.esEspecialidad ?? false,
        variantes: {
          create: p.variantes.map((v) => ({
            tamano: v.tamano,
            precio: v.precio,
            maxSabores: v.maxSabores ?? 1,
          })),
        },
      },
    });
    creados += 1;
  }
  console.log(`  productos: ${creados} creados, ${omitidos} ya existían`);

  // Componentes fijos: resolver nombre → id (deben existir tras la carga)
  const nombresFijos = [
    ...new Set(
      PROMOCIONES.flatMap((p) =>
        p.componentes.flatMap((c) => (c.producto ? [c.producto] : []))
      )
    ),
  ];
  const fijos = await db.producto.findMany({
    where: { nombre: { in: nombresFijos } },
    select: { id: true, nombre: true },
  });
  const idPorNombre = new Map(fijos.map((p) => [p.nombre, p.id]));
  for (const nombre of nombresFijos) {
    if (!idPorNombre.has(nombre)) {
      throw new Error(`Componente fijo sin producto en BD: ${nombre}`);
    }
  }

  let promosCreadas = 0;
  for (const promo of PROMOCIONES) {
    const existente = await db.promocion.findFirst({ where: { nombre: promo.nombre } });
    if (existente) continue;
    await db.promocion.create({
      data: {
        nombre: promo.nombre,
        descripcion: promo.descripcion,
        tipo: promo.tipo,
        precioEspecial: promo.precioEspecial,
        ventaDomicilio: false, // hoja Paquetes: solo sucursal
        ventaEstablecimiento: true,
        diasSemana: [1, 2, 3, 4, 5], // Lunes - Viernes
        aplicaFestivos: false, // hoja Paquetes: "No aplica" en días festivos
        activa: true,
        productos: {
          create: promo.componentes.map((c) => ({
            rol: "REQUERIDO",
            productoId: c.producto ? idPorNombre.get(c.producto)! : null,
            varianteId: null, // la variante se resuelve por `tamano` al vender
            categoriaPermitida: c.producto ? null : (c.categoria ?? null),
            tamano: c.tamano ?? null,
            maxSaboresOverride: c.maxSabores ?? null,
            cantidad: c.cantidad ?? 1,
          })),
        },
      },
    });
    promosCreadas += 1;
  }
  console.log(`  promociones/paquetes: ${promosCreadas} creados (con composición)`);
}

async function resumen() {
  const productos = await db.producto.count();
  const variantes = await db.productoVariante.count();
  const promociones = await db.promocion.count();
  const porCategoria = await db.producto.groupBy({
    by: ["categoria"],
    _count: true,
    orderBy: { categoria: "asc" },
  });
  console.log("\n— Resumen final —");
  for (const c of porCategoria) {
    console.log(`  ${c.categoria}: ${c._count}`);
  }
  console.log(`  TOTAL: ${productos} productos, ${variantes} variantes, ${promociones} promociones`);
}

async function main() {
  await limpiar();
  await cargar();
  await resumen();
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
