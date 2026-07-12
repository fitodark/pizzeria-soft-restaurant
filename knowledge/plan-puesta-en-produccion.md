# Plan de puesta en producción

**Fecha**: 2026-07-11 · **Estado del sistema**: blueprint completo, QA probando módulos.

La puesta en producción va en **dos etapas encadenadas**:

- **Etapa A — Producción con Supabase (nube)**: el go-live inicial con la arquitectura actual. Entrega valor de inmediato en cuanto QA libere; requiere internet para operar (BD y Auth en la nube).
- **Etapa B — Producción local-first**: se ejecuta cuando el desarrollo de `plan-local-first.md` (fases 0–3) esté terminado y validado. Cada sucursal ya productiva migra de la nube a su PostgreSQL local en una ventana de ~30 min, y la nube pasa a ser consolidado.

La Etapa A **no es trabajo desechable**: el empaquetado NSSM, la configuración de impresoras, los usuarios, el catálogo y la operación diaria son idénticos en ambas etapas; la Etapa B solo cambia a dónde apunta la base de datos y cómo se hace login.

```
QA libera ──► ETAPA A: go-live con Supabase ──► operación normal
                                                    │
        desarrollo local-first (4–6 días) ──────────┤
                                                    ▼
              ETAPA B: ventana de corte por sucursal ──► operación local-first
```

---

## ETAPA A — Producción con la versión Supabase

### A.0 Prerrequisitos por sucursal

