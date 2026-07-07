# Pizzería Barbosa — POS

Sistema de punto de venta web multi-sucursal: ventas en establecimiento y a
domicilio, inventario, promociones, cortes de caja con auditoría, reportes con
export CSV e impresión de tickets térmicos ESC/POS. Cada sucursal corre su
propio servidor Next.js en LAN; todas comparten una base de datos Supabase
(PostgreSQL) en línea.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui ·
Supabase (Postgres + Auth) · Prisma 7 · node-thermal-printer · Vitest ·
Playwright.

## Requisitos

- Windows 10/11 en la PC de la sucursal
- [Node.js 22+](https://nodejs.org) y `pnpm` (`corepack enable`)
- [NSSM](https://nssm.cc) para registrar el servicio de Windows (producción)
- Un proyecto de [Supabase](https://supabase.com) (compartido entre sucursales)
- Impresoras térmicas de 80 mm con puerto de red (TCP 9100) o compartidas por
  Windows

## Desarrollo

```bash
pnpm install
copy .env.example .env   # y llenar credenciales (ver tabla abajo)
pnpm prisma migrate dev  # aplica migraciones (usa DIRECT_URL)
pnpm db:seed             # admin, sucursal demo y catálogo de ejemplo
pnpm dev                 # http://localhost:3000
```

El seed crea el usuario `admin@pizzeriabarbosa.mx` con contraseña
`Barbosa2026!` y PIN `1234` — **cámbialos en producción**.

### Pruebas

```bash
pnpm test       # unitarias (reglas de precios en lib/precios.ts)
pnpm test:e2e   # Playwright: los 3 flujos completos contra el dev server
```

Los E2E usan la base de datos del `.env` y dejan las ventas de prueba
registradas (nada se borra físicamente en este sistema).

## Variables de entorno (`.env`)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Postgres de Supabase vía pooler (puerto 6543) |
| `DIRECT_URL` | Conexión directa (5432), solo para migraciones |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública (solo auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API — solo servidor, jamás en cliente |

Las tablas viven en el esquema Postgres `schema_barbosa_v2` (declarado en
`prisma.config.ts` y `src/lib/db.ts`; deben coincidir).

## Instalación en una sucursal nueva

1. **Alta en el sistema** (desde cualquier sucursal ya operando, como
   administrador): crear la sucursal en `/sucursales` y sus usuarios en
   `/usuarios`.
2. **Clonar y configurar** en la PC de la sucursal:
   ```powershell
   git clone <repo> C:\pizzeria-barbosa
   cd C:\pizzeria-barbosa
   pnpm install
   copy .env.example .env   # llenar con las credenciales del Supabase compartido
   ```
   (No se corre `migrate` ni `seed`: la base ya existe y es compartida.)
3. **Compilar e instalar el servicio** (PowerShell como Administrador):
   ```powershell
   pnpm build
   .\scripts\install-service.ps1          # servicio "PizzeriaBarbosa" en :3000
   # opciones: -Puerto 8080 -RutaNssm "C:\herramientas\nssm.exe"
   ```
   El servicio inicia automáticamente con Windows y escucha en toda la LAN
   (`http://<ip-de-la-pc>:3000`). Logs en `.\logs\`.
4. **Configurar impresoras**: entrar como administrador o encargado a
   `/configuracion`, capturar las 3 impresoras (principal, cocina y barra) con
   su modo y ruta, y usar **"Imprimir prueba"** en cada una:
   - Modo **Red**: IP de la impresora, ej. `192.168.1.50` (puerto opcional
     `:9100`).
   - Modo **Compartida Windows**: `\\EQUIPO\NombreCompartido`.
5. **Abrir el corte de caja** en `/cortes` y empezar a vender.

## Actualización de una sucursal

```powershell
.\scripts\update.ps1   # git pull + deps + migraciones + build + reinicio
```

## Estructura

- `src/app/(dashboard)/` — módulos: ventas, clientes, productos, inventario,
  promociones, cortes, compras, sucursales, usuarios, reportes, configuración
- `src/lib/acciones/` — server actions (toda mutación pasa por aquí)
- `src/lib/precios.ts` — reglas de precios, única fuente de verdad (con tests)
- `src/lib/permisos.ts` — matriz rol → acción, validada en cada action
- `src/lib/impresion/` — ESC/POS: transporte (tcp/share), 4 plantillas y
  orquestación (un fallo de impresora nunca pierde la venta)
- `prisma/schema.prisma` — esquema completo; `e2e/` — flujos Playwright;
  `scripts/` — instalación y actualización del servicio

Reglas de trabajo del código en [`CLAUDE.md`](./CLAUDE.md).
