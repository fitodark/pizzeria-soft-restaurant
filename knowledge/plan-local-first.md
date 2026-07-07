# Plan: operación sin internet (local-first) con sincronización a la nube

**Fecha**: 2026-07-06 · **Motivación**: el cliente reporta fallas de internet en ciertos horarios; el POS debe generar ventas sin conexión y actualizar la nube después.

**Arquitectura objetivo**: cada sucursal opera contra un **PostgreSQL local** (misma máquina que el servidor Next.js, ya empaquetado con NSSM). La nube (Supabase) deja de ser requisito de disponibilidad y pasa a ser el **consolidado**: recibe las operaciones de cada sucursal y distribuye el catálogo. Sin internet, la sucursal trabaja al 100%; al volver la conexión, el job de sincronización empareja.

```
   SUCURSAL A                      NUBE (Supabase)                SUCURSAL B
┌───────────────┐   sube ops    ┌─────────────────┐   sube ops  ┌───────────────┐
│ Next.js + PG  │ ────────────► │  consolidado    │ ◄────────── │ Next.js + PG  │
│ local (NSSM)  │ ◄──────────── │  + catálogo     │ ──────────► │ local (NSSM)  │
└───────────────┘  baja catálogo└─────────────────┘ baja catálogo└───────────────┘
```

**Por qué no hay conflictos**: las escrituras operativas están particionadas por `sucursal_id` (ventas, cortes, folios, inventario, movimientos) — cada sucursal es la única dueña de sus filas. El catálogo viaja solo de bajada. Los UUID se generan localmente, no colisionan. La única tabla compartida de escritura es `clientes` (ver riesgos).

---

## Fase 0 — Preparativos (½ día) · *desplegable por sí sola*

1. **`git init` + commit inicial** (pendiente desde el empaquetado; indispensable antes de una cirugía de este tamaño).
2. Instalar **PostgreSQL 17** en el servidor de sucursal como servicio de Windows; crear BD `barbosa` con esquema `schema_barbosa_v2`.
3. Migrar datos: `pg_dump --schema=schema_barbosa_v2` desde Supabase (DIRECT_URL, puerto 5432) → `pg_restore` local. Verificar conteos por tabla.
4. `.env`: `DATABASE_URL` y `DIRECT_URL` → `postgresql://…@localhost:5432/barbosa` (el pooler 6543 ya no aplica).
5. Smoke test: `pnpm dev` + suite `pnpm test:e2e` (4 flujos) contra el Postgres local.

> Rollback trivial: regresar el `.env` a Supabase. En esta fase la nube sigue siendo la fuente de verdad; lo local es ensayo.
> ⚠️ Hasta completar la Fase 1, el login sigue necesitando internet (Supabase Auth).

## Fase 1 — Autenticación propia (1–2 días) · *elimina la última dependencia de internet*

**Esquema** (migración):
- `Perfil`: agregar `email String @unique` y `password_hash String`.
- Nueva tabla `sesiones`: `id`, `token_hash` (único), `usuario_id`, `expira_at`, `created_at`, `revocada_at?`.

**Código** (los 7 puntos de acople detectados):

| Archivo | Cambio |
|---|---|
| `src/lib/supabase/{server,client,admin}.ts` | Se eliminan |
| `src/lib/auth.ts` | `getPerfilAutenticado` lee cookie `sesion` → busca token (hash) en `sesiones` → perfil. Sin llamadas de red |
| `src/proxy.ts` | Valida cookie de sesión contra BD local (consulta indexada, en LAN es <1 ms); expiración deslizante |
| `src/lib/acciones/auth.ts` | `iniciarSesion`: `bcrypt.compare` (bcryptjs ya está en deps por el PIN) + crear sesión; `cerrarSesion`: revocar |
| `src/lib/acciones/usuarios.ts` | Alta/edición de usuarios escribe email + `password_hash` en `Perfil` (la "eliminación" ya era inactivación) |
| `prisma/seed.ts` | Admin con email/hash directo, sin API de Supabase |
| `package.json` | Quitar `@supabase/ssr` y `@supabase/supabase-js`; quitar las 3 variables `SUPABASE_*` de `.env` |

**Migración de usuarios existentes**: los `Perfil.id` se conservan (eran los UUID de `auth.users` y son las PK de toda la auditoría). Script único que copia los emails desde Supabase Auth y asigna contraseñas temporales con cambio forzado al primer login.

**Seguridad mínima**: límite de intentos de login (contador + espera), tokens de sesión aleatorios de 32 bytes guardados hasheados, expiración 12 h deslizante. Las cookies siguen `secure:false` por el POS en LAN http (ya documentado en el código).

**Pruebas**: actualizar `e2e/helpers.ts` (`iniciarSesion`) y correr la suite completa. Al cierre de esta fase: **desconectar el cable de red y operar una venta completa** — criterio de aceptación de toda la iniciativa.

