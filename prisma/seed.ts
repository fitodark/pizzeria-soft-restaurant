import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

// Debe coincidir con prisma.config.ts y src/lib/db.ts
const ESQUEMA_BD = "schema_barbosa_v2";

// Credenciales del admin inicial SIEMPRE por variables de entorno: sin
// valores por defecto para no sembrar credenciales conocidas en producción.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";
const ADMIN_PIN = process.env.SEED_ADMIN_PIN ?? "";

function validarCredencialesSeed() {
  const problemas: string[] = [];
  if (!ADMIN_EMAIL.includes("@")) {
    problemas.push("SEED_ADMIN_EMAIL (correo válido)");
  }
  if (ADMIN_PASSWORD.length < 10) {
    problemas.push("SEED_ADMIN_PASSWORD (mínimo 10 caracteres)");
  }
  if (!/^\d{4}$/.test(ADMIN_PIN)) {
    problemas.push("SEED_ADMIN_PIN (4 dígitos)");
  }
  if (problemas.length > 0) {
    throw new Error(
      `Credenciales del seed ausentes o inválidas en .env: ${problemas.join(", ")}`
    );
  }
}

const adapter = new PrismaPg(
  { connectionString: process.env.DIRECT_URL },
  { schema: ESQUEMA_BD }
);
const prisma = new PrismaClient({ adapter });

async function crearAdminEnSupabase(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env"
    );
  }
  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Idempotente: si el admin ya existe en Auth, reutilizar su id.
  const { data: lista, error: errorLista } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (errorLista) {
    throw new Error(`No se pudo listar usuarios de Auth: ${errorLista.message}`);
  }
  const existente = lista.users.find((u) => u.email === ADMIN_EMAIL);
  if (existente) {
    console.log(`  Auth: el usuario ${ADMIN_EMAIL} ya existe, reutilizando.`);
    return existente.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`No se pudo crear el admin en Auth: ${error?.message}`);
  }
  console.log(`  Auth: usuario ${ADMIN_EMAIL} creado.`);
  return data.user.id;
}

