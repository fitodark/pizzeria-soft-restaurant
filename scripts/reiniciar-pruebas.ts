import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Reinicio a carga inicial para escenarios de prueba (pedido de QA):
 * borra TODO lo operativo — ventas, cortes, compras, movimientos y
 * CLIENTES — y conserva lo que un escenario necesita para arrancar:
 * menú (productos/variantes/promociones), sucursales, usuarios,
 * configuración e impresoras, días festivos y sesiones activas.
 * Folios regresan a 1 y el inventario queda con existencia inicial
 * (movimiento AJUSTE auditado, como el seed).
 *
 *   pnpm tsx scripts/reiniciar-pruebas.ts --confirmar
 *   pnpm tsx scripts/reiniciar-pruebas.ts --confirmar --existencia 50
 *   pnpm tsx scripts/reiniciar-pruebas.ts --confirmar --clientes-demo
 *
 * --clientes-demo recrea a Juan Pérez y Ana Prueba (los usa la suite
 * E2E de desarrollo); QA normalmente NO lo necesita.
 *
 * ⚠️ Borra la operación de TODAS las sucursales de la BD apuntada por
 * DIRECT_URL. Nunca ejecutarlo con una operación real en curso.
 */

// Debe coincidir con prisma.config.ts y src/lib/db.ts
const ESQUEMA_BD = "schema_barbosa_v2";

function leerArgumento(nombre: string): string | null {
  const indice = process.argv.indexOf(`--${nombre}`);
  if (indice === -1 || indice + 1 >= process.argv.length) return null;
  return process.argv[indice + 1];
}

const EXISTENCIA_INICIAL = leerArgumento("existencia") ?? "24";

async function main() {
  if (!process.argv.includes("--confirmar")) {
    console.error("Este script BORRA ventas, cortes, compras, movimientos y clientes.");
    console.error("Conserva menú, sucursales, usuarios, configuración y festivos.");
    console.error("\nPara ejecutarlo de verdad:  pnpm tsx scripts/reiniciar-pruebas.ts --confirmar");
    process.exit(1);
  }
  if (!/^\d+(\.\d+)?$/.test(EXISTENCIA_INICIAL)) {
    console.error(`--existencia inválida: ${EXISTENCIA_INICIAL}`);
    process.exit(1);
  }

  const adapter = new PrismaPg(
    { connectionString: process.env.DIRECT_URL },
    { schema: ESQUEMA_BD }
  );
  const prisma = new PrismaClient({ adapter });

  try {
    const admin = await prisma.perfil.findFirst({
      where: { rol: "ADMINISTRADOR", activo: true },
      orderBy: { createdAt: "asc" },
    });
    if (!admin) {
      throw new Error("No hay un ADMINISTRADOR activo para firmar los ajustes de inventario.");
    }

    console.log("Reiniciando la base a carga inicial…");

    await prisma.$transaction(async (tx) => {
      // Operación de venta (mitades → detalles → movimientos de corte → ventas)
      await tx.ventaDetalleMitad.deleteMany();
      await tx.ventaDetalle.updateMany({ data: { parentDetalleId: null } });
      await tx.ventaDetalle.deleteMany();
      await tx.movimientoCorte.deleteMany();
      await tx.venta.deleteMany();

      // Compras y cortes
      await tx.compraDetalle.deleteMany();
      await tx.compraProveedor.deleteMany();
      await tx.corteCaja.deleteMany();

      // Inventario: historial fuera y existencia inicial auditada
      await tx.movimientoInventario.deleteMany();
      await tx.inventario.updateMany({ data: { existencia: EXISTENCIA_INICIAL } });
      const inventarios = await tx.inventario.findMany({
        select: { sucursalId: true, productoId: true },
      });
      if (inventarios.length > 0) {
        await tx.movimientoInventario.createMany({
          data: inventarios.map((inv) => ({
            sucursalId: inv.sucursalId,
            productoId: inv.productoId,
            tipo: "AJUSTE" as const,
            cantidad: EXISTENCIA_INICIAL,
            referencia: "Carga inicial (reinicio de pruebas)",
            usuarioId: admin.id,
          })),
        });
      }

      // Clientes desde cero
      await tx.clienteDireccion.deleteMany();
      await tx.cliente.deleteMany();

      // Folios reinician en 1 por sucursal
      await tx.folioContador.updateMany({ data: { siguiente: 1 } });
    });

    if (process.argv.includes("--clientes-demo")) {
      // Datos que asume la suite E2E de desarrollo (flujo 2 y typeahead)
      await prisma.cliente.create({
        data: {
          nombre: "Juan Pérez",
          telefono: "3311122233",
          direcciones: {
            create: [
              { direccion: "Av. Vallarta 205, Americana" },
              { direccion: "Calle Hidalgo 10, Centro" },
            ],
          },
        },
      });
      await prisma.cliente.create({
        data: {
          nombre: "Ana Prueba",
          telefono: "3399988877",
          direcciones: { create: { direccion: "Calle Morelos 55, Centro" } },
        },
      });
      console.log("  Clientes demo (Juan Pérez, Ana Prueba) recreados.");
    }

    const [productos, sucursales, perfiles, inventario] = await Promise.all([
      prisma.producto.count(),
      prisma.sucursal.count(),
      prisma.perfil.count(),
      prisma.inventario.count(),
    ]);
    console.log("\nReinicio completado ✔");
    console.log(`  Conservado: ${productos} productos, ${sucursales} sucursales, ${perfiles} usuarios, ${inventario} artículos de inventario (existencia ${EXISTENCIA_INICIAL}).`);
    console.log("  En cero: ventas, cortes, compras, movimientos, clientes; folios en 1.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
