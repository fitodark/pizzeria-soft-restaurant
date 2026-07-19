# Pizzería Barbosa — POS

Sistema POS web multi-sucursal para pizzería: ventas en establecimiento y a domicilio, inventario, promociones, cortes de caja con auditoría e impresión de tickets térmicos ESC/POS. Servidor Next.js local por sucursal + **PostgreSQL local** (local-first; Supabase queda como nube consolidada para la Fase 2 de sincronización). Todo en español: UI, mensajes, dominio.

## Comandos

- `pnpm dev` — Servidor de desarrollo
- `pnpm build` — Build de producción (standalone)
- `pnpm lint` — Linter
- `pnpm test` — Tests unitarios (Vitest)
- `pnpm test:e2e` — Playwright
- `pnpm prisma migrate dev` — Crear/aplicar migraciones (usa DIRECT_URL)
- `pnpm db:seed` — Seed (admin, sucursal demo, catálogo ejemplo)

## Stack

Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui + PostgreSQL local (18, puerto 5433) + Prisma + auth propia (bcrypt + tabla `sesiones`) + node-thermal-printer (ESC/POS TCP:9100) + Vitest/Playwright

## Arquitectura

### Estructura
- `src/app/(dashboard)/` — Módulos: ventas, clientes, productos, inventario, promociones, cortes, compras, sucursales, usuarios, reportes, configuracion
- `src/lib/acciones/` — Server actions por dominio; TODA mutación vive aquí
- `src/lib/precios.ts` — Reglas de precios (única fuente de verdad, con tests)
- `src/lib/permisos.ts` — Matriz rol → acción; validar en cada action
- `src/lib/impresion/` — escpos.ts (transporte TCP/share) + tickets.ts (4 plantillas)
- `prisma/schema.prisma` — Esquema completo (ver blueprint sección 4)

### Flujo de datos
Server Components consultan Prisma directo (sin caché — el POS necesita datos frescos). Mutaciones vía server actions: validar Zod → `getSesion()` → `verificarPermiso()` → transacción Prisma → `revalidatePath()`. El cliente NUNCA envía precios; el servidor los calcula desde `producto_variantes`.

### Patrones clave
- Sesión: auth propia — login con `Perfil.email` + `password_hash` (bcrypt), token aleatorio en cookie httpOnly `sesion` cuyo sha256 vive en la tabla `sesiones` (12 h deslizantes, revocable); helpers en `lib/sesiones.ts`; sucursal activa en cookie `sucursal_activa`; `getSesion()` en `lib/auth.ts` devuelve `{ usuario, rol, sucursalId }`
- Auditoría: nada se borra físicamente — bandera `activo` + `usuario_inactivo_id` + `fecha_inactivacion`. Solo ADMINISTRADOR ve inactivos
- Pizza personalizada: línea `PIZZA_PERSONALIZADA` con 2 mitades (productos `es_especialidad`); precio = mitad más cara en ese tamaño
- Alitas: sabores = productos categoría `alitas` con órdenes por piezas como variantes (7/10/14/20 pzas, precio fijo por tamaño); combinadas = línea `ALITAS_PERSONALIZADAS` con 2-3 sabores en `venta_detalle_mitades`, límite por `max_sabores` de la variante (7→1, 10→2, 14/20→3)
- Extras: productos `tipo_articulo = EXTRA`, líneas hijas vía `parent_detalle_id`; quitar ingredientes = nota de texto, no descuenta
- Un corte ABIERTO por sucursal (índice único parcial en BD)
- Todas las tablas viven en el esquema `schema_barbosa_v2` de Postgres (no en `public`). El nombre se declara en `prisma.config.ts` (CLI) y `src/lib/db.ts` (runtime) — deben coincidir
- Impresión server-side; si falla, la venta ya está guardada — ofrecer reimpresión

## Reglas de Código

1. Un componente por archivo, máx 300 líneas.
2. Alias `@/` para imports desde `src/`.
3. Server Components por defecto; `"use client"` solo en wizard, dialogs y formularios.
4. Dinero: `Decimal` de Prisma; jamás `number` flotante en cálculos de precios.
5. Todo texto visible al usuario en español (es-MX): botones, errores, toasts, tickets.

## Sistema de Diseño

- Primary `#DC2626` · Secondary `#EA580C` · Background `#FAFAF9` · Surface `#FFFFFF` · Text `#1C1917` · Muted `#78716C` (bordes `#E7E5E4`) · Destructive `#B91C1C` · Success `#16A34A`
- Inter; headings 600; montos con `tabular-nums` alineados a la derecha
- Radius 8px (cards 12px); sombras sutiles; targets táctiles ≥ 44px; modo claro; diseñar para 1366×768

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Postgres local de la sucursal (18 en `localhost:5433/barbosa`) |
| `DIRECT_URL` | Igual que `DATABASE_URL` en local (Prisma la usa para migraciones) |
| `NUBE_DIRECT_URL` | Postgres del consolidado en la nube — solo el job de sync (Fase 2) y el backfill único |
| `SEED_ADMIN_EMAIL/PASSWORD/PIN` | Credenciales del admin inicial — obligatorias para `pnpm db:seed`; rotar con `scripts/rotar-credenciales.ts` |

## Reglas No Negociables

1. Precios SIEMPRE calculados en servidor desde `producto_variantes`; snapshot en `venta_detalles.precio_unitario`.
2. Nada se borra físicamente: inactivación con auditoría (quién, cuándo). Inactivar líneas de venta exige PIN.
3. Toda mutación de venta/corte/inventario en una transacción Prisma.
4. Autorización por rol en el servidor (`lib/permisos.ts`) en cada action — la UI solo oculta, nunca protege.
5. Ventas DOMICILIO exigen cliente + dirección; validar banderas de canal de productos y promos en servidor.
6. Nunca `window.print()` — impresión solo server-side vía `lib/impresion/`.
7. No commitear `.env`; las URLs de BD (local y nube) jamás en código cliente.
