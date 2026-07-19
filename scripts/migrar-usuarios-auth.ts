import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Migración única de usuarios (Fase 1 local-first): copia email y hash de
 * contraseña desde `auth.users` de Supabase a los perfiles de la BD activa
 * (DIRECT_URL). Los hashes de Supabase Auth son bcrypt ($2a$10$…), el mismo
 * formato que compara bcryptjs: cada usuario conserva su contraseña.
 *
 *   NUBE_DIRECT_URL="postgresql://...supabase...:5432/postgres" \
 *     pnpm tsx scripts/migrar-usuarios-auth.ts
 *
 * Idempotente: repetirla vuelve a copiar los valores vigentes en la nube.
 */

// Debe coincidir con prisma.config.ts y src/lib/db.ts
const ESQUEMA_BD = "schema_barbosa_v2";

function clientePara(url: string | undefined, nombre: string): PrismaClient {
  if (!url) {
    throw new Error(`Falta la variable ${nombre} en el entorno.`);
  }
  const adapter = new PrismaPg({ connectionString: url }, { schema: ESQUEMA_BD });
  return new PrismaClient({ adapter });
}

async function main() {
  const nube = clientePara(process.env.NUBE_DIRECT_URL, "NUBE_DIRECT_URL");
  const local = clientePara(process.env.DIRECT_URL, "DIRECT_URL");

  try {
    const usuariosAuth = await nube.$queryRaw<
      { id: string; email: string; encrypted_password: string | null }[]
    >`select id::text, email, encrypted_password from auth.users where email is not null`;
    console.log(`Auth de Supabase: ${usuariosAuth.length} usuario(s) con email.`);

    const porId = new Map(usuariosAuth.map((u) => [u.id, u]));
    const perfiles = await local.perfil.findMany({
      select: { id: true, nombre: true, email: true },
    });

    let migrados = 0;
    for (const perfil of perfiles) {
      const auth = porId.get(perfil.id);
      if (!auth) {
        console.warn(
          `  ⚠️  ${perfil.nombre} (${perfil.id}) no existe en auth.users — quedará SIN acceso hasta asignarle credenciales en /usuarios.`
        );
        continue;
      }
      if (!auth.encrypted_password?.startsWith("$2")) {
        console.warn(
          `  ⚠️  ${perfil.nombre}: hash no-bcrypt en Auth — asignarle contraseña con scripts/rotar-credenciales.ts.`
        );
      }
      await local.perfil.update({
        where: { id: perfil.id },
        data: {
          email: auth.email.toLowerCase(),
          ...(auth.encrypted_password?.startsWith("$2")
            ? { passwordHash: auth.encrypted_password }
            : {}),
        },
      });
      console.log(`  ✔ ${perfil.nombre} → ${auth.email.toLowerCase()}`);
      migrados += 1;
    }
    console.log(`\nMigrados ${migrados}/${perfiles.length} perfiles.`);
  } finally {
    await nube.$disconnect();
    await local.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