async function main() {
  const yaSembrado = await prisma.sucursal.count();
  if (yaSembrado > 0) {
    console.log("La base de datos ya tiene datos; seed omitido.");
    return;
  }
  validarCredencialesSeed();

  console.log("Sembrando base de datos…");

  // 1. Sucursal demo
  const sucursal = await prisma.sucursal.create({
    data: {
      nombre: "Sucursal Centro",
      calle: "Av. Juárez 123",
      colonia: "Centro",
      ciudad: "Guadalajara",
      estado: "Jalisco",
      codigoPostal: "44100",
      telefono: "33 1234 5678",
      folios: { create: { siguiente: 1 } },
      configuracion: {
        create: {
          impresoraPrincipalRuta: "192.168.1.50",
          impresoraCocinaRuta: "192.168.1.51",
          impresoraBebidasRuta: "192.168.1.52",
          leyendaPie: "¡Gracias por su compra!",
        },
      },
    },
  });
  console.log(`  Sucursal: ${sucursal.nombre}`);

  // 2. Administrador (Supabase Auth + perfil + asignación de sucursal)
  const adminId = await crearAdminEnSupabase();
  await prisma.perfil.upsert({
    where: { id: adminId },
    update: {},
    create: {
      id: adminId,
      nombre: "Administrador",
      rol: "ADMINISTRADOR",
      sueldo: "0",
      pinHash: await bcrypt.hash(ADMIN_PIN, 10),
      sucursales: { create: { sucursalId: sucursal.id } },
    },
  });
  console.log("  Perfil de administrador creado.");

  // 3. Especialidades de pizza (elegibles como mitad) con 3 tamaños
  const especialidades: Array<{
    nombre: string;
    descripcion: string;
    precios: [string, string, string]; // chica, mediana, grande
  }> = [
    { nombre: "Hawaiana", descripcion: "Jamón y piña", precios: ["99", "139", "179"] },
    { nombre: "Pepperoni", descripcion: "Doble pepperoni", precios: ["95", "135", "175"] },
    { nombre: "Mexicana", descripcion: "Chorizo, jalapeño, cebolla y frijol", precios: ["109", "149", "189"] },
    { nombre: "Carnes Frías", descripcion: "Jamón, salami, pepperoni y tocino", precios: ["115", "155", "199"] },
    { nombre: "Vegetariana", descripcion: "Champiñón, pimiento, cebolla y aceituna", precios: ["99", "139", "179"] },
    { nombre: "Barbosa Especial", descripcion: "La especialidad de la casa", precios: ["125", "169", "215"] },
  ];
  for (const esp of especialidades) {
    await prisma.producto.create({
      data: {
        nombre: `Pizza ${esp.nombre}`,
        descripcion: esp.descripcion,
        tipo: "COMIDA",
        categoria: "pizza",
        esEspecialidad: true,
        grupoExtras: ["pizza"],
        variantes: {
          create: [
            { tamano: "chica", precio: esp.precios[0] },
            { tamano: "mediana", precio: esp.precios[1] },
            { tamano: "grande", precio: esp.precios[2] },
          ],
        },
      },
    });
  }
  console.log(`  ${especialidades.length} especialidades de pizza creadas.`);

  // 4. Bebidas inventariables (existencia inicial con movimiento de ajuste)
  const bebidas = [
    { nombre: "Coca-Cola 600 ml", precio: "25" },
    { nombre: "Coca-Cola Sin Azúcar 600 ml", precio: "25" },
    { nombre: "Sprite 600 ml", precio: "24" },
    { nombre: "Agua embotellada 500 ml", precio: "15" },
  ];
  const EXISTENCIA_INICIAL = "24";
  for (const beb of bebidas) {
    const producto = await prisma.producto.create({
      data: {
        nombre: beb.nombre,
        tipo: "BEBIDA",
        categoria: "refresco",
        inventariable: true,
        permiteExtrasNotas: false,
        variantes: { create: { tamano: "unico", precio: beb.precio } },
        inventario: {
          create: { sucursalId: sucursal.id, existencia: EXISTENCIA_INICIAL },
        },
      },
    });
    await prisma.movimientoInventario.create({
      data: {
        sucursalId: sucursal.id,
        productoId: producto.id,
        tipo: "AJUSTE",
        cantidad: EXISTENCIA_INICIAL,
        referencia: "Existencia inicial (seed)",
        usuarioId: adminId,
      },
    });
  }
  console.log(`  ${bebidas.length} bebidas inventariables creadas (existencia ${EXISTENCIA_INICIAL}).`);

  // 4b. Sabores de alitas: precio fijo por orden; max_sabores limita la
  // combinación (7 pzas un solo sabor; 10 hasta 2; 14 y 20 hasta 3)
  const saboresAlitas = ["Alitas BBQ", "Alitas Búfalo", "Alitas Habanero", "Alitas Lemon Pepper"];
  const ordenesAlitas = [
    { tamano: "7 pzas", precio: "110", maxSabores: 1 },
    { tamano: "10 pzas", precio: "150", maxSabores: 2 },
    { tamano: "14 pzas", precio: "210", maxSabores: 3 },
    { tamano: "20 pzas", precio: "290", maxSabores: 3 },
  ];
  for (const sabor of saboresAlitas) {
    await prisma.producto.create({
      data: {
        nombre: sabor,
        tipo: "COMIDA",
        categoria: "alitas",
        grupoExtras: ["alitas"],
        variantes: { create: ordenesAlitas },
      },
    });
  }
  console.log(`  ${saboresAlitas.length} sabores de alitas creados.`);

  // 4c. Aderezos: extras cobrables para acompañar alitas
  for (const aderezo of ["Aderezo Ranch", "Aderezo Blue Cheese"]) {
    await prisma.producto.create({
      data: {
        nombre: aderezo,
        tipo: "COMIDA",
        tipoArticulo: "EXTRA",
        categoria: "extra",
        permiteExtrasNotas: false,
        grupoExtras: ["alitas"],
        variantes: { create: { tamano: "unico", precio: "15" } },
      },
    });
  }
  console.log("  2 aderezos (extras) creados.");

  // 5. Producto extra (no se vende solo)
  await prisma.producto.create({
    data: {
      nombre: "Queso extra",
      tipo: "COMIDA",
      tipoArticulo: "EXTRA",
      categoria: "extra",
      permiteExtrasNotas: false,
      grupoExtras: ["pizza"],
      variantes: { create: { tamano: "unico", precio: "25" } },
    },
  });
  console.log("  Extra 'Queso extra' creado.");

  // 6. Paquete de ejemplo: pizza grande Pepperoni + 2 refrescos, precio fijo
  const pepperoni = await prisma.producto.findFirstOrThrow({
    where: { nombre: "Pizza Pepperoni" },
    include: { variantes: true },
  });
  const varianteGrande = pepperoni.variantes.find((v) => v.tamano === "grande");
  const coca = await prisma.producto.findFirstOrThrow({
    where: { nombre: "Coca-Cola 600 ml" },
    include: { variantes: true },
  });
  await prisma.promocion.create({
    data: {
      nombre: "Paquete Amigos",
      descripcion: "Pizza grande Pepperoni + 2 refrescos",
      tipo: "PAQUETE",
      precioEspecial: "199",
      ventaDomicilio: true,
      productos: {
        create: [
          {
            rol: "REQUERIDO",
            productoId: pepperoni.id,
            varianteId: varianteGrande?.id,
            cantidad: 1,
          },
          {
            rol: "REQUERIDO",
            productoId: coca.id,
            varianteId: coca.variantes[0]?.id,
            cantidad: 2,
          },
        ],
      },
    },
  });
  console.log("  Paquete 'Paquete Amigos' creado.");

  // 7. Promo 2x1 de ejemplo: martes, cualquier pizza; el regalo se elige al vender
  await prisma.promocion.create({
    data: {
      nombre: "2x1 Martes de Pizza",
      descripcion: "Compra cualquier pizza y llévate otra gratis (se cobra la más cara)",
      tipo: "DOS_POR_UNO",
      precioEspecial: null,
      diasSemana: [2], // martes
      productos: {
        create: [
          { rol: "REQUERIDO", productoId: null }, // el usuario elige la pizza comprada
          { rol: "REGALO", productoId: null }, // el usuario elige la pizza regalo
        ],
      },
    },
  });
  console.log("  Promoción '2x1 Martes de Pizza' creada.");

  console.log("\nSeed completado ✔");
  console.log(`  Acceso admin: ${ADMIN_EMAIL} (contraseña y PIN: los de tu .env)`);
}

main()
  .catch((e) => {
    console.error("Error en el seed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
