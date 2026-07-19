# Plan de puesta en producción (local-first)

**Fecha**: 2026-07-11 · **Actualizado**: 2026-07-18 · **Estado del sistema**: blueprint completo; QA probando módulos; **fases 0 y 1 de `plan-local-first.md` terminadas** (Postgres local + auth propia, commit `40186e2`).

> **Cambio estructural respecto a la versión anterior de este plan**: la "Etapa A —
> producción con Supabase" quedó **obsoleta**. Desde el commit `40186e2` el código ya
> no usa Supabase Auth: el login valida contra la BD (bcrypt + tabla `sesiones`) y el
> POS opera 100 % sin internet (criterio de la Fase 1, verificado con monitor de
> conexiones: una venta completa solo toca `localhost`). Toda instalación nueva es
> **local-first desde el día uno**. Supabase queda únicamente como **nube consolidada**
> para la Fase 2 (sincronización) y como origen del backfill de usuarios históricos.

```
QA libera ──► go-live local-first por sucursal (matriz primero) ──► operación sin internet
                                                  │
              desarrollo Fase 2 (sync, 1½–2 días) ┤
                                                  ▼
              job de sync NSSM cada 5 min ──► Supabase = consolidado + catálogo de bajada
```

---

## 1. Prerrequisitos por sucursal

