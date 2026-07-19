import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Rota la contraseña y/o el PIN de un usuario (auth propia, todo en Perfil).
 * Pensado para el checklist de go-live (plan de puesta en producción, A.1):
 * rotar las credenciales del seed sin entrar a la UI. Revoca las sesiones
 * activas del usuario al cambiar la contraseña.
 *
 *   pnpm tsx scripts/rotar-credenciales.ts --email admin@... --password "NuevaSegura123" --pin 9876
 *   pnpm tsx scripts/rotar-credenciales.ts --email admin@... --generar          # contraseña aleatoria
 *   pnpm tsx scripts/rotar-credenciales.ts --email admin@... --pin 9876         # solo el PIN
 */

// Debe coincidir con prisma.config.ts y src/lib/db.ts
const ESQUEMA_BD = "schema_barbosa_v2";

function leerArgumento(nombre: string): string | null {
  const indice = process.argv.indexOf(`--${nombre}`);
  if (indice === -1 || indice + 1 >= process.argv.length) return null;
  return process.argv[indice + 1];
}

function uso(mensaje: string): never {
  console.error(`Error: ${mensaje}\n`);
  console.error("Uso: pnpm tsx scripts/rotar-credenciales.ts --email <correo> [opciones]");
  console.error("  --password <nueva>   Nueva contraseña (mínimo 10 caracteres)");
  console.error("  --generar            Genera una contraseña aleatoria y la imprime UNA vez");
  console.error("  --pin <4 dígitos>    Nuevo PIN de seguridad");
  process.exit(1);
}

async function main() {
  const email = leerArgumento("email");
  const pin = leerArgumento("pin");
  const generar = process.argv.includes("--generar");
  let password = leerArgumento("password");

  if (!email || !email.includes("@")) {
    uso("falta --email con un correo válido.");
  }
  if (!password && !generar && !pin) {
    uso("indica qué rotar: --password, --generar y/o --pin.");
  }
  if (password && generar) {
    uso("--password y --generar son excluyentes.");
  }
  if (generar) {
    // 18 bytes → 24 caracteres base64url: suficiente entropía, sin símbolos raros
    password = randomBytes(18).toString("base64url");
  }
  if (password && password.length < 10) {
    uso("la contraseña debe tener al menos 10 caracteres.");
  }
  if (pin && !/^\d{4}$/.test(pin)) {
    uso("el PIN son exactamente 4 dígitos.");
  }

  const adapter = new PrismaPg(
    { connectionString: process.env.DIRECT_URL },
    { schema: ESQUEMA_BD }
  );
  const prisma = new PrismaClient({ adapter });

  try {
    const perfil = await prisma.perfil.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, nombre: true, rol: true },
    });
    if (!perfil) {
      throw new Error(`No existe un usuario con el correo ${email}.`);
    }

    console.log(`Rotando credenciales de ${perfil.nombre} (${perfil.rol}) — ${email}`);

    await prisma.$transaction(async (tx) => {
      await tx.perfil.update({
        where: { id: perfil.id },
        data: {
          ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
          ...(pin ? { pinHash: await bcrypt.hash(pin, 10) } : {}),
        },
      });
      if (password) {
        await tx.sesion.updateMany({
          where: { usuarioId: perfil.id, revocadaAt: null },
          data: { revocadaAt: new Date() },
        });
      }
    });

    if (password) {
      console.log("  Contraseña actualizada; sesiones activas revocadas.");
      if (generar) {
        console.log(`  ⚠️  Contraseña generada (guárdala AHORA, no se vuelve a mostrar):`);
        console.log(`      ${password}`);
      }
    }
    if (pin) {
      console.log("  PIN actualizado en el perfil.");
    }

    console.log("Rotación completada ✔");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
