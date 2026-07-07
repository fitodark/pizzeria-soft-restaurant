import "dotenv/config";
import { defineConfig } from "prisma/config";

// Todas las tablas del POS viven en un esquema dedicado, fuera de `public`
// (no queda expuesto en la Data API de Supabase). Debe coincidir con el
// esquema del adaptador en src/lib/db.ts.
export const ESQUEMA_BD = "schema_barbosa_v2";

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  throw new Error("Falta la variable de entorno DIRECT_URL (ver .env.example)");
}
const separador = directUrl.includes("?") ? "&" : "?";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // La CLI (migrate/db) usa la conexión directa (5432); la app usa el
    // pooler (DATABASE_URL) vía @prisma/adapter-pg en src/lib/db.ts.
    url: `${directUrl}${separador}schema=${ESQUEMA_BD}`,
  },
});