| Recurso | Detalle |
|---|---|
| Servidor de sucursal | PC Windows 10/11 dedicada o semi-dedicada; 8 GB RAM recomendado; disco ≥ 10 GB libres |
| Software base | Node.js LTS (20+), pnpm, git, NSSM (https://nssm.cc) en PATH |
| **PostgreSQL 18** | Instancia propia en puerto **5433**, lado a lado con el 9.5 existente (NO tocarlo): instalador EDB, servicio `postgresql-x64-18`, data dir propio. Lineamientos de convivencia en `plan-local-first.md` |
| Red | IP fija del servidor en la LAN — cajas/tablets e impresoras la usan. Internet solo hace falta para la sincronización (Fase 2), no para operar |
| Impresoras térmicas | ESC/POS en red (TCP 9100) o compartidas de Windows; hasta 3 por sucursal (principal/cocina/bebidas) |
| Terminales | Navegador en la LAN a `http://IP-del-servidor:3000`; diseño validado a 1366×768, targets ≥ 44 px |

## 2. Checklist de endurecimiento (antes del go-live, una sola vez)

1. **Visto bueno de QA** de todos los módulos.
2. **Credenciales**:
   - Rotar contraseña y PIN del admin con `pnpm tsx scripts/rotar-credenciales.ts --email <correo> --generar --pin <nuevo>` (todo local: escribe `password_hash`/`pin_hash` en `perfiles` y revoca sesiones vivas) o desde `/usuarios`.
   - Alta de usuarios reales (encargados, meseros, repartidores) con emails y PINes propios en `/usuarios` — el alta ya escribe email + hash local, sin servicios externos.
   - Inactivar los usuarios demo (`maria@…`, `pedro@…`).
3. **Limpieza de datos de prueba** (si producción parte de la BD de desarrollo): `scripts/cargar-menu.ts` recarga el menú y **borra todo lo operativo** — solo en la ventana, nunca con operación en curso. Con BD nueva (punto 3-bis) es innecesario.
4. **Catálogo y configuración**: precios validados contra el Excel, festivos del año, sucursales reales, impresoras reales + **prueba física con "Imprimir prueba"** (pendiente conocido), logo y leyenda del ticket.
5. **`.env` de producción por sucursal** (nunca se commitea):
   - `DATABASE_URL` y `DIRECT_URL` → `postgresql://postgres:<password>@localhost:5433/barbosa`.
   - `NUBE_DIRECT_URL` → Postgres del consolidado (solo lo usan el job de sync de la Fase 2 y el backfill único de usuarios).
   - `SEED_ADMIN_EMAIL/PASSWORD/PIN` — solo si la BD nace vacía (el seed falla sin ellas); pueden quitarse tras el bootstrap.
   - Ya **no existen** variables `SUPABASE_*`.
6. **Seguridad de red**: puerto 3000 abierto solo a la LAN (perfil privado del firewall); el 5433 NO se abre salvo acceso controlado (p. ej. el equipo de QA en desarrollo); nada se publica a internet.
7. **Respaldo**: tarea programada diaria de `pg_dump --schema=schema_barbosa_v2` con los **binarios 18** (`C:\Program Files\PostgreSQL\18\bin`), retención 14 días (se formaliza en Fase 3). La sync a la nube (Fase 2) es el segundo respaldo continuo.

### 2-bis. Bootstrap de una BD nueva (sucursal que nace en cero)

```powershell
pnpm prisma migrate deploy      # crea schema_barbosa_v2 completo (11 migraciones, incluye auth propia)
pnpm db:seed                    # admin real (SEED_ADMIN_*: email + hash bcrypt local) + catálogo demo
pnpm tsx scripts/cargar-menu.ts # reemplaza el demo por el menú real (164 productos)
```

Después, desde la app: sucursales, usuarios, impresoras y festivos. Las credenciales del admin nacen con los valores definitivos del `.env`: no hace falta rotarlas.

### 2-ter. Migración de una BD existente en Supabase (nuestro caso)

```powershell
# 1. Dump del esquema con binarios 18 (el pg_dump 9.5 NO puede volcar servidores nuevos)
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" --dbname="<NUBE_DIRECT_URL>" `
    --schema=schema_barbosa_v2 --format=custom --no-owner --no-privileges --file=barbosa.dump

# 2. Restore a la instancia local
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" "postgresql://postgres:<pwd>@localhost:5433/postgres" -c "CREATE DATABASE barbosa;"
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --dbname="postgresql://postgres:<pwd>@localhost:5433/barbosa" `
    --no-owner --no-privileges --exit-on-error barbosa.dump

# 3. Migraciones pendientes (la nube no tiene la de auth propia) + usuarios
pnpm prisma migrate deploy
npx tsx scripts/migrar-usuarios-auth.ts   # copia email + hash bcrypt desde auth.users de Supabase
                                          # (los usuarios conservan su contraseña; requiere NUBE_DIRECT_URL)
```

Verificar conteos por tabla contra la nube (ventas, detalles, cortes, clientes, productos) antes de dar el paso por bueno.

## 3. Runbook de instalación por sucursal (~1 h + instalación de PG)

```powershell
# 0. PostgreSQL 18 en puerto 5433 (instalador EDB; NO tocar la instancia 9.5 del 5432)
#    Verificar antes: netstat -ano | findstr :5433   (puerto libre)

# 1. Código
git clone https://github.com/fitodark/pizzeria-soft-restaurant.git C:\pos\pizzeria
cd C:\pos\pizzeria
pnpm install --frozen-lockfile

# 2. Credenciales: copiar el .env de la sucursal (punto 2.5)

# 3. Base de datos: bootstrap (2-bis) o migración desde la nube (2-ter)

# 4. Build y servicio de Windows (como Administrador)
pnpm build
.\scripts\install-service.ps1        # registra "PizzeriaBarbosa" con NSSM,
                                     # copia estáticos + .env al standalone,
                                     # inicio automático, logs en \logs
```

Verificación post-instalación:
- `http://localhost:3000` responde y `http://IP:3000` desde una terminal de la LAN.
- **Login local** (sin internet: desconectar el cable y volver a entrar es la prueba definitiva).
- "Imprimir prueba" en las 3 impresoras desde `/configuracion`.
- Reinicio de la PC → levantan solos el servicio del POS **y** el servicio `postgresql-x64-18`.

Notas:
- Los `.ps1` del repo llevan **UTF-8 con BOM** (acentos); no re-guardarlos con otra codificación.
- Si el servicio no arranca: `logs\servicio-error.log`; causas típicas: `.env` ausente en `.next\standalone` (re-correr `install-service.ps1`) o Postgres local abajo.

## 4. Día del go-live (por sucursal)

1. Ventana previa (sin operación): datos migrados/limpios y catálogo verificado.
2. Abrir corte de caja con el fondo real.
3. **Venta piloto completa** de cada tipo: mostrador, mesa con segunda ronda, domicilio con repartidor; cobro en efectivo con Enter y una transferencia; una cancelación con motivo.
4. Verificar comandas en cocina/barra y tickets en la principal.
5. Al cierre del primer día: corte completo y validación contra efectivo físico.
6. Verificar que el respaldo diario local se generó.

## 5. Operación y actualizaciones

- **Actualizar la app** (fuera de horario, como Administrador): `.\scripts\update.ps1` — `git pull`, dependencias, `prisma migrate deploy` (contra el Postgres **local de cada sucursal**), build y reinicio del servicio.
- **Logs**: `logs\servicio.log` / `logs\servicio-error.log` (rotación a 10 MB).
- **Incidencias previstas**:
  - *Falla la impresora al vender*: la venta ya está guardada; "Reimprimir" desde el detalle.
  - *Se cae internet*: **la sucursal opera al 100 %** (BD y auth locales). Solo se pausa la sincronización (Fase 2), que reintenta sola al volver la conexión.
  - *Falla el servidor de sucursal*: reinstalar con el runbook (~1 h) + restore del último respaldo diario local (o del consolidado en la nube cuando la Fase 2 esté activa). **Aquí sí hay datos locales**: el respaldo diario es obligatorio, no opcional.

## 6. Fase 2 pendiente: sincronización con la nube

Cuando se desarrolle (1½–2 días, ver `plan-local-first.md`):
- Segundo servicio NSSM con `scripts/sincronizar.ts` cada 5 min (sube operación propia, baja catálogo).
- El catálogo/promociones/usuarios se editan **solo en la sucursal matriz** (candado por sucursal).
- Indicador de última sync en `/configuracion` + badge si lleva > 2 h sin sincronizar (Fase 3).

**Decisiones de negocio que la bloquean** (sin cambios):
- [ ] ¿Cuál sucursal es la **matriz**?
- [ ] ¿Supabase se queda como nube consolidada? (recomendado)
- [ ] Emails reales de los usuarios.
- [ ] Frecuencia de sync (propuesta 5 min) y umbral de alerta offline (propuesta 2 h).

## 7. Pruebas desde la carga inicial (reinicio para QA)

Para arrancar un **escenario de pruebas desde cero** — alta de clientes desde cero,
cortes de caja desde cero, folios desde 1 — sin perder la carga inicial operativa:

```powershell
pnpm tsx scripts/reiniciar-pruebas.ts --confirmar
```

| Queda EN CERO | Se CONSERVA |
|---|---|
| Ventas (detalles y mitades) | Menú completo: 164 productos / 438 variantes / 12 promociones |
| Cortes de caja y sus movimientos | Sucursales, configuración e impresoras |
| Compras a proveedor | Usuarios, roles y PINes (y sus sesiones: nadie sale del sistema) |
| Movimientos de inventario | Días festivos |
| **Clientes y direcciones** | Inventario: existencia inicial 24 con AJUSTE "Carga inicial" auditado |
| Folios (regresan a 1 por sucursal) | |

Opciones:
- `--existencia <n>` — existencia inicial de inventario distinta de 24.
- `--clientes-demo` — recrea a Juan Pérez y Ana Prueba (los asume la suite E2E de
  desarrollo; QA normalmente no lo necesita). ⚠️ Mientras QA y desarrollo compartan
  BD, un reinicio sin este flag deja a la suite E2E sin sus clientes de prueba.

Reglas:
1. Sin `--confirmar` no borra nada: solo imprime la advertencia.
2. Afecta **todas** las sucursales de la BD apuntada por `DIRECT_URL` — jamás
   ejecutarlo con operación real en curso; en producción no tiene lugar salvo en la
   ventana previa al go-live (equivale a la "limpieza de datos de prueba" del punto
   2.3, con la diferencia de que `cargar-menu.ts` además recarga el menú desde el
   Excel mientras que `reiniciar-pruebas.ts` lo conserva tal cual está).
3. Después del reinicio el primer paso operativo es abrir corte de caja, como en un
   arranque real (punto 4.2 del día de go-live).

## Pendientes que bloquean el go-live (estado 2026-07-18)

- [ ] Liberación de QA (probando ya contra la versión local-first).
- [ ] Rotar credenciales del seed y dar de alta usuarios reales.
- [ ] Probar impresora térmica física ("Imprimir prueba").
- [ ] Instalar PostgreSQL 18 (5433) en el servidor de cada sucursal — Infraestructura.
- [ ] Capturar días festivos y datos reales de sucursales.
- [x] ~~Desarrollo local-first fases 0–1~~ (2026-07-18: BD local + auth propia, venta sin internet verificada).
