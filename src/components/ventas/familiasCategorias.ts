/**
 * Colores por familia de productos para las secciones del wizard (pedido
 * de QA: cada sección con borde y fondo acorde al tipo). Tintes suaves:
 * las tarjetas siguen blancas encima y el título usa el tono fuerte.
 * Una categoría sin mapear cae en neutral — nada se rompe al dar de alta
 * categorías nuevas, solo queda sin color hasta agregarla aquí.
 */

export type EstiloFamilia = {
  contenedor: string;
  titulo: string;
};

const FAMILIAS = {
  pizzas: {
    contenedor: "border-red-200 bg-red-50",
    titulo: "text-red-700",
  },
  alitas: {
    contenedor: "border-orange-200 bg-orange-50",
    titulo: "text-orange-700",
  },
  plancha: {
    contenedor: "border-amber-200 bg-amber-50",
    titulo: "text-amber-700",
  },
  mexicana: {
    contenedor: "border-lime-200 bg-lime-50",
    titulo: "text-lime-700",
  },
  frescos: {
    contenedor: "border-emerald-200 bg-emerald-50",
    titulo: "text-emerald-700",
  },
  postres: {
    contenedor: "border-pink-200 bg-pink-50",
    titulo: "text-pink-700",
  },
  bebidas: {
    contenedor: "border-sky-200 bg-sky-50",
    titulo: "text-sky-700",
  },
} satisfies Record<string, EstiloFamilia>;

const NEUTRAL: EstiloFamilia = {
  contenedor: "border-stone-200 bg-stone-100/60",
  titulo: "text-stone-700",
};

const FAMILIA_POR_CATEGORIA: Record<string, keyof typeof FAMILIAS> = {
  // 🍕 Pizzas
  "pizzas especialidades": "pizzas",
  "pizzas con pollo": "pizzas",
  "pizzas vegetarianas": "pizzas",
  "especial de la casa": "pizzas",
  "pizza especial": "pizzas",
  rebanadas: "pizzas",
  pizza: "pizzas", // categoría del seed demo
  // 🍗 Alitas y costillas
  alitas: "alitas",
  "snacks boneless": "alitas",
  "snacks costillas": "alitas",
  // 🍔 A la plancha
  hamburguesas: "plancha",
  "hamburguesas de pollo": "plancha",
  "hot dogs": "plancha",
  tortas: "plancha",
  "club sandwich": "plancha",
  baguettes: "plancha",
  // 🌯 Mexicana y snacks
  burritos: "mexicana",
  "burritos de arrachera": "mexicana",
  "burritos de costilla bbq": "mexicana",
  quesadillas: "mexicana",
  "snacks papas": "mexicana",
  "snacks bocadillos": "mexicana",
  "snacks nachos": "mexicana",
  "texas chilli": "mexicana",
  // 🥗 Pastas y ensaladas
  pastas: "frescos",
  ensaladas: "frescos",
  // 🍰 Postres
  "postres artesanales": "postres",
  "crepas especiales dulces": "postres",
  "crepas saladas": "postres",
  // 🥤 Bebidas
  bebidas: "bebidas",
  refresco: "bebidas",
  "refresco familiar": "bebidas",
};

export function estiloCategoria(categoria: string): EstiloFamilia {
  const familia = FAMILIA_POR_CATEGORIA[categoria];
  return familia ? FAMILIAS[familia] : NEUTRAL;
}
