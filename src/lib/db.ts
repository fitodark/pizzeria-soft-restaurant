import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Debe coincidir con ESQUEMA_BD en prisma.config.ts (la CLI de migraciones
// no puede importar desde src/, así que el nombre se declara en ambos).
const ESQUEMA_BD = "schema_barbosa_v2";

function crearCliente() {
  const adapter = new PrismaPg(
    { connectionString: process.env.DATABASE_URL },
    { schema: ESQUEMA_BD }
  );
  return new PrismaClient({ adapter });
}

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Singleton: evita agotar conexiones con el hot-reload de desarrollo.
export const db = globalParaPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = db;
}