| Recurso | Detalle |
|---|---|
| Servidor de sucursal | PC Windows 10/11 dedicada o semi-dedicada; 8 GB RAM recomendado; disco con ≥ 10 GB libres |
| Software base | Node.js LTS (20+), pnpm, git, NSSM (https://nssm.cc) en PATH |
| Red | IP fija del servidor en la LAN (reserva DHCP o estática) — las cajas/tablets y las impresoras la usan |
| Internet | Estable (limitación conocida de esta etapa; la resuelve la Etapa B) |
| Impresoras térmicas | ESC/POS en red (TCP puerto 9100) o compartidas de Windows; hasta 3 por sucursal: principal (tickets), cocina y bebidas — pueden ser la misma ruta |
| Terminales | Cualquier navegador en la LAN apuntando a `http://IP-del-servidor:3000`; diseño validado a 1366×768, targets táctiles ≥ 44 px |

### A.1 Checklist de endurecimiento (antes del go-live, una sola vez)

1. **Visto bueno de QA** de todos los módulos.
2. **Rotar credenciales del seed** (pendiente conocido):
   - Cambiar contraseña y PIN del admin (`admin@pizzeriabarbosa.mx`) con `pnpm tsx scripts/rotar-credenciales.ts --email <correo> --generar --pin <nuevo>` (o desde `/usuarios`). El seed ya no trae credenciales fijas: exige `SEED_ADMIN_EMAIL/PASSWORD/PIN` en `.env`.
   - Crear los usuarios reales (encargados, meseros, repartidores) con emails reales y PINes propios en `/usuarios`.
   - Inactivar los usuarios demo (`maria@…`, `pedro@…`) — inactivación, no borrado, como todo en el sistema.
3. **Limpieza de datos de prueba** (solo si producción REUTILIZA la BD de desarrollo; con proyecto separado el punto A.1-bis lo vuelve innecesario): las ventas, cortes y movimientos generados por QA y por la suite E2E deben quedar fuera de producción. Opciones:
   - Re-ejecutar `scripts/cargar-menu.ts` en la ventana de go-live (recarga el menú y **borra todo lo operativo**: ventas, cortes, inventario, clientes de prueba). ⚠️ Solo en la ventana, nunca con operación en curso.
   - Conservar clientes reales capturados durante pruebas, si los hubiera, dándolos de alta de nuevo.
4. **Catálogo y configuración de negocio**:
   - Menú real cargado (ya está: 164 productos / 438 variantes / 12 paquetes) — verificación final de precios contra el Excel por parte del negocio.
   - Días festivos del año en Configuración (afectan vigencia de paquetes L–V).
   - Sucursales reales en `/sucursales` (nombre, dirección, teléfono — salen en el ticket).
   - Impresoras reales en `/configuracion` de cada sucursal + **prueba física con el botón "Imprimir prueba"** (pendiente conocido: aún no se ha probado con impresora térmica real; hacerlo ANTES del go-live, valida codificación de acentos y corte de papel).
   - Logo y leyenda de pie de ticket.
5. **`.env` de producción por sucursal** (nunca se commitea):
   - `DATABASE_URL` → pooler Supabase puerto 6543.
   - `DIRECT_URL` → conexión directa 5432 (solo migraciones).
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (esta última jamás sale del servidor).
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (≥ 10 caracteres) y `SEED_ADMIN_PIN` (4 dígitos) — **solo se usan si la BD es nueva** (ver A.1-bis); el seed falla sin ellas. Después del bootstrap pueden quitarse del `.env`: el login valida contra la BD, no contra estas variables.

### A.1-bis Bootstrap de una BD de producción nueva (una sola vez, no por sucursal)

Aplica si producción usa un **proyecto Supabase separado** del de desarrollo (recomendado). Se ejecuta desde una sola máquina con el `.env` de producción:

```powershell
pnpm prisma migrate deploy      # crea el esquema schema_barbosa_v2 completo
pnpm db:seed                    # admin real (con las SEED_ADMIN_*) + catálogo demo
pnpm tsx scripts/cargar-menu.ts # reemplaza el demo por el menú real (164 productos)
```

Después, desde la app con el admin recién creado: alta de sucursales reales, usuarios reales por rol, impresoras y festivos (resto del checklist A.1). Como las credenciales del admin ya nacieron con los valores definitivos del `.env`, **no hace falta rotarlas**; la rotación (`scripts/rotar-credenciales.ts` o `/usuarios`) queda para cuando se reutilice la BD de desarrollo o para rotaciones periódicas futuras.
6. **Seguridad de red**: el puerto 3000 se abre solo en el firewall de Windows para la LAN (perfil privado); **no** se publica a internet ni se hace port-forwarding. El acceso remoto del administrador es vía la BD/panel de Supabase, no vía el POS.
7. **Respaldo en esta etapa**: la BD vive en Supabase (respaldos automáticos según el plan contratado — verificar retención del plan actual). Opcional: `pg_dump --schema=schema_barbosa_v2` semanal a disco local como red de seguridad, con los binarios de PostgreSQL 17.

### A.2 Runbook de instalación por sucursal (~1 h)

```powershell
# 1. Código
git clone https://github.com/fitodark/pizzeria-soft-restaurant.git C:\pos\pizzeria
cd C:\pos\pizzeria
pnpm install --frozen-lockfile

# 2. Credenciales (copiar el .env de producción de la sucursal)

# 3. Build y servicio de Windows (como Administrador)
pnpm build
.\scripts\install-service.ps1        # registra "PizzeriaBarbosa" con NSSM,
                                     # copia estáticos + .env al standalone,
                                     # inicio automático con Windows, logs en \logs
```

Verificación post-instalación:
- `http://localhost:3000` responde y `http://IP:3000` desde una terminal de la LAN.
- Login con usuario real de la sucursal y selección de sucursal correcta.
- "Imprimir prueba" en las 3 impresoras desde `/configuracion`.
- Reinicio de la PC → el servicio levanta solo (`SERVICE_AUTO_START`).

Notas para quien ejecute:
- Los `.ps1` del repo llevan **UTF-8 con BOM** (acentos); no re-guardarlos con otra codificación.
- Si el servicio no arranca: revisar `logs\servicio-error.log`; causa típica es `.env` ausente en `.next\standalone` (el script lo copia; tras un build manual hay que re-copiarlo o re-correr `install-service.ps1`).

### A.3 Día del go-live (por sucursal)

1. Ventana previa (sin operación): limpieza de datos de prueba (A.1-3) y verificación de catálogo.
2. Abrir corte de caja con el fondo real.
3. **Venta piloto completa** de cada tipo: mostrador, mesa con segunda ronda, domicilio con repartidor; cobro en efectivo con Enter y una transferencia; una cancelación con motivo para validar el flujo ante el personal.
4. Verificar comandas en cocina/barra y tickets en la principal.
5. Al cierre del primer día: corte de caja completo y validación de saldos contra efectivo físico.
6. Primer respaldo/verificación en Supabase (las ventas del día visibles desde el panel).

### A.4 Operación y actualizaciones

- **Actualizar la app** (fuera de horario, como Administrador): `.\scripts\update.ps1` — hace `git pull`, dependencias, `prisma migrate deploy`, build y reinicio del servicio. Las migraciones corren contra Supabase una sola vez aunque el script se ejecute en varias sucursales (son idempotentes).
- **Logs**: `logs\servicio.log` y `logs\servicio-error.log` (rotación automática a 10 MB).
- **Incidencias previstas**:
  - *Falla la impresora al vender*: la venta ya está guardada; toast ámbar ofrece "Reimprimir". Revisar red/impresora y reimprimir desde el detalle.
  - *Se cae internet*: el POS no opera (Auth y BD en nube). Contingencia manual (comandas en papel) y capturar al volver. **Este es el riesgo que justifica la Etapa B.**
  - *Falla el servidor de sucursal*: reinstalar con el runbook A.2 en otra PC (~1 h); no hay datos locales que perder en esta etapa.

### A.5 Criterio de salida de la Etapa A

Una semana de operación estable por sucursal: cortes cuadrando contra efectivo físico, impresión confiable y personal operando los flujos sin asistencia. Con eso se libera el arranque del desarrollo local-first (si no arrancó ya en paralelo).

---

## ETAPA B — Producción local-first

**Prerrequisito**: fases 0–3 de `plan-local-first.md` terminadas y probadas en el equipo de desarrollo (criterio de aceptación de la Fase 1: operar una venta completa con el cable de red desconectado). Las decisiones de negocio del final de ese plan deben estar tomadas: **sucursal matriz**, Supabase como consolidado, emails reales, frecuencia de sync.

### B.0 Preparativos por sucursal (antes de la ventana, sin afectar operación)

1. **Infraestructura instala PostgreSQL 17 lado a lado** con el 9.5 existente: puerto **5433**, servicio `postgresql-x64-17`, data dir propio. Las bases 9.5 de otros sistemas no se tocan (lineamientos completos en `plan-local-first.md`).
2. Crear BD `barbosa` con esquema `schema_barbosa_v2` y usuario dedicado.
3. Ensayo de dump/restore con datos reales (con **binarios 17**) para medir tiempo de la ventana.
4. Tener listo el `.env` local-first de la sucursal: `DATABASE_URL`/`DIRECT_URL` → `localhost:5433`, `NUBE_DIRECT_URL` para el job de sync, sin variables `SUPABASE_*`.

### B.1 Ventana de corte por sucursal (~30 min, fuera de horario)

1. Cerrar el corte del día; verificar **cero ventas PENDIENTES** (cobrar o cancelar las que queden).
2. Detener el servicio: `nssm stop PizzeriaBarbosa`.
3. Dump final de Supabase → restore al Postgres local (binarios 17). Verificar conteos por tabla (ventas, detalles, cortes, clientes, productos).
4. Cambiar `.env` (punto B.0-4), `.\scripts\update.ps1` (aplica la versión local-first del código si no estaba, re-copia `.env` al standalone y reinicia).
5. Validación: login **local** (ya sin Supabase Auth), venta de prueba, impresión, corte de prueba, y `pnpm test:e2e` si la ventana lo permite.
6. Instalar el **segundo servicio NSSM** del job de sincronización y verificar la primera sync exitosa contra la nube (indicador en `/configuracion`).
7. Activar la tarea programada de **respaldo local diario** (`pg_dump` con retención 14 días).

**Rollback** (solo antes de la primera venta local): revertir `.env` a Supabase y reiniciar el servicio. Después de la primera venta local ya no se regresa (la nube quedaría atrás); el camino es corregir hacia adelante.

### B.2 Orden de migración de sucursales

1. **Primero la sucursal matriz** (donde se editará catálogo/promociones/usuarios) — valida el flujo completo de bajada de catálogo.
2. Una sucursal por ventana, con 2–3 días de observación entre cada una (sync estable, cortes cuadrando, respaldos generándose).
3. Al terminar: Supabase queda como consolidado de solo-recepción + distribución de catálogo; el candado de edición fuera de la matriz activo.

### B.3 Operación en local-first

- Sin internet la sucursal opera al 100 %; el badge de "sin sincronizar > 2 h" avisa al encargado que está offline.
- Actualizaciones igual que en Etapa A (`update.ps1`), con la diferencia de que `migrate deploy` corre contra el Postgres local de **cada** sucursal (el script ya lo hace por sucursal).
- Failover LTE (Fase 4 del plan local-first) opcional para acortar el rezago del consolidado.

---

## Cronograma sugerido y responsables

| Hito | Depende de | Responsable |
|---|---|---|
| Visto bueno QA de módulos | pruebas en curso | QA |
| Checklist A.1 (credenciales, impresora física, festivos, .env) | — | Desarrollo + negocio |
| Go-live Etapa A (por sucursal) | A.1 completo | Desarrollo + encargado de sucursal |
| Desarrollo local-first (fases 0–3, 4–6 días) | puede ir en paralelo a la operación A | Desarrollo |
| PG 17 instalado en cada sucursal (puerto 5433) | — | Infraestructura |
| Decisiones de negocio (matriz, emails, sync) | — | Negocio |
| Ventanas Etapa B (una por sucursal) | todo lo anterior | Desarrollo + infraestructura |

## Pendientes que bloquean el go-live A (estado actual)

- [ ] Liberación de QA.
- [ ] Rotar credenciales del seed y dar de alta usuarios reales.
- [ ] Probar impresora térmica física ("Imprimir prueba").
- [ ] `.env` de producción por sucursal (¿mismo proyecto Supabase que dev, o proyecto/esquema aparte? — recomendado: **proyecto Supabase separado para producción**, o al menos ejecutar la limpieza A.1-3 y rotar todas las llaves).
- [ ] Capturar días festivos y datos reales de sucursales.