## Fase 2 — Sincronización con la nube (1½–2 días)

**Mecanismo**: script `scripts/sincronizar.ts` (tsx) con dos clientes Prisma (local + nube vía `NUBE_DIRECT_URL`, variable que solo usa este job). Corre como segundo servicio NSSM cada 5 min; si no hay internet, falla silencioso y reintenta. **Idempotente**: todo por `upsert` sobre las mismas PK UUID.

**Prerrequisito** (migración pequeña): agregar `updated_at @updatedAt` a las tablas operativas que mutan después de crearse y hoy no lo tienen: `ventas`, `venta_detalles`, `cortes_caja`, `cliente_direcciones`, `producto_variantes`, `promocion_productos`, `configuracion_sucursal`. (Las de solo-inserción — movimientos, mitades, compra_detalles — sincronizan por `created_at`.)

**Subida (sucursal → nube)** — filas propias, marca de agua por `updated_at`/`created_at` guardada en tabla local `sync_estado`:
`ventas`, `venta_detalles`, `venta_detalle_mitades`, `cortes_caja`, `movimientos_corte`, `inventario`, `movimientos_inventario`, `compras_proveedor(+detalles)`, `folio_contadores`, y `clientes`/`cliente_direcciones` creados o editados localmente.

**Bajada (nube → sucursal)**:
`productos`, `producto_variantes`, `promociones`, `promocion_productos`, `perfiles`, `usuario_sucursal`, `sucursales`, `configuracion_sucursal`, y `clientes` de otras sucursales.

**Reglas de oro** (evitan conflictos por diseño):
1. La nube **nunca** modifica filas operativas de una sucursal; solo las recibe.
2. El **catálogo, promociones y usuarios se editan únicamente en la sucursal matriz** (definir cuál); las demás lo reciben de bajada. La UI ya restringe por rol; se agrega un candado por sucursal (`ConfiguracionSucursal.es_matriz` o variable de entorno) que oculta esos módulos fuera de la matriz.
3. `clientes` es la única tabla de escritura compartida: se acepta *last-write-wins* por `updated_at` (edición concurrente del mismo cliente en dos sucursales el mismo minuto es un caso marginal; nada se borra físicamente, el riesgo es mínimo).

**Se evaluó y descartó**: replicación lógica nativa de Postgres (complejidad de filtrado por sucursal y catálogo bidireccional injustificable para el volumen de un POS: cientos de filas/día) y motores de sync tipo PowerSync/ElectricSQL (rearquitectura client-side que no aplica: aquí las mutaciones viven en server actions).

## Fase 3 — Respaldos y visibilidad (½–1 día)

1. **Respaldo local**: tarea programada diaria `pg_dump` a carpeta local con retención de 14 días (mismo esquema NSSM/Task Scheduler ya usado). La sincronización a la nube funge como segundo respaldo lógico continuo.
2. **Indicador de sincronización** en `/configuracion`: última sync exitosa, operaciones pendientes de subir; badge de advertencia en el layout si lleva > 2 h sin sincronizar (para que el encargado sepa que está operando offline).

## Fase 4 — Failover LTE (operativo, sin código)

Router dual-WAN con SIM de datos (~$1,500–3,000 MXN + plan). No es requisito para operar (la sucursal ya no depende de internet), pero acorta la ventana en que el consolidado va atrasado y mantiene el acceso remoto del administrador.

---

## Ventana de corte (por sucursal, ~30 min, fuera de horario)

1. Cerrar corte de caja del día y verificar que no haya ventas PENDIENTES.
2. Dump final de Supabase → restore local → cambiar `.env` → reiniciar servicio NSSM.
3. Validación: login, venta de prueba, impresión, corte.
4. A partir de aquí Supabase solo recibe del job de sync. Rollback (solo antes de la primera venta local): revertir `.env`.

## Estimación y orden

| Fase | Esfuerzo | Desplegable sola |
|---|---|---|
| 0 · Postgres local + datos | ½ día | Sí (ensayo) |
| 1 · Auth propia | 1–2 días | Sí (criterio: operar sin cable de red) |
| 2 · Sincronización | 1½–2 días | Sí |
| 3 · Respaldos + indicador | ½–1 día | Sí |
| 4 · Failover LTE | compra/instalación | Independiente |
| **Total desarrollo** | **4–6 días** | |

## Decisiones que debe confirmar el negocio antes de la Fase 2

- [ ] **¿Cuál sucursal es la matriz** (donde se edita catálogo, promociones y usuarios)?
- [ ] **¿Supabase se queda como nube consolidada?** (recomendado: ya funciona y su plan actual lo cubre; alternativa: un Postgres central propio, mismo job de sync apuntando a otra URL).
- [ ] **Emails reales de los usuarios** para el login local (hoy solo el admin tiene email en Supabase Auth).
- [ ] Frecuencia de sincronización (propuesta: 5 min) y umbral de alerta offline (propuesta: 2 h).
